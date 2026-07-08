"""
Тесты self-service регистрации: подача заявки → письмо → подтверждение
→ создание Organization/Property/User с триалом.
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.organizations.models import SignupRequest

SIGNUP_URL = '/api/v1/organizations/signup/'


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
