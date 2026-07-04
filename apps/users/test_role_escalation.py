"""
Регрессия: manager не должен уметь эскалировать роль (себе или чужую) до
owner/superadmin через PATCH /users/<id>/ или создание нового пользователя
через POST /users/. Менять/назначать owner-уровневые роли может только
owner/superadmin.
"""
import pytest
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def manager_user(org):
    return User.objects.create_user(
        username='mgr', password='pass12345', role='manager', organization=org,
    )


@pytest.fixture
def owner_user(org):
    return User.objects.create_user(
        username='own', password='pass12345', role='owner', organization=org,
    )


@pytest.fixture
def manager_client(manager_user):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    return client


@pytest.fixture
def owner_client(owner_user):
    client = APIClient()
    client.force_authenticate(user=owner_user)
    return client


@pytest.mark.django_db
def test_manager_cannot_promote_self_to_owner(manager_client, manager_user):
    r = manager_client.patch(f'/api/v1/users/{manager_user.id}/', {'role': 'owner'}, format='json')
    assert r.status_code == 400
    manager_user.refresh_from_db()
    assert manager_user.role == 'manager'


@pytest.mark.django_db
def test_manager_cannot_create_owner_account(manager_client, org):
    payload = {
        'username': 'newowner', 'password': 'strongpass12345',
        'first_name': 'A', 'last_name': 'B', 'role': 'owner',
    }
    r = manager_client.post('/api/v1/users/', payload, format='json')
    assert r.status_code == 400
    assert not User.objects.filter(username='newowner').exists()


@pytest.mark.django_db
def test_manager_can_create_reception_account(manager_client, org):
    payload = {
        'username': 'newreception', 'password': 'strongpass12345',
        'first_name': 'A', 'last_name': 'B', 'role': 'reception',
    }
    r = manager_client.post('/api/v1/users/', payload, format='json')
    assert r.status_code == 201, r.data
    assert User.objects.get(username='newreception').role == 'reception'


@pytest.mark.django_db
def test_owner_can_change_role(owner_client, manager_user):
    r = owner_client.patch(f'/api/v1/users/{manager_user.id}/', {'role': 'reception'}, format='json')
    assert r.status_code == 200, r.data
    manager_user.refresh_from_db()
    assert manager_user.role == 'reception'
