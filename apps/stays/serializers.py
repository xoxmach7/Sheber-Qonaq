from datetime import timedelta
from rest_framework import serializers
from django.db import models, transaction
from django.utils import timezone
from .models import Stay
from apps.guests.serializers import GuestShortSerializer
from apps.properties.serializers import UnitSerializer
from apps.properties.models import Unit


class StaySerializer(serializers.ModelSerializer):
    guest_detail = GuestShortSerializer(source='guest', read_only=True)
    unit_detail = UnitSerializer(source='unit', read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_expected = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    has_debt = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rate_type_display = serializers.CharField(source='get_rate_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    mpis_status_display = serializers.CharField(source='get_mpis_status_display', read_only=True)

    shift_type_display = serializers.CharField(source='get_shift_type_display', read_only=True)

    class Meta:
        model = Stay
        fields = [
            'id', 'unit', 'unit_detail', 'guest', 'guest_detail',
            'check_in_date', 'expected_check_out_date', 'actual_check_out_date',
            'rate_type', 'rate_type_display', 'rate_amount',
            'deposit_amount', 'status', 'status_display',
            'source', 'source_display', 'notes',
            'mpis_status', 'mpis_status_display',
            'shift_type', 'shift_type_display',
            'total_paid', 'total_expected', 'balance', 'has_debt',
            'created_at',
        ]
        read_only_fields = ['id', 'actual_check_out_date', 'created_at']

    def _get_booking_mode(self, unit):
        """Возвращает booking_mode объекта размещения для данного unit."""
        try:
            return unit.room.property.booking_mode
        except Exception:
            return 'hostel'

    def validate(self, data):
        unit = data.get('unit')
        check_in = data.get('check_in_date')
        check_out = data.get('expected_check_out_date')
        shift_type = data.get('shift_type')

        # Cottage-режим: дневная смена (13–19) допускает check_out == check_in
        if check_in and check_out:
            if shift_type:
                # посменная аренда — check_out >= check_in
                if check_out < check_in:
                    raise serializers.ValidationError(
                        'Дата выселения не может быть раньше даты заселения.'
                    )
            else:
                # обычный режим — check_out > check_in
                if check_out <= check_in:
                    raise serializers.ValidationError(
                        'Дата выселения должна быть позже даты заселения.'
                    )

        if self.instance is None and unit and check_in:
            mode = self._get_booking_mode(unit)

            if mode == 'hostel':
                # Hostel: только один активный Stay на unit (application-level)
                if unit.status != 'available':
                    raise serializers.ValidationError(
                        f'Юнит "{unit.name}" недоступен (статус: {unit.get_status_display()}).'
                    )

            elif mode == 'cottage':
                # Cottage: нельзя дублировать смену на ту же дату
                if not shift_type:
                    raise serializers.ValidationError(
                        'Для cottage-режима необходимо указать тип смены (shift_type).'
                    )
                # full занимает весь день — нельзя добавить day/night если есть full, и наоборот
                existing = Stay.objects.filter(
                    unit=unit,
                    check_in_date=check_in,
                    status='active',
                )
                if existing.filter(shift_type=shift_type).exists():
                    raise serializers.ValidationError(
                        f'Смена "{shift_type}" на {check_in} уже занята.'
                    )
                if existing.filter(shift_type='full').exists():
                    raise serializers.ValidationError(
                        f'На {check_in} уже забронированы сутки — весь день занят.'
                    )
                if shift_type == 'full' and existing.exists():
                    raise serializers.ValidationError(
                        f'На {check_in} уже есть бронь — нельзя добавить сутки.'
                    )

        return data

    @transaction.atomic
    def create(self, validated_data):
        """
        Атомарное создание Stay.

        Hostel-режим:
          1. SELECT FOR UPDATE на Unit.
          2. Повторная проверка статуса под блокировкой.
          3. Создаём Stay, Unit.status → 'occupied'.

        Cottage-режим:
          1. SELECT FOR UPDATE на Unit.
          2. Повторная проверка перекрытия смен под блокировкой.
          3. Создаём Stay. Unit.status НЕ меняем (календарь — источник истины).
        """
        unit_id = validated_data['unit'].id
        unit = Unit.objects.select_for_update().get(id=unit_id)
        validated_data['unit'] = unit

        mode = self._get_booking_mode(unit)

        if mode == 'hostel':
            # Повторная проверка под блокировкой
            if unit.status != 'available':
                raise serializers.ValidationError(
                    f'Юнит "{unit.name}" недоступен. '
                    f'Возможно, только что был занят другим заездом.'
                )
            stay = super().create(validated_data)
            unit.status = 'occupied'
            unit.save(update_fields=['status'])

        else:  # cottage
            check_in = validated_data['check_in_date']
            shift_type = validated_data.get('shift_type')
            # Ночная (20–11) и суточная (13–11) смены завершаются на следующий день.
            # Дневная (13–19) — в тот же день. Выставляем дату выезда авторитетно.
            if shift_type in ('night', 'full'):
                validated_data['expected_check_out_date'] = check_in + timedelta(days=1)
            elif shift_type == 'day':
                validated_data['expected_check_out_date'] = check_in
            if shift_type:
                existing_qs = Stay.objects.filter(
                    unit=unit, check_in_date=check_in, status='active'
                )
                # дубль той же смены или конфликт с full
                conflict = existing_qs.filter(
                    models.Q(shift_type=shift_type) | models.Q(shift_type='full')
                ).exists()
                # сутки нельзя добавить если уже есть любая смена
                if not conflict and shift_type == 'full':
                    conflict = existing_qs.exists()
                if conflict:
                    raise serializers.ValidationError('Смена уже занята (race condition).')
            stay = super().create(validated_data)

        # Если иностранец — ставим MPIS pending
        if stay.guest.is_foreigner and stay.mpis_status == 'not_required':
            stay.mpis_status = 'pending'
            stay.save(update_fields=['mpis_status'])

        return stay


class CheckOutSerializer(serializers.Serializer):
    actual_check_out_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExtendStaySerializer(serializers.Serializer):
    new_check_out_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)


class MpisStatusSerializer(serializers.Serializer):
    """Обновление MPIS-статуса заезда."""
    mpis_status = serializers.ChoiceField(choices=Stay.MPIS_STATUSES)


class MpisPendingStaySerializer(serializers.ModelSerializer):
    """Краткая версия для списка ожидающих регистрации MPIS."""
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    guest_phone = serializers.CharField(source='guest.phone', read_only=True)
    guest_nationality = serializers.CharField(source='guest.nationality', read_only=True)
    guest_document_type = serializers.CharField(source='guest.get_document_type_display', read_only=True)
    guest_document_number = serializers.CharField(source='guest.document_number', read_only=True)
    guest_iin = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()
    mpis_status_display = serializers.CharField(source='get_mpis_status_display', read_only=True)
    days_since_checkin = serializers.SerializerMethodField()

    class Meta:
        model = Stay
        fields = [
            'id', 'guest', 'guest_name', 'guest_phone', 'guest_nationality',
            'guest_document_type', 'guest_document_number', 'guest_iin',
            'unit_name', 'check_in_date', 'mpis_status', 'mpis_status_display',
            'days_since_checkin',
        ]

    def get_guest_iin(self, obj):
        request = self.context.get('request')
        if request and request.user.role in ('superadmin', 'owner', 'manager', 'reception'):
            return obj.guest.iin
        return '***'

    def get_unit_name(self, obj):
        return f'{obj.unit.room.name} / {obj.unit.name}'

    def get_days_since_checkin(self, obj):
        from datetime import date
        return (date.today() - obj.check_in_date).days
