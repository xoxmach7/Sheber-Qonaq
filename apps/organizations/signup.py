from django.contrib.auth.hashers import make_password
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from apps.organizations.models import SignupRequest
from apps.organizations.email import send_confirmation_email


class SignupRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    org_name = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=100, default='Алматы')
    booking_mode = serializers.ChoiceField(choices=['hostel', 'cottage'], default='hostel')

    def validate_email(self, value):
        value = value.lower()
        from apps.users.models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Этот email уже зарегистрирован. Войдите в аккаунт.')
        if SignupRequest.objects.filter(email__iexact=value, confirmed_at__isnull=True).exists():
            raise serializers.ValidationError(
                'Заявка с этим email уже отправлена. Проверьте почту или подождите 24 часа.'
            )
        return value


class SignupThrottle(AnonRateThrottle):
    scope = 'signup'
    rate = '5/hour'


class SignupRequestView(APIView):
    """
    POST /api/v1/organizations/signup/
    Создаёт заявку на регистрацию и отправляет письмо с ссылкой подтверждения.
    Публичный эндпоинт (без авторизации).
    """
    permission_classes = [AllowAny]
    throttle_classes = [SignupThrottle]

    def post(self, request):
        ser = SignupRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        signup_request = SignupRequest.objects.create(
            email=data['email'],
            org_name=data['org_name'],
            city=data['city'],
            booking_mode=data['booking_mode'],
            password_hash=make_password(data['password']),
        )

        confirm_url = f'{settings.FRONTEND_URL}/signup/confirm/{signup_request.token}'
        send_confirmation_email(signup_request.email, confirm_url)

        return Response(
            {'detail': 'Письмо с подтверждением отправлено на указанный email.'},
            status=status.HTTP_201_CREATED,
        )
