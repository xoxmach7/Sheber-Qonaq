from django.db import models
from apps.core.models import TimestampedModel
from apps.core.encryption import encrypt_value, decrypt_value, hash_for_search


class BlacklistEntry(TimestampedModel):
    """
    Запись в чёрном списке.

    ВАЖНО: Это ГЛОБАЛЬНАЯ таблица — нет привязки к organization.
    Все хостелы платформы видят эти записи.
    Именно это создаёт сетевой эффект.

    ИИН шифруется. Поиск — по iin_hash и phone.
    """
    REASONS = [
        ('debt', 'Долг / не заплатил'),
        ('theft', 'Кража'),
        ('vandalism', 'Вандализм'),
        ('fraud', 'Мошенничество'),
        ('behavior', 'Нарушение порядка'),
        ('other', 'Другое'),
    ]

    # ИИН — зашифрован
    _iin_encrypted = models.CharField(
        max_length=500, blank=True, db_column='iin_encrypted'
    )
    iin_hash = models.CharField(
        max_length=64, blank=True, db_index=True, verbose_name='ИИН хэш'
    )

    phone = models.CharField(max_length=20, blank=True, db_index=True, verbose_name='Телефон')
    full_name = models.CharField(max_length=200, verbose_name='ФИО')

    reason = models.CharField(
        max_length=20, choices=REASONS, verbose_name='Причина'
    )
    description = models.TextField(blank=True, default='', verbose_name='Описание инцидента')
    evidence_url = models.URLField(blank=True, verbose_name='Ссылка на доказательство')

    # Кто добавил
    reported_by = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL, null=True,
        related_name='blacklist_reports',
        verbose_name='Добавлено организацией'
    )

    # is_verified = True когда запись подтверждена 2+ организациями
    is_verified = models.BooleanField(default=False, verbose_name='Подтверждено')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Запись в чёрном списке'
        verbose_name_plural = 'Чёрный список'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} — {self.get_reason_display()}'

    @property
    def iin(self):
        return decrypt_value(self._iin_encrypted)

    @iin.setter
    def iin(self, value):
        if value:
            self._iin_encrypted = encrypt_value(value.strip())
            self.iin_hash = hash_for_search(value.strip())
        else:
            self._iin_encrypted = ''
            self.iin_hash = ''

    @classmethod
    def check_guest(cls, iin: str = None, phone: str = None) -> list:
        """
        Проверить гостя по ИИН и/или телефону.
        Возвращает список активных записей или пустой список.
        """
        from apps.core.encryption import hash_for_search
        qs = cls.objects.filter(is_active=True)
        conditions = models.Q()

        if iin:
            conditions |= models.Q(iin_hash=hash_for_search(iin))
        if phone:
            conditions |= models.Q(phone=phone)

        if not conditions:
            return []

        return list(qs.filter(conditions))
