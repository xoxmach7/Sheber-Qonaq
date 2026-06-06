from rest_framework import serializers
from django.utils import timezone
from .models import Stay
from apps.guests.serializers import GuestShortSerializer
from apps.properties.serializers import UnitSerializer


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

    class Meta:
        model = Stay
        fields = [
            'id', 'unit', 'unit_detail', 'guest', 'guest_detail',
            'check_in_date', 'expected_check_out_date', 'actual_check_out_date',
            'rate_type', 'rate_type_display', 'rate_amount',
            'deposit_amount', 'status', 'status_display',
            'source', 'source_display', 'notes',
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

        # Проверяем что юнит свободен (только при создании)
        if self.instance is None and unit and unit.status != 'available':
            raise serializers.ValidationError(
                f'Юнит "{unit.name}" недоступен (статус: {unit.get_status_display()}).'
            )
        return data

    def create(self, validated_data):
        stay = super().create(validated_data)
        # Помечаем юнит как занятый
        stay.unit.status = 'occupied'
        stay.unit.save(update_fields=['status'])
        return stay


class CheckOutSerializer(serializers.Serializer):
    actual_check_out_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExtendStaySerializer(serializers.Serializer):
    new_check_out_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)
