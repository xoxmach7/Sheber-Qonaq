from django.db import models
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

    class Meta:
        verbose_name = 'Организация'
        verbose_name_plural = 'Организации'
        ordering = ['name']

    def __str__(self):
        return self.name
