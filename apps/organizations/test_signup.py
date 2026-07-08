"""
Тесты self-service регистрации: подача заявки → письмо → подтверждение
→ создание Organization/Property/User с триалом.
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient

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
