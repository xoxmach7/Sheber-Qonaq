from django.contrib.auth.hashers import make_password
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from apps.organizations.models import SignupRequest
from apps.organizations.email import send_confirmation_email

from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import Organization
from apps.properties.models import Property

User = get_user_model()


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


class SignupConfirmView(APIView):
    """
    POST /api/v1/organizations/signup/confirm/<token>/
    Материализует Organization + Property + User (owner) из SignupRequest,
    ставит trial_ends_at = now + 30 дней, возвращает JWT-токены как логин.
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        signup_request = get_object_or_404(SignupRequest, token=token)

        if signup_request.confirmed_at is not None:
            return Response({'detail': 'Заявка уже подтверждена.'}, status=status.HTTP_400_BAD_REQUEST)
        if signup_request.is_expired:
            return Response(
                {'detail': 'Ссылка истекла. Зарегистрируйтесь заново.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            slug = signup_request.org_name.lower().replace(' ', '-')[:100]
            base, counter = slug, 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f'{base}-{counter}'
                counter += 1

            org = Organization.objects.create(
                name=signup_request.org_name,
                slug=slug,
                plan='free',
                trial_ends_at=timezone.now() + timedelta(days=30),
                contact_email=signup_request.email,
            )
            Property.objects.create(
                organization=org,
                name=signup_request.org_name,
                city=signup_request.city,
                address='',
                booking_mode=signup_request.booking_mode,
            )
            username_base = signup_request.email.split('@')[0]
            username, counter = username_base, 1
            while User.objects.filter(username=username).exists():
                username = f'{username_base}{counter}'
                counter += 1

            user = User(
                username=username,
                email=signup_request.email,
                role='owner',
                organization=org,
            )
            user.password = signup_request.password_hash
            user.save()

            signup_request.confirmed_at = timezone.now()
            signup_request.save(update_fields=['confirmed_at'])

        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh)},
            status=status.HTTP_201_CREATED,
        )
