import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.core.models import TimestampedModel


class Organization(TimestampedModel):
    """
    Организация — хостел/отель/апарт-отель.
    Корневая сущность для multi-tenancy.
    Каждый клиент SaaS = одна Organization.
    """
    PLANS = [
        ('free', 'Бесплатный'),
        ('basic', 'Базовый'),
        ('pro', 'Профессиональный'),
    ]

    name = models.CharField(max_length=255, verbose_name='Название')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='Slug')
    plan = models.CharField(
        max_length=20, choices=PLANS, default='free', verbose_name='Тарифный план'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    contact_email = models.EmailField(blank=True, verbose_name='Email')
    # Доля предоплаты (0..1) для перевода брони в confirmed. По умолчанию 50%.
    deposit_percent = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('0.50'),
        verbose_name='Доля предоплаты',
        help_text='Минимальная доля от суммы брони для подтверждения (0.50 = 50%)',
    )
    trial_ends_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Триал до',
        help_text='Если задано и дата прошла — организация в read-only режиме (нет активной подписки)',
    )

    class Meta:
        verbose_name = 'Организация'
        verbose_name_plural = 'Организации'
        ordering = ['name']

    def __str__(self):
        return self.name


class SignupRequest(TimestampedModel):
    """
    Заявка на self-service регистрацию. Живёт до подтверждения по email-ссылке,
    после чего материализуется в Organization + Property + User (owner).
    """
    email = models.EmailField(unique=True, verbose_name='Email')
    org_name = models.CharField(max_length=255, verbose_name='Название объекта')
    city = models.CharField(max_length=100, verbose_name='Город')
    booking_mode = models.CharField(
        max_length=20,
        choices=[('hostel', 'Хостел / Отель'), ('cottage', 'Гостевой дом / Баня')],
        default='hostel',
    )
    password_hash = models.CharField(max_length=255, verbose_name='Хэш пароля')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name='Подтверждено')

    class Meta:
        verbose_name = 'Заявка на регистрацию'
        verbose_name_plural = 'Заявки на регистрацию'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} ({"подтверждено" if self.confirmed_at else "ожидает"})'

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=24)
