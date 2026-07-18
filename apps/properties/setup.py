"""
Первичная настройка комнат/юнитов для уже существующей организации —
self-service онбординг после регистрации через apps.organizations.signup.
(Отдельно от apps.organizations.onboarding.OnboardingView — тот создаёт
Organization+Property+Manager с нуля и доступен только superadmin;
здесь организация и объект уже есть, нужно только заполнить комнаты.)
"""
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers, status

from apps.core.permissions import IsOwnerOrManager
from apps.properties.models import Property, Room, Unit


class RoomInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    # dorm — дорм с койками, private — отдельная комната, family — семейный номер.
    # В режиме cottage тип/койки не применяются — каждая запись = 1 домик-юнит.
    type = serializers.ChoiceField(choices=['dorm', 'private', 'family'], default='private')
    beds = serializers.IntegerField(min_value=1, max_value=50, default=1, required=False)


class RoomsSetupSerializer(serializers.Serializer):
    rooms = RoomInputSerializer(many=True, min_length=1)


class RoomsSetupView(APIView):
    """
    POST /api/v1/properties/setup-rooms/
    Body: {"rooms": [{"name": "...", "type": "dorm|private|family", "beds": N}, ...]}
    Создаёт Room+Unit для первого активного Property организации текущего
    пользователя. Доступно owner/manager (не только superadmin) — это шаг
    self-service онбординга сразу после регистрации, когда Property уже
    есть (создан в SignupConfirmView), но комнат ещё 0.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def post(self, request):
        org = request.user.organization
        prop = Property.objects.filter(organization=org, is_active=True).first()
        if not prop:
            return Response(
                {'detail': 'Объект размещения не найден.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = RoomsSetupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        is_cottage = prop.booking_mode == 'cottage'
        unit_count = 0

        with transaction.atomic():
            for room_data in data['rooms']:
                name = room_data['name']

                if is_cottage:
                    room = Room.objects.create(
                        organization=org, property=prop, name=name,
                        room_type='private', floor=1, max_capacity=1,
                    )
                    Unit.objects.create(
                        organization=org, room=room, name=name,
                        unit_type='private_room', status='available',
                    )
                    unit_count += 1
                    continue

                rtype = room_data.get('type', 'private')
                beds = room_data.get('beds') or 1

                if rtype == 'dorm':
                    room = Room.objects.create(
                        organization=org, property=prop, name=name,
                        room_type='dorm', floor=1, max_capacity=beds,
                    )
                    for i in range(beds):
                        Unit.objects.create(
                            organization=org, room=room,
                            name=f'Место {i + 1}',
                            unit_type='bed', status='available',
                            sort_order=i + 1,
                        )
                        unit_count += 1
                else:
                    # "Спальные места" (rtype='private') теперь тоже может содержать
                    # несколько мест (не только дормы с двухъярусными кроватями) —
                    # beds > 1 создаёт несколько юнитов в одной комнате, как у dorm.
                    # 'family' сохранён для обратной совместимости со старыми
                    # заявками/данными, хотя в UI кнопка убрана — всегда 1 юнит.
                    places = beds if rtype != 'family' else 1
                    room = Room.objects.create(
                        organization=org, property=prop, name=name,
                        room_type='private', floor=1, max_capacity=places,
                    )
                    unit_type = 'family_room' if rtype == 'family' else 'private_room'
                    if places <= 1:
                        Unit.objects.create(
                            organization=org, room=room, name=name,
                            unit_type=unit_type, status='available',
                        )
                        unit_count += 1
                    else:
                        for i in range(places):
                            Unit.objects.create(
                                organization=org, room=room,
                                name=f'Место {i + 1}',
                                unit_type=unit_type, status='available',
                                sort_order=i + 1,
                            )
                            unit_count += 1

        return Response({
            'property_id': prop.id,
            'unit_count': unit_count,
        }, status=status.HTTP_201_CREATED)
