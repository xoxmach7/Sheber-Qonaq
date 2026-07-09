"""
Регрессия: вход должен работать и по username, и по email (регистронезависимо).
Self-service регистрация создаёт username из части email до "@" — пользователи
привыкли вводить именно email при входе, раньше это давало "неверный логин
или пароль" даже с правильным паролем.
"""
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.users.models import User

LOGIN_URL = '/api/v1/auth/login/'


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestLoginByEmail:
    def test_login_with_email_instead_of_username(self, org):
        User.objects.create_user(
            username='vip.krikbaev', email='vip.krikbaev@mail.ru',
            password='correct-password12345', role='owner', organization=org,
        )
        client = APIClient()
        response = client.post(
            LOGIN_URL,
            {'username': 'vip.krikbaev@mail.ru', 'password': 'correct-password12345'},
            format='json',
        )
        assert response.status_code == 200
        assert 'access' in response.data

    def test_login_with_email_case_insensitive(self, org):
        User.objects.create_user(
            username='vip.krikbaev', email='vip.krikbaev@mail.ru',
            password='correct-password12345', role='owner', organization=org,
        )
        client = APIClient()
        response = client.post(
            LOGIN_URL,
            {'username': 'VIP.Krikbaev@Mail.Ru', 'password': 'correct-password12345'},
            format='json',
        )
        assert response.status_code == 200

    def test_login_with_username_still_works(self, org):
        User.objects.create_user(
            username='vip.krikbaev', email='vip.krikbaev@mail.ru',
            password='correct-password12345', role='owner', organization=org,
        )
        client = APIClient()
        response = client.post(
            LOGIN_URL,
            {'username': 'vip.krikbaev', 'password': 'correct-password12345'},
            format='json',
        )
        assert response.status_code == 200

    def test_wrong_password_still_rejected(self, org):
        User.objects.create_user(
            username='vip.krikbaev', email='vip.krikbaev@mail.ru',
            password='correct-password12345', role='owner', organization=org,
        )
        client = APIClient()
        response = client.post(
            LOGIN_URL,
            {'username': 'vip.krikbaev@mail.ru', 'password': 'wrong-password'},
            format='json',
        )
        assert response.status_code == 401
