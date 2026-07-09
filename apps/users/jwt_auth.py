"""
Регистронезависимый вход по логину или email.
admin2 == Admin2 == ADMIN2 — ищем пользователя по username__iexact,
и дополнительно по email__iexact (self-service регистрация создаёт
username из части email до "@", так что пользователь часто пытается
войти именно по email — раньше это давало "неверный логин или пароль").
Найденное совпадение подставляется в username_field, дальше — стандартный SimpleJWT.
"""
from django.contrib.auth import get_user_model
from django.db import models
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model()


class LoginThrottle(AnonRateThrottle):
    # Ограничение по IP — защита от подбора пароля брутфорсом.
    # Ставка задаётся в REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login'].
    scope = 'login'


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_value = attrs.get(self.username_field, '')
        if login_value:
            match = (
                User.objects.filter(
                    models.Q(**{f'{self.username_field}__iexact': login_value})
                    | models.Q(email__iexact=login_value)
                )
                .order_by('id')
                .first()
            )
            if match:
                # подставляем точный (сохранённый) логин для аутентификации
                attrs[self.username_field] = getattr(match, self.username_field)
        return super().validate(attrs)


class CaseInsensitiveTokenObtainPairView(TokenObtainPairView):
    serializer_class = CaseInsensitiveTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]
