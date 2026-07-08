"""
После истечения trial_ends_at организация переходит в read-only:
GET разрешён, create/update/delete брони — запрещены (403).
"""
import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from apps.organizations.models import Organization
from apps.properties.models import Property, Room, Unit
from apps.users.models import User
from apps.guests.models import Guest

STAYS_URL = '/api/v1/stays/'


@pytest.fixture
def expired_org(db):
    return Organization.objects.create(
        name='Истёкший Триал', slug='expired-trial', plan='free',
        trial_ends_at=timezone.now() - timedelta(days=1),
    )


@pytest.fixture
def active_org(db):
    return Organization.objects.create(
        name='Активный Триал', slug='active-trial', plan='free',
        trial_ends_at=timezone.now() + timedelta(days=10),
    )


def _owner_api(org):
    user = User.objects.create_user(username=f'owner_{org.id}', password='pass12345', role='owner', organization=org)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _payload(unit, guest, ci='2026-08-01', co='2026-08-02'):
    return {
        'unit': unit.id, 'guest': guest.id,
        'check_in_date': ci, 'expected_check_out_date': co,
        'rate_type': 'daily', 'rate_amount': '5000', 'status': 'reserved',
    }


@pytest.mark.django_db
def test_expired_trial_blocks_stay_creation(expired_org):
    prop = Property.objects.create(organization=expired_org, name='X', city='Алматы', address='', booking_mode='hostel')
    room = Room.objects.create(organization=expired_org, property=prop, name='R', room_type='private', floor=1, max_capacity=1)
    unit = Unit.objects.create(organization=expired_org, room=room, name='U', unit_type='private_room', status='available')
    guest = Guest.objects.create(organization=expired_org, first_name='Иван', last_name='Иванов', phone='+77001234567')
    client = _owner_api(expired_org)

    response = client.post(STAYS_URL, _payload(unit, guest), format='json')

    assert response.status_code == 403

    get_response = client.get(STAYS_URL)
    assert get_response.status_code == 200


@pytest.mark.django_db
def test_active_trial_allows_stay_creation(active_org):
    prop = Property.objects.create(organization=active_org, name='X', city='Алматы', address='', booking_mode='hostel')
    room = Room.objects.create(organization=active_org, property=prop, name='R', room_type='private', floor=1, max_capacity=1)
    unit = Unit.objects.create(organization=active_org, room=room, name='U', unit_type='private_room', status='available')
    guest = Guest.objects.create(organization=active_org, first_name='Иван', last_name='Иванов', phone='+77001234567')
    client = _owner_api(active_org)

    response = client.post(STAYS_URL, _payload(unit, guest), format='json')

    assert response.status_code in (200, 201)
