from rest_framework import serializers
from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
    iin = serializers.CharField(required=False, allow_blank=True, write_only=False)
    full_name = serializers.CharField(read_only=True)
    is_blacklisted = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            'id', 'first_name', 'last_name', 'middle_name', 'full_name',
            'phone', 'email', 'iin',
            'document_type', 'document_number', 'document_photo',
            'date_of_birth', 'city_of_origin', 'nationality', 'is_foreigner',
            'sex', 'document_issue_date', 'document_expiry_date',
            'entry_date', 'migration_card_number',
            'notes', 'is_active', 'is_blacklisted', 'created_at',
        ]
        read_only_fields = ['id', 'full_name', 'is_blacklisted', 'created_at']
        extra_kwargs = {
            'document_photo': {'required': False},
        }

    def get_is_blacklisted(self, obj) -> bool:
        from apps.blacklist.models import BlacklistEntry
        if not obj.phone:
            return False
        return BlacklistEntry.objects.filter(
            is_active=True, phone=obj.phone
        ).exists()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Расшифровываем ИИН при чтении (только для авторизованных с нужной ролью)
        request = self.context.get('request')
        if request and request.user.role in ('superadmin', 'owner', 'manager', 'reception'):
            data['iin'] = instance.iin
        else:
            data['iin'] = '***' if instance._iin_encrypted else ''
        return data

    def create(self, validated_data):
        iin = validated_data.pop('iin', '')
        guest = Guest(**validated_data)
        if iin:
            guest.iin = iin
        guest.save()
        return guest

    def update(self, instance, validated_data):
        iin = validated_data.pop('iin', None)
        if iin is not None:
            instance.iin = iin
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class GuestShortSerializer(serializers.ModelSerializer):
    """Краткая версия для использования в Stay и других местах.
    Включает поля для MPIS clipboard bridge."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Guest
        fields = [
            'id', 'full_name', 'phone',
            'nationality', 'is_foreigner',
            'document_type', 'document_number',
            'sex', 'date_of_birth', 'document_issue_date', 'document_expiry_date',
            'entry_date', 'migration_card_number',
        ]


class BlacklistCheckSerializer(serializers.Serializer):
    iin = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('iin') and not data.get('phone'):
            raise serializers.ValidationError('Укажите ИИН или телефон.')
        return data
