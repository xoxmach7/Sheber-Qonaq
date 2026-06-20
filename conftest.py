"""
Общие фикстуры для тестов.
"""
from decimal import Decimal
from datetime import date

import pytest


@pytest.fixture
def org(db):
    from apps.organizations.models import Organization
    return Organization.objects.create(name='Test Hostel', slug='test-hostel')


@pytest.fixture
def hostel_property(org):
    from apps.properties.models import Property
    return Property.objects.create(
        organization=org, name='Test Hostel', address='ул. Тестовая 1',
        city='Алматы', booking_mode='hostel',
    )


@pytest.fixture
def cottage_property(org):
    from apps.properties.models import Property
    return Property.objects.create(
        organization=org, name='Test Baня', address='ул. Тестовая 2',
        city='Алматы', booking_mode='cottage',
    )


@pytest.fixture
def hostel_unit(org, hostel_property):
    from apps.properties.models import Room, Unit
    room = Room.objects.create(
        organization=org, property=hostel_property, name='Комната 1',
        room_type='private', floor=1, max_capacity=1,
    )
    return Unit.objects.create(
        organization=org, room=room, name='Кровать 1',
        unit_type='bed', status='available',
    )


@pytest.fixture
def cottage_unit(org, cottage_property):
    from apps.properties.models import Room, Unit
    room = Room.objects.create(
        organization=org, property=cottage_property, name='Домик',
        room_type='private', floor=1, max_capacity=4,
    )
    return Unit.objects.create(
        organization=org, room=room, name='Домик 1',
        unit_type='apartment', status='available',
    )


@pytest.fixture
def guest(org):
    from apps.guests.models import Guest
    return Guest.objects.create(
        organization=org, first_name='Иван', last_name='Петров',
        phone='+7 701 234-56-78',
    )


@pytest.fixture
def manager(org):
    from apps.users.models import User
    return User.objects.create_user(
        username='manager', password='pass12345',
        role='manager', organization=org,
    )


@pytest.fixture
def api(manager):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=manager)
    return client
