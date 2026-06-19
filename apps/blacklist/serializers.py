from rest_framework import serializers
from .models import BlacklistEntry


class BlacklistEntrySerializer(serializers.ModelSerializer):
    iin = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.name', read_only=True)

    class Meta:
        model = BlacklistEntry
        fields = [
            'id', 'full_name', 'iin', 'phone',
            'reason', 'reason_display', 'description',
            'evidence_url', 'reported_by', 'reported_by_name',
            'is_verified', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'reported_by', 'is_verified', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # ИИН показываем частично: первые 3 и последние 2 символа
        iin_val = instance.iin
        if iin_val:
            data['iin'] = iin_val[:3] + '***' + iin_val[-2:]
        return data

    def create(self, validated_data):
        iin = validated_data.pop('iin', '')
        entry = BlacklistEntry(**validated_data)
        if iin:
            entry.iin = iin
        entry.save()
        return entry


class BlacklistCheckInputSerializer(serializers.Serializer):
    iin = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('iin') and not data.get('phone'):
            raise serializers.ValidationError('Укажите ИИН или телефон.')
        return data
