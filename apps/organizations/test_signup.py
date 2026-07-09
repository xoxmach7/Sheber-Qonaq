"""
Тесты self-service регистрации: подача заявки → письмо → подтверждение
→ создание Organization/Property/User с триалом.
"""
import pytest
from unittest.mock import patch
from django.core.cache import cache
from rest_framework.test import APIClient
from apps.organizations.models import SignupRequest

SIGNUP_URL = '/api/v1/organizations/signup/'


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _payload(**over):
    base = {
        'email': 'owner@example.com',
        'password': 'pass12345',
        'org_name': 'Мой Хостел',
        'city': 'Алматы',
        'booking_mode': 'hostel',
    }
    base.update(over)
    return base


@pytest.mark.django_db
class TestSignupRequest:
    def test_creates_signup_request_and_sends_email(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True) as mock_send:
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 201
        mock_send.assert_called_once()
        from apps.organizations.models import SignupRequest
        assert SignupRequest.objects.filter(email='owner@example.com').exists()

    def test_rejects_duplicate_email(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True):
            client.post(SIGNUP_URL, _payload(), format='json')
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 400
        assert 'email' in response.data

    def test_rejects_short_password(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, _payload(password='short'), format='json')
        assert response.status_code == 400

    def test_email_send_failure_keeps_signup_request_and_returns_202(self):
        # Regression: раньше заявка создавалась независимо от результата отправки,
        # но пользователь не мог узнать об этом и не мог попробовать снова —
        # unique=True на email блокировал повторный сабмит навечно.
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=False):
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 202
        assert SignupRequest.objects.filter(email='owner@example.com').exists()

    def test_expired_pending_request_is_reused_not_blocked(self):
        # Regression: раньше повторный сабмит на email с истёкшей (24ч+) неподтверждённой
        # заявкой падал с IntegrityError на unique constraint — теперь запись переиспользуется.
        client = APIClient()
        from datetime import timedelta
        from django.utils import timezone

        with patch('apps.organizations.signup.send_confirmation_email', return_value=True):
            first = client.post(SIGNUP_URL, _payload(org_name='Старое Название'), format='json')
        assert first.status_code == 201

        old_request = SignupRequest.objects.get(email='owner@example.com')
        old_token = old_request.token
        old_request.created_at = timezone.now() - timedelta(hours=25)
        old_request.save(update_fields=['created_at'])

        with patch('apps.organizations.signup.send_confirmation_email', return_value=True) as mock_send:
            second = client.post(SIGNUP_URL, _payload(org_name='Новое Название'), format='json')

        assert second.status_code == 201
        mock_send.assert_called_once()
        assert SignupRequest.objects.filter(email='owner@example.com').count() == 1
        updated = SignupRequest.objects.get(email='owner@example.com')
        assert updated.org_name == 'Новое Название'
        assert updated.token != old_token

    def test_active_pending_request_still_blocks_duplicate(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True):
            client.post(SIGNUP_URL, _payload(), format='json')
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 400
        assert 'email' in response.data


RESEND_URL = '/api/v1/organizations/signup/resend/'


@pytest.mark.django_db
class TestSignupResend:
    def test_resends_email_for_pending_request(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True):
            client.post(SIGNUP_URL, _payload(), format='json')

        old_token = SignupRequest.objects.get(email='owner@example.com').token

        with patch('apps.organizations.signup.send_confirmation_email', return_value=True) as mock_send:
            response = client.post(RESEND_URL, {'email': 'owner@example.com'}, format='json')

        assert response.status_code == 200
        mock_send.assert_called_once()
        new_token = SignupRequest.objects.get(email='owner@example.com').token
        assert new_token != old_token

    def test_resend_for_unknown_email_returns_generic_200(self):
        # Не раскрываем, существует ли email в системе (защита от enumeration).
        client = APIClient()
        response = client.post(RESEND_URL, {'email': 'nobody@example.com'}, format='json')
        assert response.status_code == 200

    def test_resend_requires_email(self):
        client = APIClient()
        response = client.post(RESEND_URL, {}, format='json')
        assert response.status_code == 400


import uuid
from datetime import timedelta
from django.utils import timezone

CONFIRM_URL = '/api/v1/organizations/signup/confirm/{token}/'


@pytest.mark.django_db
class TestSignupConfirm:
    def _create_signup_request(self, **over):
        from django.contrib.auth.hashers import make_password
        defaults = {
            'email': 'owner@example.com',
            'org_name': 'Мой Хостел',
            'city': 'Алматы',
            'booking_mode': 'hostel',
            'password_hash': make_password('pass12345'),
        }
        defaults.update(over)
        return SignupRequest.objects.create(**defaults)

    def test_confirms_and_creates_organization(self):
        signup_request = self._create_signup_request()
        client = APIClient()

        response = client.post(CONFIRM_URL.format(token=signup_request.token))

        assert response.status_code == 201
        assert 'access' in response.data
        assert 'refresh' in response.data

        from apps.organizations.models import Organization
        from apps.users.models import User
        org = Organization.objects.get(name='Мой Хостел')
        assert org.trial_ends_at is not None
        assert org.trial_ends_at > timezone.now() + timedelta(days=29)

        user = User.objects.get(email='owner@example.com')
        assert user.organization_id == org.id
        assert user.role == 'owner'

        signup_request.refresh_from_db()
        assert signup_request.confirmed_at is not None

    def test_rejects_unknown_token(self):
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=uuid.uuid4()))
        assert response.status_code == 404

    def test_rejects_already_confirmed(self):
        signup_request = self._create_signup_request(confirmed_at=timezone.now())
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=signup_request.token))
        assert response.status_code == 400

    def test_rejects_expired_request(self):
        signup_request = self._create_signup_request()
        signup_request.created_at = timezone.now() - timedelta(hours=25)
        signup_request.save(update_fields=['created_at'])
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=signup_request.token))
        assert response.status_code == 400
