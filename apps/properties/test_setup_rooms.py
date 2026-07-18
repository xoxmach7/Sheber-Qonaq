"""
Первичная настройка комнат для уже существующей организации (self-service
онбординг) — POST /api/v1/setup-rooms/. Регрессия на реальный кейс: после
self-service регистрации (SignupConfirmView) Property создаётся без единой
комнаты, и у клиента не было способа добавить их через приложение.
"""
import pytest

from apps.properties.models import Room, Unit

SETUP_URL = '/api/v1/setup-rooms/'


@pytest.mark.django_db
class TestRoomsSetup:
    def test_creates_private_room(self, api, hostel_property):
        response = api.post(SETUP_URL, {
            'rooms': [{'name': 'Комната 1', 'type': 'private'}],
        }, format='json')

        assert response.status_code == 201, response.data
        assert response.data['unit_count'] == 1
        assert Room.objects.filter(property=hostel_property, name='Комната 1').exists()
        assert Unit.objects.filter(room__property=hostel_property, unit_type='private_room').count() == 1

    def test_creates_private_room_with_multiple_places(self, api, hostel_property):
        # "Спальные места" (rtype='private') с beds > 1 — как дорм, но без
        # двухъярусных коек: несколько юнитов private_room в одной комнате.
        response = api.post(SETUP_URL, {
            'rooms': [{'name': 'Общий номер 1', 'type': 'private', 'beds': 3}],
        }, format='json')

        assert response.status_code == 201, response.data
        assert response.data['unit_count'] == 3
        room = Room.objects.get(property=hostel_property, name='Общий номер 1')
        assert room.units.count() == 3
        assert all(u.unit_type == 'private_room' for u in room.units.all())

    def test_creates_dorm_with_multiple_beds(self, api, hostel_property):
        response = api.post(SETUP_URL, {
            'rooms': [{'name': 'Дорм 1', 'type': 'dorm', 'beds': 6}],
        }, format='json')

        assert response.status_code == 201, response.data
        assert response.data['unit_count'] == 6
        room = Room.objects.get(property=hostel_property, name='Дорм 1')
        assert room.units.count() == 6
        assert all(u.unit_type == 'bed' for u in room.units.all())

    def test_creates_multiple_rooms_at_once(self, api, hostel_property):
        response = api.post(SETUP_URL, {
            'rooms': [
                {'name': 'Дорм 1', 'type': 'dorm', 'beds': 4},
                {'name': 'Люкс 1', 'type': 'private'},
                {'name': 'Семейный 1', 'type': 'family'},
            ],
        }, format='json')

        assert response.status_code == 201
        assert response.data['unit_count'] == 6
        assert Room.objects.filter(property=hostel_property).count() == 3

    def test_cottage_property_ignores_type_and_beds(self, api, cottage_property):
        response = api.post(SETUP_URL, {
            'rooms': [{'name': 'Домик 1', 'type': 'dorm', 'beds': 10}],
        }, format='json')

        assert response.status_code == 201
        assert response.data['unit_count'] == 1
        unit = Unit.objects.get(room__property=cottage_property)
        assert unit.unit_type == 'private_room'

    def test_requires_at_least_one_room(self, api, hostel_property):
        response = api.post(SETUP_URL, {'rooms': []}, format='json')
        assert response.status_code == 400

    def test_fails_without_property(self, api, org):
        # У организации вообще нет Property (не должно случаться в реальном
        # флоу, но защита от 500 на пустой организации).
        response = api.post(SETUP_URL, {
            'rooms': [{'name': 'Комната 1', 'type': 'private'}],
        }, format='json')
        assert response.status_code == 400

    def test_reception_role_forbidden(self, org, hostel_property):
        from rest_framework.test import APIClient
        from apps.users.models import User
        reception = User.objects.create_user(
            username='reception1', password='pass12345',
            role='reception', organization=org,
        )
        client = APIClient()
        client.force_authenticate(user=reception)

        response = client.post(SETUP_URL, {
            'rooms': [{'name': 'Комната 1', 'type': 'private'}],
        }, format='json')
        assert response.status_code == 403
