"""
RBAC — права доступа по ролям.
Используются во всех ViewSet'ах.
"""
from django.utils import timezone
from rest_framework.permissions import BasePermission

OWNER_ROLES = ('superadmin', 'owner')
MANAGER_ROLES = ('superadmin', 'owner', 'manager')
# Финансы видит только владелец (и суперадмин платформы)
FINANCE_ROLES = ('superadmin', 'owner')
RECEPTION_ROLES = ('superadmin', 'owner', 'manager', 'reception')


class IsOwnerOrManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in MANAGER_ROLES)


class CanManageFinances(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in FINANCE_ROLES)


class IsReception(BasePermission):
    """Ресепшн и выше могут заселять/выселять."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in RECEPTION_ROLES)


# Кто по должности реально меняет статус юнита: ресепшн (заселение/выселение),
# горничная (уборка) и техник (ремонт/закрытие юнита). Бухгалтеру это не нужно —
# раньше эндпоинт был открыт для ЛЮБОЙ роли в организации без проверки.
UNIT_STATUS_ROLES = RECEPTION_ROLES + ('housekeeping', 'maintenance')


class CanUpdateUnitStatus(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in UNIT_STATUS_ROLES)


class BelongsToOrganization(BasePermission):
    """Объект должен принадлежать организации пользователя."""
    def has_object_permission(self, request, view, obj):
        org_id = getattr(obj, 'organization_id', None)
        if org_id is None:
            # для Stay проверяем через unit
            org_id = getattr(getattr(obj, 'stay', None), 'organization_id', None)
        return org_id == request.user.organization_id


SAFE_METHODS_READONLY = ('GET', 'HEAD', 'OPTIONS')


class TrialNotExpired(BasePermission):
    """
    Блокирует изменяющие запросы (POST/PUT/PATCH/DELETE), если у организации
    истёк триал (trial_ends_at в прошлом) и нет активной оплаченной подписки.
    Организации без trial_ends_at (созданные вручную через /onboarding/) не ограничены.
    """
    message = 'Пробный период закончился. Доступ только для просмотра. Свяжитесь с нами для подключения подписки.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS_READONLY:
            return True
        org = getattr(request.user, 'organization', None)
        if org is None or org.trial_ends_at is None:
            return True
        return timezone.now() <= org.trial_ends_at
