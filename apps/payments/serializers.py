from rest_framework import serializers
from .models import Payment, Expense


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    received_by_name = serializers.CharField(
        source='received_by.get_full_name', read_only=True
    )
    stay_info = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'stay', 'stay_info', 'amount', 'payment_date',
            'method', 'method_display',
            'period_from', 'period_to',
            'received_by', 'received_by_name', 'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_stay_info(self, obj):
        # "Гость · место" — для истории платежей на странице Финансы.
        stay = obj.stay
        guest_name = stay.guest.full_name if stay and stay.guest_id else None
        unit_name = stay.unit.name if stay and stay.unit_id else None
        parts = [p for p in (guest_name, unit_name) if p]
        return ' · '.join(parts) if parts else None

    def validate_stay(self, value):
        # Межарендная защита: заезд должен принадлежать организации текущего пользователя.
        request = self.context.get('request')
        org = getattr(getattr(request, 'user', None), 'organization', None)
        if org and value.organization_id != org.id:
            raise serializers.ValidationError('Заезд не найден.')
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'property', 'category', 'category_display',
            'amount', 'date', 'description', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

    def validate_property(self, value):
        # Межарендная защита: объект размещения должен принадлежать организации пользователя.
        if value is None:
            return value
        request = self.context.get('request')
        org = getattr(getattr(request, 'user', None), 'organization', None)
        if org and value.organization_id != org.id:
            raise serializers.ValidationError('Объект не найден.')
        return value


class FinanceSummarySerializer(serializers.Serializer):
    """P&L за период — для дашборда."""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_debt = serializers.DecimalField(max_digits=12, decimal_places=2)
    payments_count = serializers.IntegerField()
    income_by_method = serializers.DictField()
    expenses_by_category = serializers.DictField()
