from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.core.permissions import OWNER_ROLES
from .models import User


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'role', 'role_display', 'organization', 'is_active']
        read_only_fields = ['id', 'organization']

    def validate_role(self, value):
        # Менять роль может только owner/superadmin — иначе manager мог бы
        # назначить себе (или кому угодно) owner через PATCH /users/<id>/.
        request = self.context.get('request')
        requester = getattr(request, 'user', None)
        current = getattr(self.instance, 'role', None)
        if value == current:
            return value
        if not requester or requester.role not in OWNER_ROLES:
            raise serializers.ValidationError('Менять роль может только владелец организации.')
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'phone', 'role', 'password']

    def validate_role(self, value):
        # Тот же принцип, что и в UserSerializer: создавать owner/superadmin
        # может только owner/superadmin. Manager может заводить только
        # роли ниже своей (reception/housekeeping/maintenance/accountant).
        request = self.context.get('request')
        requester = getattr(request, 'user', None)
        if value in OWNER_ROLES and (not requester or requester.role not in OWNER_ROLES):
            raise serializers.ValidationError('Создавать пользователя с этой ролью может только владелец организации.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.organization = self.context['request'].user.organization
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
