"""
Регистронезависимый вход по логину.
admin2 == Admin2 == ADMIN2 — ищем пользователя по username__iexact,
затем отдаём управление стандартному SimpleJWT.
"""
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model()


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field, '')
        if username:
            match = (
                User.objects.filter(**{f'{self.username_field}__iexact': username})
                .order_by('id')
                .first()
            )
            if match:
                # подставляем точный (сохранённый) логин для аутентификации
                attrs[self.username_field] = getattr(match, self.username_field)
        return super().validate(attrs)


class CaseInsensitiveTokenObtainPairView(TokenObtainPairView):
    serializer_class = CaseInsensitiveTokenObtainPairSerializer
