from rest_framework import serializers
from .models import BlacklistEntry


class BlacklistEntrySerializer(serializers.ModelSerializer):
    iin = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.name', read_only=True)
    guest_name = serializers.SerializerMethodField()

    class Meta:
        model = BlacklistEntry
        fields = [
            'id', 'full_name', 'iin', 'phone',
            'guest', 'guest_name',
            'reason', 'reason_display', 'description',
            'evidence_url', 'reported_by', 'reported_by_name',
            'is_verified', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'reported_by', 'is_verified', 'created_at']

    def get_guest_name(self, obj):
        return obj.guest.full_name if obj.guest_id else None

    def validate_guest(self, value):
        # Гость должен принадлежать организации пользователя (не чужой из сети).
        if value is None:
            return value
        request = self.context.get('request')
        org = getattr(getattr(request, 'user', None), 'organization', None)
        if org and value.organization_id != org.id:
            raise serializers.ValidationError('Гость не найден.')
        return value

    def validate(self, data):
        # ФИО можно не указывать, если выбран гость — возьмём из карточки
        if not data.get('full_name') and not data.get('guest'):
            raise serializers.ValidationError('Укажите гостя или ФИО.')
        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # ИИН показываем частично: первые 3 и последние 2 символа
        iin_val = instance.iin
        if iin_val:
            data['iin'] = iin_val[:3] + '***' + iin_val[-2:]
        return data

    def create(self, validated_data):
        iin = validated_data.pop('iin', '')
        guest = validated_data.get('guest')
        # Автозаполнение из карточки гостя
        if guest:
            if not validated_data.get('full_name'):
                validated_data['full_name'] = guest.full_name
            if not validated_data.get('phone'):
                validated_data['phone'] = guest.phone
            if not iin:
                iin = guest.iin or ''
        entry = BlacklistEntry(**validated_data)
        if iin:
            entry.iin = iin
        entry.save()
        return entry


class BlacklistCheckInputSerializer(serializers.Serializer):
    iin = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('iin') and not data.get('phone') and not data.get('full_name'):
            raise serializers.ValidationError('Укажите ИИН, телефон или ФИО.')
        return data
