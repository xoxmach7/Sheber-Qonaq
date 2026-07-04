import re
from django.db import models
from apps.core.models import TimestampedModel
from apps.core.encryption import encrypt_value, decrypt_value, hash_for_search


def normalize_phone(phone: str) -> str:
    """
    Нормализует телефон к последним 10 цифрам (KZ: национальный номер без
    кода страны/трункового префикса). '+7 707 123-45-67', '87071234567',
    '7 707 1234567' — всё сводится к одной строке '7071234567'.

    Why: сравнение точной строкой (`phone=phone`) тривиально обходится
    другим форматированием того же номера — гость из ЧС заселяется без
    предупреждения. Всё, что пишет БД (guest.phone/blacklist.phone),
    должно проходить через один и тот же нормализатор перед сравнением.
    """
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) == 11 and digits[0] in ('7', '8'):
        return digits[1:]
    return digits


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

    # Привязка к карточке гостя (нарушение конкретного гостя)
    guest = models.ForeignKey(
        'guests.Guest',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='violations',
        verbose_name='Гость',
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

        Телефон сравнивается по нормализованным цифрам (см. normalize_phone),
        а не точной строкой — иначе разное форматирование одного и того же
        номера (+7/8, пробелы, дефисы) тихо обходит проверку.
        """
        from apps.core.encryption import hash_for_search
        qs = cls.objects.filter(is_active=True)
        results = {}

        if iin:
            for e in qs.filter(iin_hash=hash_for_search(iin)):
                results[e.id] = e

        if phone:
            target = normalize_phone(phone)
            if target:
                for e in qs.exclude(phone=''):
                    if e.id not in results and normalize_phone(e.phone) == target:
                        results[e.id] = e

        return list(results.values())
