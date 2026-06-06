from django.db import models
from django.db.models import Sum
from decimal import Decimal
from datetime import date
from apps.core.models import OrganizationScopedModel


class Stay(OrganizationScopedModel):
    """
    Проживание — связь гостя с юнитом на определённый период.
    Центральная сущность: всё крутится вокруг Stay.
    """
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
    notes = models.TextField(blank=True, verbose_name='Заметки')
    created_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True,
        related_name='created_stays', verbose_name='Создал'
    )

    class Meta:
        verbose_name = 'Проживание'
        verbose_name_plural = 'Проживания'
        ordering = ['-check_in_date']

    def __str__(self):
        return f'{self.guest} / {self.unit} / с {self.check_in_date}'

    # ─── Финансовые расчёты ───────────────────────────────────────────────────

    @property
    def total_paid(self) -> Decimal:
        """Сумма всех фактически принятых оплат."""
        result = self.payments.aggregate(total=Sum('amount'))['total']
        return result or Decimal('0')

    @property
    def total_expected(self) -> Decimal:
        """
        Ожидаемая сумма за весь период проживания.
        Считается на основе rate_type и длительности.
        """
        end_date = self.actual_check_out_date or self.expected_check_out_date
        if not end_date or not self.check_in_date:
            return Decimal('0')

        delta_days = (end_date - self.check_in_date).days

        if self.rate_type == 'daily':
            return self.rate_amount * delta_days
        elif self.rate_type == 'weekly':
            weeks = Decimal(delta_days) / Decimal('7')
            import math
            return self.rate_amount * Decimal(math.ceil(float(weeks)))
        elif self.rate_type == 'monthly':
            # Считаем количество месяцев (округляем вверх)
            months = Decimal(delta_days) / Decimal('30')
            import math
            return self.rate_amount * Decimal(math.ceil(float(months)))

        return Decimal('0')

    @property
    def balance(self) -> Decimal:
        """Долг гостя (отрицательный = переплата)."""
        return self.total_expected - self.total_paid

    @property
    def has_debt(self) -> bool:
        return self.balance > Decimal('0')
