import math
from django.db import models
from django.db.models import Sum, Q
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from apps.core.models import OrganizationScopedModel


class Stay(OrganizationScopedModel):
    RATE_TYPES = [
        ('daily', 'Посуточно'),
        ('weekly', 'Понедельно'),
        ('monthly', 'Помесячно'),
    ]

    STATUSES = [
        ('active', 'Активно'),
        ('checked_out', 'Выселен'),
        ('cancelled', 'Отменено'),
        ('no_show', 'Не явился'),
    ]

    SOURCES = [
        ('direct', 'Напрямую'),
        ('krisha', 'Krisha.kz'),
        ('olx', 'OLX.kz'),
        ('booking', 'Booking.com'),
        ('instagram', 'Instagram'),
        ('referral', 'Рекомендация'),
        ('other', 'Другое'),
    ]

    MPIS_STATUSES = [
        ('not_required', 'Не требуется'),
        ('pending', 'Ожидает регистрации'),
        ('submitted', 'Отправлено'),
        ('confirmed', 'Подтверждено'),
    ]

    SHIFT_TYPES = [
        ('day',   'Дневная смена (13:00–19:00)'),
        ('night', 'Ночная смена (20:00–11:00)'),
        ('full',  'Сутки (13:00–11:00)'),
    ]

    unit = models.ForeignKey(
        'properties.Unit', on_delete=models.PROTECT,
        related_name='stays', verbose_name='Юнит'
    )
    guest = models.ForeignKey(
        'guests.Guest', on_delete=models.PROTECT,
        related_name='stays', verbose_name='Гость'
    )

    check_in_date = models.DateField(verbose_name='Дата заселения')
    expected_check_out_date = models.DateField(verbose_name='Планируемая дата выселения')
    actual_check_out_date = models.DateField(
        null=True, blank=True, verbose_name='Фактическая дата выселения'
    )

    rate_type = models.CharField(
        max_length=20, choices=RATE_TYPES, default='monthly', verbose_name='Тип тарифа'
    )
    rate_amount = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name='Сумма тарифа (тенге)'
    )
    deposit_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        verbose_name='Депозит (тенге)'
    )

    status = models.CharField(
        max_length=20, choices=STATUSES, default='active', verbose_name='Статус'
    )
    source = models.CharField(
        max_length=20, choices=SOURCES, default='direct', verbose_name='Источник'
    )
    mpis_status = models.CharField(
        max_length=20, choices=MPIS_STATUSES, default='not_required',
        verbose_name='Статус MPIS',
        help_text='Статус регистрации иностранного гостя в системе MPIS/eQonaq'
    )
    # Cottage mode — посменная аренда (null = обычный хостельный режим)
    shift_type = models.CharField(
        max_length=10, choices=SHIFT_TYPES,
        null=True, blank=True, verbose_name='Тип смены',
        help_text='Только для cottage-режима. null = обычное проживание.'
    )

    notes = models.TextField(blank=True, verbose_name='Заметки')
    created_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True,
        related_name='created_stays', verbose_name='Создал'
    )

    class Meta:
        verbose_name = 'Проживание'
        verbose_name_plural = 'Проживания'
        ordering = ['-check_in_date']
        # Валидация уникальности перенесена в StaySerializer.validate():
        # - hostel режим: только один активный Stay на unit
        # - cottage режим: только один активный Stay на (unit, check_in_date, shift_type)
        # DB constraint убран чтобы поддерживать две смены в один день для cottage.
        constraints = []

    def __str__(self):
        return f'{self.guest} / {self.unit} / с {self.check_in_date}'

    # --- Финансовые расчёты ---

    @property
    def total_paid(self) -> Decimal:
        result = self.payments.aggregate(total=Sum('amount'))['total']
        return result or Decimal('0')

    @property
    def total_expected(self) -> Decimal:
        # daily   — rate x количество дней (точно).
        # weekly  — rate x ceil(дней / 7).
        # monthly — rate x реальное количество календарных месяцев через
        #           relativedelta. Неполный месяц округляется вверх до 1.
        # Исправлен баг: деление delta_days / 30 давало ceil(31/30) = 2
        # для любого 31-дневного периода, что приводило к двойному начислению.
        end_date = self.actual_check_out_date or self.expected_check_out_date
        if not end_date or not self.check_in_date:
            return Decimal('0')

        delta_days = (end_date - self.check_in_date).days

        if self.rate_type == 'daily':
            return self.rate_amount * delta_days

        elif self.rate_type == 'weekly':
            return self.rate_amount * Decimal(math.ceil(delta_days / 7))

        elif self.rate_type == 'monthly':
            diff = relativedelta(end_date, self.check_in_date)
            whole_months = diff.years * 12 + diff.months
            if diff.days > 0:
                whole_months += 1  # неполный месяц -> округление вверх
            return self.rate_amount * Decimal(max(whole_months, 1))

        return Decimal('0')

    @property
    def balance(self) -> Decimal:
        return self.total_expected - self.total_paid

    @property
    def has_debt(self) -> bool:
        return self.balance > Decimal('0')
