"""
Регрессия: логин (/api/v1/auth/login/) должен быть ограничен по IP,
чтобы подбор пароля брутфорсом был невозможен.
"""
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.users.jwt_auth import LoginThrottle
from apps.users.models import User

LOGIN_URL = '/api/v1/auth/login/'


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestLoginThrottle:
    def test_blocks_after_rate_limit_exceeded(self, org, monkeypatch):
        User.objects.create_user(
            username='brute_target', password='correct-password12345',
            role='manager', organization=org,
        )
        # DRF кэширует THROTTLE_RATES в api_settings при импорте — переопределяем
        # get_rate() прямо на классе throttle, чтобы тест не зависел от продовской ставки.
        monkeypatch.setattr(LoginThrottle, 'get_rate', lambda self: '3/hour')
        client = APIClient()
        payload = {'username': 'brute_target', 'password': 'wrong-password'}

        responses = [client.post(LOGIN_URL, payload, format='json').status_code for _ in range(3)]
        assert all(code == 401 for code in responses)

        blocked = client.post(LOGIN_URL, payload, format='json')
        assert blocked.status_code == 429

    def test_allows_login_within_rate_limit(self, org):
        User.objects.create_user(
            username='normal_user', password='correct-password12345',
            role='manager', organization=org,
        )
        client = APIClient()
        response = client.post(
            LOGIN_URL,
            {'username': 'normal_user', 'password': 'correct-password12345'},
            format='json',
        )
        assert response.status_code == 200
        assert 'access' in response.data
