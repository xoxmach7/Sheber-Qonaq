from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Кастомная модель пользователя с ролями и привязкой к организации.
    """
    ROLES = [
        ('superadmin', 'SuperAdmin'),
        ('owner', 'Владелец'),
        ('manager', 'Менеджер'),
        ('reception', 'Ресепшн'),
        ('housekeeping', 'Горничная'),
        ('maintenance', 'Техник'),
        ('accountant', 'Бухгалтер'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users',
        verbose_name='Организация',
    )
    role = models.CharField(
        max_length=20, choices=ROLES, default='reception', verbose_name='Роль'
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_role_display()})'

    @property
    def is_owner_or_manager(self):
        return self.role in ('superadmin', 'owner', 'manager')

    @property
    def can_manage_finances(self):
        return self.role in ('superadmin', 'owner', 'manager', 'accountant')
