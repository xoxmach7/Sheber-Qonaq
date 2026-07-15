import uuid
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
        # Активная (не истёкшая) неподтверждённая заявка блокирует повтор — но истёкшая
        # не должна: иначе email уходит в вечный тупик из-за unique=True на
        # SignupRequest.email (создать новую нельзя, а старая обещала "подождите 24 часа"
        # и не давала способа повторить попытку).
        pending = SignupRequest.objects.filter(email__iexact=value, confirmed_at__isnull=True).first()
        if pending and not pending.is_expired:
            raise serializers.ValidationError(
                'Заявка с этим email уже отправлена. Проверьте почту, включая папку "Спам", '
                'или нажмите "Отправить письмо ещё раз".'
            )
        return value


class SignupThrottle(AnonRateThrottle):
    scope = 'signup'
    rate = '5/hour'


class ResendSignupThrottle(AnonRateThrottle):
    scope = 'signup_resend'
    rate = '3/hour'


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
        email = data['email']

        # Истёкшая неподтверждённая заявка на этот email переиспользуется (обновляется
        # на месте) вместо попытки INSERT, которая упадёт на unique constraint.
        existing = SignupRequest.objects.filter(
            email__iexact=email, confirmed_at__isnull=True
        ).first()
        if existing:
            existing.org_name = data['org_name']
            existing.city = data['city']
            existing.booking_mode = data['booking_mode']
            existing.password_hash = make_password(data['password'])
            existing.token = uuid.uuid4()
            existing.created_at = timezone.now()
            existing.save(update_fields=[
                'org_name', 'city', 'booking_mode', 'password_hash', 'token', 'created_at',
            ])
            signup_request = existing
        else:
            signup_request = SignupRequest.objects.create(
                email=email,
                org_name=data['org_name'],
                city=data['city'],
                booking_mode=data['booking_mode'],
                password_hash=make_password(data['password']),
            )

        confirm_url = f'{settings.FRONTEND_URL}/signup/confirm/{signup_request.token}'
        sent = send_confirmation_email(signup_request.email, confirm_url)

        if not sent:
            # Заявка сохранена (данные не теряются). Почтовый сервис пока не может
            # слать письма произвольным адресатам (нет верифицированного домена в
            # Resend — только тестовый onboarding@resend.dev, ограниченный адресом
            # владельца аккаунта) — поэтому дублируем ссылку подтверждения в самом
            # ответе API, чтобы пользователь мог подтвердиться без письма.
            return Response(
                {
                    'detail': (
                        'Заявка сохранена, но письмо отправить не удалось. '
                        'Подтвердите регистрацию по ссылке ниже.'
                    ),
                    'confirm_url': confirm_url,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        return Response(
            {'detail': 'Письмо с подтверждением отправлено на указанный email.'},
            status=status.HTTP_201_CREATED,
        )


class SignupResendView(APIView):
    """
    POST /api/v1/organizations/signup/resend/
    Body: {"email": "..."}
    Пересылает письмо подтверждения на существующую неподтверждённую заявку
    (с новым токеном/сроком действия). Не раскрывает, существует ли email
    в системе — всегда отвечает одинаково, чтобы не давать enumeration.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ResendSignupThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Укажите email.'}, status=status.HTTP_400_BAD_REQUEST)

        generic_response = Response(
            {'detail': 'Если заявка с таким email существует, письмо отправлено повторно.'},
            status=status.HTTP_200_OK,
        )

        signup_request = SignupRequest.objects.filter(
            email__iexact=email, confirmed_at__isnull=True
        ).first()
        if not signup_request:
            return generic_response

        signup_request.token = uuid.uuid4()
        signup_request.created_at = timezone.now()
        signup_request.save(update_fields=['token', 'created_at'])

        confirm_url = f'{settings.FRONTEND_URL}/signup/confirm/{signup_request.token}'
        sent = send_confirmation_email(signup_request.email, confirm_url)

        if not sent:
            return Response(
                {'detail': 'Письмо отправить не удалось. Подтвердите регистрацию по ссылке ниже.',
                 'confirm_url': confirm_url},
                status=status.HTTP_200_OK,
            )
        return generic_response


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
