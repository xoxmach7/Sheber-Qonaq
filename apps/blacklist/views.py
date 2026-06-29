from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models
from apps.core.permissions import IsOwnerOrManager
from apps.notifications.models import Notification
from .models import BlacklistEntry
from .serializers import BlacklistEntrySerializer, BlacklistCheckInputSerializer


class BlacklistViewSet(viewsets.ModelViewSet):
    """
    Глобальный чёрный список нарушений.

    Видимость (вкладка «Нарушения»): своя организация видит СВОИ записи
    + подтверждённые (is_verified). Полный каталог чужих нарушителей не отдаётся.

    Чужие нарушения всплывают ТОЛЬКО при заселении — через /check/ по ИИН/телефону.

    Добавлять: владелец/администратор (owner/manager).
    Убирать (deactivate): только владелец (owner) той организации, что добавила запись.
    «Сообщить о проблеме»: любая организация → уведомление автору записи.
    """
    serializer_class = BlacklistEntrySerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['full_name', 'phone']
    filterset_fields = ['reason', 'is_verified']

    def get_queryset(self):
        qs = BlacklistEntry.objects.filter(is_active=True).order_by('-created_at')
        org_id = getattr(self.request.user, 'organization_id', None)
        # check/ работает по всей базе отдельно; список — свои + подтверждённые
        return qs.filter(models.Q(reported_by_id=org_id) | models.Q(is_verified=True))

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsOwnerOrManager()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user.organization)

    def destroy(self, request, *args, **kwargs):
        """Не удаляем — деактивируем. Только владелец организации-автора."""
        entry = self.get_object()
        user = request.user
        if entry.reported_by_id != getattr(user, 'organization_id', None):
            raise PermissionDenied('Убрать запись может только хостел, который её добавил.')
        if user.role not in ('superadmin', 'owner'):
            raise PermissionDenied('Убрать нарушение может только владелец хостела.')
        entry.is_active = False
        entry.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='report-problem')
    def report_problem(self, request, pk=None):
        """
        Сообщить о проблеме с записью (ошибка / неверно заполнено).
        Любая организация → уведомление организации-автору записи.
        POST { message?: "..." }
        """
        entry = self.get_object()
        message = (request.data.get('message') or '').strip()
        reporter = getattr(request.user.organization, 'name', 'Хостел')

        if entry.reported_by_id:
            body = f'{reporter} сообщает о возможной ошибке в записи «{entry.full_name}» ({entry.get_reason_display()}).'
            if message:
                body += f'\nКомментарий: {message}'
            Notification.objects.create(
                organization_id=entry.reported_by_id,
                type='info',
                title='Жалоба на запись в нарушениях',
                body=body,
                guest_name=entry.full_name,
            )
        return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def check(self, request):
        """
        Проверить гостя перед заселением.
        POST { iin: "...", phone: "..." }
        Возвращает { is_blacklisted: bool, entries: [...] }
        Ищет по всей базе (а не по ограниченному списку видимости).
        """
        serializer = BlacklistCheckInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entries = BlacklistEntry.check_guest(
            iin=serializer.validated_data.get('iin'),
            phone=serializer.validated_data.get('phone'),
        )
        return Response({
            'is_blacklisted': len(entries) > 0,
            'entries': BlacklistEntrySerializer(entries, many=True).data,
        })
