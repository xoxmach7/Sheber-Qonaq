"""
Регрессия: unread_count в ответе списка уведомлений должен считаться
по тому же набору типов, что и сам список — иначе бейдж в TopBar
показывает число, для которого список пустой (expiring/overdue скрыты
из выдачи, но раньше учитывались в счётчике).
"""
import pytest
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.users.models import User

NOTIFICATIONS_URL = '/api/v1/notifications/'


@pytest.fixture
def api_client(org):
    user = User.objects.create_user(
        username='notif_user', password='pass12345',
        role='manager', organization=org,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestUnreadCount:
    def test_hidden_types_excluded_from_both_list_and_count(self, org, api_client):
        Notification.objects.create(
            organization=org, type='expiring', title='Заезд истекает', body='...',
        )
        Notification.objects.create(
            organization=org, type='overdue', title='Просрочен выезд', body='...',
        )
        Notification.objects.create(
            organization=org, type='debt', title='Долг гостя', body='...',
        )

        response = api_client.get(NOTIFICATIONS_URL)

        assert response.status_code == 200
        assert response.data['unread_count'] == 1
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['type'] == 'debt'

    def test_badge_matches_visible_list_length_when_all_unread(self, org, api_client):
        Notification.objects.create(organization=org, type='expiring', title='A', body='...')
        Notification.objects.create(organization=org, type='info', title='B', body='...')

        response = api_client.get(NOTIFICATIONS_URL)

        assert response.data['unread_count'] == len(response.data['results'])
