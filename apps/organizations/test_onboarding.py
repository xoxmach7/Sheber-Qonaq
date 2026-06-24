"""
Тесты онбординга: создание организации + объекта + комнат/юнитов одним запросом.
Дорм -> N юнитов bed; private -> 1 private_room; family -> 1 family_room; cottage -> 1 юнит на домик.
"""
import pytest
from rest_framework.test import APIClient

URL = '/api/v1/organizations/onboarding/'


@pytest.fixture
def superadmin(db):
    from apps.users.models import User
    return User.objects.create_user(
        username='super', password='pass12345', role='superadmin',
    )


@pytest.fixture
def sa_api(superadmin):
    client = APIClient()
    client.force_authenticate(user=superadmin)
    return client


def _payload(**over):
    base = {
        'org_name': 'Новый Хостел', 'city': 'Алматы', 'booking_mode': 'hostel',
        'rooms': [
            {'name': 'Дорм 1', 'type': 'dorm', 'beds': 6},
            {'name': 'Комната 2', 'type': 'private'},
            {'name': 'Семейный', 'type': 'family'},
        ],
        'manager_first_name': 'Аман', 'manager_username': 'mgr_new',
        'manager_password': 'pass12345',
    }
    base.update(over)
    return base


@pytest.mark.django_db
def test_hostel_dorm_creates_n_beds(sa_api):
    from apps.properties.models import Unit
    r = sa_api.post(URL, _payload(), format='json')
    assert r.status_code == 201, r.content
    assert r.data['unit_count'] == 8  # 6 коек + 1 private + 1 family
    org_id = r.data['organization_id']
    units = Unit.objects.filter(organization_id=org_id)
    assert units.filter(unit_type='bed').count() == 6
    assert units.filter(unit_type='private_room').count() == 1
    assert units.filter(unit_type='family_room').count() == 1


@pytest.mark.django_db
def test_dorm_room_type_and_capacity(sa_api):
    from apps.properties.models import Room
    r = sa_api.post(URL, _payload(manager_username='mgr_cap'), format='json')
    assert r.status_code == 201, r.content
    dorm = Room.objects.get(organization_id=r.data['organization_id'], name='Дорм 1')
    assert dorm.room_type == 'dorm'
    assert dorm.max_capacity == 6


@pytest.mark.django_db
def test_cottage_one_unit_per_house(sa_api):
    from apps.properties.models import Unit
    payload = _payload(
        org_name='Баня у реки', booking_mode='cottage', manager_username='mgr_cot',
        rooms=[{'name': 'Домик 1'}, {'name': 'Домик 2'}],
    )
    r = sa_api.post(URL, payload, format='json')
    assert r.status_code == 201, r.content
    assert r.data['unit_count'] == 2
    assert Unit.objects.filter(organization_id=r.data['organization_id']).count() == 2


@pytest.mark.django_db
def test_default_room_type_is_single_unit(sa_api):
    """Без указания type комната = 1 private_room (бэк-совместимость)."""
    from apps.properties.models import Unit
    payload = _payload(manager_username='mgr_def', rooms=[{'name': 'Комната 1'}])
    r = sa_api.post(URL, payload, format='json')
    assert r.status_code == 201, r.content
    assert r.data['unit_count'] == 1
    assert Unit.objects.filter(
        organization_id=r.data['organization_id'], unit_type='private_room'
    ).count() == 1


@pytest.mark.django_db
def test_onboarding_requires_superadmin(api):
    """Обычный менеджер не может создавать клиентов."""
    r = api.post(URL, _payload(manager_username='nope'), format='json')
    assert r.status_code == 403
