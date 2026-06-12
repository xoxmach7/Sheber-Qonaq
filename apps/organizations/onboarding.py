from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers, status

from apps.organizations.models import Organization
from apps.properties.models import Property, Room, Unit

User = get_user_model()


# ── Serializers ──────────────────────────────────────────────────────────────

class RoomInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)


class OnboardingSerializer(serializers.Serializer):
    # Организация + объект
    org_name    = serializers.CharField(max_length=255, help_text='Название организации / объекта')
    city        = serializers.CharField(max_length=100, default='Алматы')
    address     = serializers.CharField(max_length=255, default='', allow_blank=True)
    plan        = serializers.ChoiceField(
        choices=['free', 'basic', 'pro'], default='free'
    )
    booking_mode = serializers.ChoiceField(
        choices=['hostel', 'cottage'], default='hostel',
        help_text='hostel — обычный, cottage — посменная аренда'
    )

    # Комнаты
    rooms = RoomInputSerializer(many=True, min_length=1)

    # Аккаунт менеджера
    manager_first_name = serializers.CharField(max_length=150)
    manager_last_name  = serializers.CharField(max_length=150, default='', allow_blank=True)
    manager_username   = serializers.CharField(max_length=150)
    manager_password   = serializers.CharField(max_length=128, write_only=True)
    manager_phone      = serializers.CharField(max_length=20, default='', allow_blank=True)

    def validate_manager_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Логин уже занят.')
        return value

    def validate_org_name(self, value):
        slug = value.lower().replace(' ', '-')[:100]
        # Ensure unique slug
        base, counter = slug, 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f'{base}-{counter}'
            counter += 1
        self._slug = slug
        return value


class OnboardingResultSerializer(serializers.Serializer):
    organization_id = serializers.IntegerField()
    property_id     = serializers.IntegerField()
    unit_count      = serializers.IntegerField()
    manager_username = serializers.CharField()
    manager_id      = serializers.IntegerField()


# ── View ─────────────────────────────────────────────────────────────────────

class OnboardingView(APIView):
    """
    POST /api/v1/onboarding/
    Создаёт Organization + Property + Rooms/Units + Manager одним запросом.
    Только SuperAdmin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Только superadmin
        if request.user.role != 'superadmin':
            return Response(
                {'detail': 'Только SuperAdmin может создавать клиентов.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = OnboardingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        slug = ser._slug

        with transaction.atomic():
            # 1. Организация
            org = Organization.objects.create(
                name=data['org_name'],
                slug=slug,
                plan=data['plan'],
            )

            # 2. Property
            prop = Property.objects.create(
                organization=org,
                name=data['org_name'],
                city=data['city'],
                address=data['address'],
                booking_mode=data['booking_mode'],
            )

            # 3. Rooms + Units
            unit_count = 0
            for room_data in data['rooms']:
                room = Room.objects.create(
                    organization=org,
                    property=prop,
                    name=room_data['name'],
                    room_type='private',
                    floor=1,
                    max_capacity=1,
                )
                Unit.objects.create(
                    organization=org,
                    room=room,
                    name=room_data['name'],
                    unit_type='private_room',
                    status='available',
                )
                unit_count += 1

            # 4. Manager user
            manager = User.objects.create_user(
                username=data['manager_username'],
                password=data['manager_password'],
                first_name=data['manager_first_name'],
                last_name=data['manager_last_name'],
                phone=data['manager_phone'],
                role='manager',
                organization=org,
            )

        return Response({
            '