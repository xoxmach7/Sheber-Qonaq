from django.db import models
from apps.core.models import OrganizationScopedModel, TimestampedModel


class Lead(OrganizationScopedModel):
    """
    Потенциальный гость — от первого контакта до заселения.
    Воронка: new → viewing_scheduled → viewed → negotiating → won/lost
    """
    STATUSES = [
        ('new', 'Новый'),
        ('viewing_scheduled', 'Показ назначен'),
        ('viewed', 'Показ проведён'),
        ('negotiating', 'Обсуждение'),
        ('won', 'Заселился'),
        ('lost', 'Отказался'),
    ]

    SOURCES = [
        ('krisha', 'Krisha.kz'),
        ('olx', 'OLX.kz'),
        ('instagram', 'Instagram'),
        ('referral', 'Рекомендация'),
        ('direct', 'Напрямую'),
        ('other', 'Другое'),
    ]

    name = models.CharField(max_length=200, verbose_name='Имя')
    phone = models.CharField(max_length=20, verbose_name='Телефон')
    source = models.CharField(
        max_length=20, choices=SOURCES, default='direct', verbose_name='Источник'
    )
    interested_unit_type = models.CharField(
        max_length=50, blank=True, verbose_name='Интересует тип'
    )
    budget_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Бюджет от'
    )
    budget_max = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Бюджет до'
    )
    status = models.CharField(
        max_length=30, choices=STATUSES, default='new', verbose_name='Статус'
    )
    notes = models.TextField(blank=True, verbose_name='Заметки')

    # Когда лид стал гостем — ссылка на Guest
    converted_to_guest = models.ForeignKey(
        'guests.Guest', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='lead', verbose_name='Конвертирован в гостя'
    )
    converted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата конверсии')

    class Meta:
        verbose_name = 'Лид'
        verbose_name_plural = 'Лиды'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone}) — {self.get_status_display()}'


class Viewing(TimestampedModel):
    """
    Показ объекта потенциальному гостю.
    Каждый лид может иметь несколько показов.
    Celery задача отправляет напоминание за 1 час.
    """
    OUTCOMES = [
        ('pending', 'Ожидается'),
        ('no_show', 'Не явился'),
        ('interested', 'Заинтересован'),
        ('not_interested', 'Не заинтересован'),
    ]

    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE,
        related_name='viewings', verbose_name='Лид'
    )
    scheduled_at = models.DateTimeField(verbose_name='Запланировано на')
    conducted_at = models.DateTimeField(null=True, blank=True, verbose_name='Проведено в')
    outcome = models.CharField(
        max_length=20, choices=OUTCOMES, default='pending', verbose_name='Результат'
    )
    notes = models.TextField(blank=True, verbose_name='Заметки')
    reminder_sent = models.BooleanField(default=False, verbose_name='Напоминание отправлено')

    class Meta:
        verbose_name = 'Показ'
        verbose_name_plural = 'Показы'
        ordering = ['scheduled_at']

    def __str__(self):
        return f'Показ для {self.lead.name} / {self.scheduled_at:%d.%m.%Y %H:%M}'
