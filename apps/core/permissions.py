"""
RBAC — права доступа по ролям.
Используются во всех ViewSet'ах.
"""
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


class BelongsToOrganization(BasePermission):
    """Объект должен принадлежать организации пользователя."""
    def has_object_permission(self, request, view, obj):
        org_id = getattr(obj, 'organization_id', None)
        if org_id is None:
            # для Stay проверяем через unit
            org_id = getattr(getattr(obj, 'stay', None), 'organization_id', None)
        return org_id == request.user.organization_id
