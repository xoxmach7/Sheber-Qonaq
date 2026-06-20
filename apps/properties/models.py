from django.db import models
from apps.core.models import OrganizationScopedModel


def default_shift_rates():
    """Тарифы посменной аренды по умолчанию (₸). Редактируются в настройках объекта."""
    return {'day': 35500, 'night': 35500, 'full': 49500}


def default_base_rates():
    """
    Базовые тарифы по типу юнита (₸). Ключ — unit_type, значение —
    {daily, weekly, monthly}. Редактируются в настройках объекта.
    Сезонные надбавки/скидки — отдельным слоем (RateRule, Фаза B).
    """
    return {
        'bed':          {'daily': 5000,  'weekly': 30000,  'monthly': 100000},
        'private_room': {'daily': 12000, 'weekly': 70000,  'monthly': 250000},
        'apartment':    {'daily': 20000, 'weekly': 120000, 'monthly': 400000},
        'studio':       {'daily': 15000, 'weekly': 90000,  'monthly': 320000},
        'family_room':  {'daily': 18000, 'weekly': 110000, 'monthly': 380000},
    }


class Property(OrganizationScopedModel):
    """
    Объект размещения (хостел, мотель, апарт-отель, гостевой дом).
    Один Organization может иметь несколько Property (multi-property).
    """
    BOOKING_MODES = [
        ('hostel', 'Хостел / Отель (посуточно/помесячно)'),
        ('cottage', 'Гостевой дом / Баня (посменно)'),
    ]

    name = models.CharField(max_length=255, verbose_name='Название')
    address = models.TextField(verbose_name='Адрес')
    city = models.CharField(max_length=100, verbose_name='Город')
    description = models.TextField(blank=True, verbose_name='Описание')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    booking_mode = models.CharField(
        max_length=20, choices=BOOKING_MODES, default='hostel',
        verbose_name='Режим бронирования',
        help_text='hostel — обычный режим, cottage — посменная аренда'
    )
    shift_rates = models.JSONField(
        default=default_shift_rates, blank=True,
        verbose_name='Тарифы смен (cottage)',
        help_text='Цены посменной аренды: {"day": ₸, "night": ₸, "full": ₸}'
    )
    base_rates = models.JSONField(
        default=default_base_rates, blank=True,
        verbose_name='Базовые тарифы по типу юнита',
        help_text='{"bed": {"daily": ₸, "weekly": ₸, "monthly": ₸}, ...}'
    )

    def rate_for(self, unit_type, rate_type):
        """Базовая ставка для типа юнита и типа тарифа. None, если не задана."""
        try:
            value = (self.base_rates or {}).get(unit_type, {}).get(rate_type)
            return value if value not in (None, '', 0) else None
        except (AttributeError, TypeError):
            return None

    class Meta:
        verbose_name = 'Объект размещения'
        verbose_name_plural = 'Объекты размещения'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.city})'


class Room(OrganizationScopedModel):
    """
    Комната внутри объекта размещения.
    Может быть дормом (несколько коек) или приватной.
    """
    ROOM_TYPES = [
        ('dorm', 'Дормитори'),
        ('private', 'Приватная'),
    ]

    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name='rooms', verbose_name='Объект'
    )
    name = models.CharField(max_length=100, verbose_name='Название комнаты')
    number = models.CharField(max_length=20, blank=True, verbose_name='Номер')
    room_type = models.CharField(
        max_length=20, choices=ROOM_TYPES, default='dorm', verbose_name='Тип'
    )
    floor = models.PositiveSmallIntegerField(default=1, verbose_name='Этаж')
    max_capacity = models.PositiveSmallIntegerField(default=4, verbose_name='Вместимость')
    description = models.TextField(blank=True, verbose_name='Описание')

    class Meta:
        verbose_name = 'Комната'
        verbose_name_plural = 'Комнаты'
        ordering = ['floor', 'name']

    def __str__(self):
        return f'{self.name} (этаж {self.floor})'


class Unit(OrganizationScopedModel):
    """
    Единица размещения — койко-место, кровать, комната, апартамент.
    Это то, что реально сдаётся гостю.
    """
    UNIT_TYPES = [
        ('bed', 'Койко-место'),
        ('private_room', 'Отдельная комната'),
        ('apartment', 'Апартамент'),
        ('studio', 'Студия'),
        ('family_room', 'Семейный номер'),
    ]

    STATUSES = [
        ('available', 'Свободно'),
        ('occupied', 'Занято'),
        ('reserved', 'Забронировано'),
        ('dirty', 'Требует уборки'),
        ('maintenance', 'Техобслуживание'),
        ('out_of_order', 'Выведено из эксплуатации'),
    ]

    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name='units', verbose_name='Комната'
    )
    name = models.CharField(max_length=100, verbose_name='Название')  # "Кровать 1", "Место А"
    unit_type = models.CharField(
        max_length=20, choices=UNIT_TYPES, default='bed', verbose_name='Тип'
    )
    status = models.CharField(
        max_length=20, choices=STATUSES, default='available', verbose_name='Статус'
    )
    description = models.TextField(blank=True, verbose_name='Описание')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок сортировки')

    class Meta:
        verbose_name = 'Юнит (место размещения)'
        verbose_name_plural = 'Юниты (места размещения)'
        ordering = ['room', 'sort_order', 'name']

    def __str__(self):
        return f'{self.name} / {self.room.name}'

    @property
    def is_available(self):
        return self.status == 'available'
