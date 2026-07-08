"""
Лимит 20 юнитов на организацию (защита self-service free-триала от злоупотреблений).
"""
import pytest
from rest_framework.test import APIClient
from apps.organizations.models import Organization
from apps.properties.models import Property, Room
from apps.users.models import User

UNITS_URL = '/api/v1/units/'


@pytest.fixture
def org(db):
    return Organization.objects.create(name='Тест Хостел', slug='test-hostel', plan='free')


@pytest.fixture
def prop(org):
    return Property.objects.create(organization=org, name='Тест', city='Алматы', address='', booking_mode='hostel')


@pytest.fixture
def owner(org):
    return User.objects.create_user(username='owner1', password='pass12345', role='owner', organization=org)


@pytest.fixture
def owner_api(owner):
    client = APIClient()
    client.force_authenticate(user=owner)
    return client


@pytest.mark.django_db
def test_rejects_21st_unit(owner_api, org, prop):
    room = Room.objects.create(organization=org, property=prop, name='Комната', room_type='private', floor=1, max_capacity=1)
    from apps.properties.models import Unit
    for i in range(20):
        Unit.objects.create(organization=org, room=room, name=f'Юнит {i}', unit_type='private_room', status='available')

    response = owner_api.post(UNITS_URL, {'room': room.id, 'name': 'Юнит 21', 'unit_type': 'private_room'}, format='json')

    assert response.status_code == 400
    assert 'юнит' in str(response.data).lower() or 'unit' in str(response.data).lower()
