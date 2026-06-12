"""
Базовые абстрактные модели.
Все модели проекта наследуются отсюда.
"""
from django.db import models


class TimestampedModel(models.Model):
    """Автоматические поля времени создания и обновления."""
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        abstract = True


class OrganizationScopedModel(TimestampedModel):
    """
    Базовая модель для всех данных привязанных к организации (хостелу).
    Обеспечивает row-level изоляцию данных между клиентами SaaS.
    ВАЖНО: всегда фильтровать queryset по organization при выдаче данных.
    """
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        verbose_name='Организация',
        db_index=True,
    )

    class Meta:
        abstract = True
