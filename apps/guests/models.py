from django.db import models
from apps.core.models import OrganizationScopedModel
from apps.core.encryption import encrypt_value, decrypt_value, hash_for_search


class Guest(OrganizationScopedModel):
    """
    Карточка гостя. ИИН хранится в зашифрованном виде.
    Поиск по ИИН — через iin_hash (SHA-256).
    """
    DOCUMENT_TYPES = [
        ('id_card', 'Удостоверение личности РК'),
        ('passport_kz', 'Паспорт РК'),
        ('passport_foreign', 'Иностранный паспорт'),
        ('residence_permit', 'ВНЖ'),
        ('other', 'Другое'),
    ]

    first_name = models.CharField(max_length=100, verbose_name='Имя')
    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    phone = models.CharField(max_length=20, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')

    # ИИН — шифруем при сохранении
    _iin_encrypted = models.CharField(
        max_length=500, blank=True, db_column='iin_encrypted', verbose_name='ИИН (зашифрован)'
    )
    # Хэш для поиска по ИИН (не позволяет восстановить ИИН, только сравнить)
    iin_hash = models.CharField(
        max_length=64, blank=True, db_index=True, verbose_name='ИИН хэш'
    )

    document_type = models.CharField(
        max_length=20, choices=DOCUMENT_TYPES, default='id_card', verbose_name='Тип документа'
    )
    document_number = models.CharField(max_length=50, blank=True, verbose_name='Номер документа')
    document_photo = models.ImageField(
        upload_to='documents/%Y/%m/', blank=True, null=True, verbose_name='Фото документа'
    )
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    city_of_origin = models.CharField(max_length=100, blank=True, verbose_name='Город')
    nationality = models.CharField(
        max_length=100, blank=True, verbose_name='Гражданство',
        help_text='Страна гражданства, напр. "Казахстан", "Россия", "Германия"'
    )
    is_foreigner = models.BooleanField(
        default=False, verbose_name='Иностранец',
        help_text='Требуется уведомление о прибытии в eQonaq'
    )

    # ── Данные для уведомления о прибытии / eQonaq (иностранные гости) ──
    SEX_CHOICES = [('M', 'Мужской'), ('F', 'Женский')]
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, blank=True, verbose_name='Пол')
    document_issue_date = models.DateField(null=True, blank=True, verbose_name='Дата выдачи документа')
    document_expiry_date = models.DateField(null=True, blank=True, verbose_name='Срок действия документа')
    entry_date = models.DateField(null=True, blank=True, verbose_name='Дата въезда в РК')
    migration_card_number = models.CharField(max_length=50, blank=True, verbose_name='Номер миграционной карты')

    notes = models.TextField(blank=True, verbose_name='Заметки')
    is_active = models.BooleanField(default=True, verbose_name='Активен')

    class Meta:
        verbose_name = 'Гость'
        verbose_name_plural = 'Гости'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name} {self.first_name} ({self.phone})'

    @property
    def full_name(self):
        parts = [self.last_name, self.first_name, self.middle_name]
        return ' '.join(p for p in parts if p)

    # ИИН — через property для прозрачного шифрования/дешифрования
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
