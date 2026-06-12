from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsReception, IsOwnerOrManager
from .models import BlacklistEntry
from .serializers import BlacklistEntrySerializer, BlacklistCheckInputSerializer


class BlacklistViewSet(viewsets.ModelViewSet):
    """
    Глобальный чёрный список — виден всем организациям.
    Добавлять и деактивировать может только владелец/менеджер.
    """
    queryset = BlacklistEntry.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = BlacklistEntrySerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['full_name', 'phone']
    filterset_fields = ['reason', 'is_verified']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsOwnerOrManager()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user.organization)

    def destroy(self, request, *args, **kwargs):
        """Не удаляем — деактивируем."""
        entry = self.get_object()
        entry.is_active = False
        entry.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def check(self, request):
        """
        Проверить гостя перед заселением.
        POST { iin: "...", phone: "..." }
        Возвращает { is_blacklisted: bool, entries: [...] }
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
