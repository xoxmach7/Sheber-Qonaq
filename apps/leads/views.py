from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.core.mixins import OrganizationMixin
from apps.core.permissions import IsReception
from .models import Lead, Viewing
from .serializers import LeadSerializer, ViewingSerializer, LeadStatusSerializer


class LeadViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Lead.objects.prefetch_related('viewings').all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, IsReception]
    filterset_fields = ['status', 'source']
    search_fields = ['name', 'phone', 'notes']
    ordering_fields = ['created_at', 'status']

    @action(detail=True, methods=['patch'])
    def set_status(self, request, pk=None):
        """Обновить статус лида в воронке."""
        lead = self.get_object()
        serializer = LeadStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead.status = serializer.validated_data['status']
        if serializer.validated_data.get('notes'):
            lead.notes = (lead.notes + '\n' + serializer.validated_data['notes']).strip()
        lead.save(update_fields=['status', 'notes'])
        return Response(LeadSerializer(lead, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def schedule_viewing(self, request, pk=None):
        """Назначить показ и запланировать напоминание."""
        lead = self.get_object()
        serializer = ViewingSerializer(data={**request.data, 'lead': lead.id})
        serializer.is_valid(raise_exception=True)
        viewing = serializer.save()

        # Обновляем статус лида
        lead.status = 'viewing_scheduled'
        lead.save(update_fields=['status'])

        # Планируем Celery напоминание
        try:
            from apps.notifications.tasks import send_viewing_reminder
            send_viewing_reminder.apply_async(
                args=[viewing.id],
                eta=viewing.scheduled_at - timezone.timedelta(hours=1),
            )
        except Exception:
            pass  # Если Celery недоступен — не блокируем

        return Response(ViewingSerializer(viewing).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def today_viewings(self, request):
        """Показы на сегодня."""
        today = timezone.now().date()
        viewings = Viewing.objects.filter(
            lead__organization=request.user.organization,
            scheduled_at__date=today,
        ).order_by('scheduled_at')
        return Response(ViewingSerializer(viewings, many=True).data)


class ViewingViewSet(viewsets.ModelViewSet):
    serializer_class = ViewingSerializer
    permission_classes = [IsAuthenticated, IsReception]

    def get_queryset(self):
        return Viewing.objects.filter(
            lead__organization=self.request.user.organization
        ).select_related('lead').order_by('scheduled_at')

    @action(detail=True, methods=['patch'])
    def set_outcome(self, request, pk=None):
        """Зафиксировать результат показа."""
        viewing = self.get_object()
        outcome = request.data.get('outcome')
        if outcome not in dict(Viewing.OUTCOMES):
            return Response({'error': 'Неверный outcome.'}, status=400)
        viewing.outcome = outcome
        viewing.conducted_at = timezone.now()
        viewing.notes = request.data.get('notes', viewing.notes)
        viewing.save(update_fields=['outcome', 'conducted_at', 'notes'])

        # Обновляем статус лида
        if outcome == 'interested':
            viewing.lead.status = 'negotiating'
            viewing.lead.save(update_fields=['status'])
        elif outcome == 'not_interested':
            viewing.lead.status = 'lost'
            viewing.lead.save(update_fields=['status'])
        elif outcome == 'no_show':
            viewing.lead.status = 'viewed'
            viewing.lead.save(update_fields=['status'])

        return Response(ViewingSerializer(viewing).data)
