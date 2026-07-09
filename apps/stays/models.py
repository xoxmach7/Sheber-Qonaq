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
        ('reserved', 'Бронь (резерв)'),
        ('confirmed', 'Подтверждено (предоплата)'),
        ('active', 'Активно (заселён)'),
        ('checked_out', 'Выселен'),
        ('cancelled', 'Отменено'),
        ('no_show', 'Не явился'),
        ('expired', 'Резерв истёк'),
    ]

    # Статусы, которые занимают даты юнита (учитываются в проверке пересечений).
    BLOCKING_STATUSES = ('reserved', 'confirmed', 'active')

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
        verbose_name='Статус уведомления о прибытии',
        help_text='Статус отправки уведомления о прибытии иностранного гостя в системе eQonaq'
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

    @staticmethod
    def overlapping(unit, check_in, check_out, exclude_pk=None):
        """
        Брони, пересекающие интервал [check_in, check_out) на данном юните.
        Полуоткрытый интервал: заезд в день чужого выезда НЕ считается пересечением.
        Учитываются только обычные проживания (shift_type IS NULL) в блокирующих
        статусах (reserved/confirmed/active). Cottage-смены — отдельная подсистема.
        """
        qs = Stay.objects.filter(
            unit=unit,
            shift_type__isnull=True,
            status__in=Stay.BLOCKING_STATUSES,
            check_in_date__lt=check_out,
            expected_check_out_date__gt=check_in,
        )
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return qs

    # --- Финансовые расчёты ---

    @property
    def total_paid(self) -> Decimal:
        # Если payments уже prefetch'нуты (список Stay), суммируем в Python —
        # иначе на каждый Stay в списке уходил бы отдельный SQL-запрос (N+1).
        cache = getattr(self, '_prefetched_objects_cache', None)
        if cache is not None and 'payments' in cache:
            return sum((p.amount for p in self.payments.all()), Decimal('0'))
        result = self.payments.aggregate(total=Sum('amount'))['total']
        return result or Decimal('0')

    @staticmethod
    def duration_units(rate_type, check_in, check_out):
        """
        Кол-во расчётных единиц за интервал [check_in, check_out):
          daily   — количество дней (int).
          weekly  — ceil(дней / 7) (int).
          monthly — целые календарные месяцы через relativedelta + пропорциональный
                    остаток дней (rate/30 за день), Decimal. Например 2 месяца и 1 день
                    -> Decimal('2') + Decimal('1')/30, а не округление до 3 месяцев —
                    иначе доплата за 1 лишний день превращается в полную месячную ставку.
        Единый источник логики для total_expected и котировки (quote).
        """
        import math as _math
        if not check_in or not check_out:
            return 0
        days = (check_out - check_in).days
        if days <= 0:
            return 0
        if rate_type == 'daily':
            return days
        if rate_type == 'weekly':
            return _math.ceil(days / 7)
        if rate_type == 'monthly':
            diff = relativedelta(check_out, check_in)
            months = diff.years * 12 + diff.months
            units = Decimal(months) + (Decimal(diff.days) / Decimal(30))
            units = units.quantize(Decimal('0.01'))
            return units if units > 0 else Decimal('1')
        return 0

    @property
    def total_expected(self) -> Decimal:
        # Посменная аренда (cottage): цена фиксирована за смену, не зависит от дней.
        if self.shift_type:
            return self.rate_amount or Decimal('0')
        end_date = self.actual_check_out_date or self.expected_check_out_date
        units = self.duration_units(self.rate_type, self.check_in_date, end_date)
        total = (self.rate_amount or Decimal('0')) * units
        # Округляем до тенге — units для monthly дробный (пропорциональный остаток дней).
        return total.quantize(Decimal('1'))

    @property
    def balance(self) -> Decimal:
        return self.total_expected - self.total_paid

    @property
    def has_debt(self) -> bool:
        return self.balance > Decimal('0')


class StayDateChange(models.Model):
    """
    История изменений дат заезда/выезда — кто, когда и с какой даты на какую
    поменял (продление, перенос заезда и т.п.). Только для аудита/разбора
    спорных начислений, на расчёт долга не влияет.
    """
    FIELDS = [
        ('check_in_date', 'Дата заселения'),
        ('expected_check_out_date', 'Планируемая дата выселения'),
    ]

    stay = models.ForeignKey(
        Stay, on_delete=models.CASCADE, related_name='date_changes', verbose_name='Проживание'
    )
    field = models.CharField(max_length=30, choices=FIELDS, verbose_name='Поле')
    old_value = models.DateField(verbose_name='Было')
    new_value = models.DateField(verbose_name='Стало')
    changed_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stay_date_changes', verbose_name='Кто изменил'
    )
    reason = models.CharField(max_length=255, blank=True, verbose_name='Причина/комментарий')
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='Когда')

    class Meta:
        verbose_name = 'Изменение даты проживания'
        verbose_name_plural = 'Изменения дат проживания'
        ordering = ['-changed_at']

    def __str__(self):
        return f'Stay #{self.stay_id}: {self.field} {self.old_value} → {self.new_value}'
