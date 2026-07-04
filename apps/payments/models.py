from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import models
from apps.core.models import OrganizationScopedModel, TimestampedModel


class Payment(TimestampedModel):
    """
    Оплата за проживание.
    Привязана к Stay. Один Stay может иметь много частичных оплат.
    """
    METHODS = [
        ('cash', 'Наличные'),
        ('kaspi', 'Kaspi Transfer'),
        ('bank_transfer', 'Банковский перевод'),
        ('card', 'Карта'),
    ]

    stay = models.ForeignKey(
        'stays.Stay', on_delete=models.CASCADE,
        related_name='payments', verbose_name='Проживание'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name='Сумма (тенге)',
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    payment_date = models.DateField(verbose_name='Дата оплаты')
    method = models.CharField(
        max_length=20, choices=METHODS, default='cash', verbose_name='Способ оплаты'
    )

    # За какой период эта оплата (опционально — для ясности)
    period_from = models.DateField(null=True, blank=True, verbose_name='Период с')
    period_to = models.DateField(null=True, blank=True, verbose_name='Период по')

    received_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True,
        related_name='received_payments', verbose_name='Принял'
    )
    notes = models.CharField(max_length=255, blank=True, verbose_name='Заметка')

    class Meta:
        verbose_name = 'Оплата'
        verbose_name_plural = 'Оплаты'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f'{self.amount} тг / {self.get_method_display()} / {self.payment_date}'


class Expense(OrganizationScopedModel):
    """
    Расходы объекта размещения.
    Коммуналка, хозтовары, ремонт, реклама и т.д.
    """
    CATEGORIES = [
        ('utility', 'Коммунальные услуги'),
        ('supply', 'Хозтовары / расходники'),
        ('maintenance', 'Ремонт и обслуживание'),
        ('salary', 'Зарплата'),
        ('advertising', 'Реклама'),
        ('tax', 'Налоги'),
        ('other', 'Прочее'),
    ]

    property = models.ForeignKey(
        'properties.Property', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='expenses', verbose_name='Объект'
    )
    category = models.CharField(
        max_length=20, choices=CATEGORIES, verbose_name='Категория'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name='Сумма (тенге)',
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    date = models.DateField(verbose_name='Дата')
    description = models.TextField(blank=True, default='', verbose_name='Описание')
    created_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True,
        related_name='created_expenses', verbose_name='Создал'
    )

    class Meta:
        verbose_name = 'Расход'
        verbose_name_plural = 'Расходы'
        ordering = ['-date']

    def __str__(self):
        return f'{self.get_category_display()} / {self.amount} тг / {self.date}'
