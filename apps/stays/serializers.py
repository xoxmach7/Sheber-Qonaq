from rest_framework import serializers
from django.db import transaction
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

    class Meta:
        model = Stay
        fields = [
            'id', 'unit', 'unit_detail', 'guest', 'guest_detail',
            'check_in_date', 'expected_check_out_date', 'actual_check_out_date',
            'rate_type', 'rate_type_display', 'rate_amount',
            'deposit_amount', 'status', 'status_display',
            'source', 'source_display', 'notes',
            'mpis_status', 'mpis_status_display',
            'total_paid', 'total_expected', 'balance', 'has_debt',
            'created_at',
        ]
        read_only_fields = ['id', 'actual_check_out_date', 'created_at']

    def validate(self, data):
        unit = data.get('unit')
        check_in = data.get('check_in_date')
        check_out = data.get('expected_check_out_date')

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError(
                'Дата выселения должна быть позже даты заселения.'
            )

        # Предварительная проверка статуса (без блокировки — для UX).
        # Финальная проверка под блокировкой выполняется внутри create().
        if self.instance is None and unit and unit.status != 'available':
            raise serializers.ValidationError(
                f'Юнит "{unit.name}" недоступен (статус: {unit.get_status_display()}).'
            )
        return data

    @transaction.atomic
    def create(self, validated_data):
        """
        Атомарное создание Stay.

        Порядок операций:
        1. Блокируем Unit строку через SELECT FOR UPDATE — устраняет race condition.
        2. Повторно проверяем статус под блокировкой.
        3. Создаём Stay.
        4. Обновляем Unit.status → 'occupied'.
        5. Если иностранец — ставим mpis_status='pending'.
        Всё в одной транзакции: любой сбой откатывает все изменения.
        """
        unit_id = validated_data['unit'].id

        # SELECT FOR UPDATE: блокирует строку Unit до конца транзакции.
        # Если параллельный запрос тоже пытается заблокировать тот же unit —
        # он ждёт здесь пока мы не закоммитимся. После нашего коммита
        # unit.status уже 'occupied', и параллельный запрос получит ошибку.
        unit = Unit.objects.select_for_update().get(id=unit_id)

        # Повторная проверка под блокировкой — теперь атомарно.
        if unit.status != 'available':
            raise serializers.ValidationError(
                f'Юнит "{unit.name}" недоступен (статус: {unit.get_status_display()}). '
                f'Возможно, только что был занят другим заездом.'
            )

        # Подменяем unit в validated_data на заблокированный объект.
        validated_data['unit'] = unit

        stay = super().create(validated_data)

        # Помечаем юнит как занятый — в той же транзакции.
        unit.status = 'occupied'
        unit.save(update_fields=['status'])

        # Если гость иностранец — автоматически ставим MPIS статус pending.
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
