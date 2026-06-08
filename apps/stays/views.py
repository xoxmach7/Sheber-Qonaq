from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from apps.core.mixins import OrganizationMixin
from apps.core.permissions import IsReception, IsOwnerOrManager
from .models import Stay
from .serializers import (
    StaySerializer, CheckOutSerializer, ExtendStaySerializer,
    MpisStatusSerializer, MpisPendingStaySerializer,
)


class StayViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Stay.objects.select_related('guest', 'unit__room__property').all()
    serializer_class = StaySerializer
    permission_classes = [IsAuthenticated, IsReception]
    filterset_fields = ['status', 'unit', 'guest', 'rate_type', 'source']
    search_fields = ['guest__first_name', 'guest__last_name', 'guest__phone', 'notes']
    ordering_fields = ['check_in_date', 'expected_check_out_date', 'created_at']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def checkout(self, request, pk=None):
        """
        Выселение гостя. Освобождает юнит.
        Атомарно: Stay и Unit обновляются в одной транзакции.
        """
        stay = self.get_object()
        if stay.status != 'active':
            return Response(
                {'error': 'Проживание уже завершено или отменено.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        stay.actual_check_out_date = (
            serializer.validated_data.get('actual_check_out_date')
            or timezone.now().date()
        )
        if serializer.validated_data.get('notes'):
            stay.notes = (stay.notes + '\n' + serializer.validated_data['notes']).strip()
        stay.status = 'checked_out'
        stay.save(update_fields=['status', 'actual_check_out_date', 'notes'])

        # Освобождаем юнит — ставим статус "требует уборки".
        # В той же транзакции: если save() упадёт — Stay тоже откатится.
        stay.unit.status = 'dirty'
        stay.unit.save(update_fields=['status'])

        return Response(StaySerializer(stay, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """Продление проживания — сдвигаем дату выселения."""
        stay = self.get_object()
        if stay.status != 'active':
            return Response(
                {'error': 'Нельзя продлить завершённое проживание.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ExtendStaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_date = serializer.validated_data['new_check_out_date']
        if new_date <= stay.expected_check_out_date:
            return Response(
                {'error': 'Новая дата должна быть позже текущей.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        stay.expected_check_out_date = new_date
        if serializer.validated_data.get('notes'):
            stay.notes = (stay.notes + '\nПродление: ' + serializer.validated_data['notes']).strip()
        stay.save(update_fields=['expected_check_out_date', 'notes'])

        return Response(StaySerializer(stay, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Все активные проживания — для дашборда."""
        qs = self.get_queryset().filter(status='active').order_by('expected_check_out_date')
        return Response(StaySerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Проживания которые заканчиваются в ближайшие 7 дней."""
        from datetime import date, timedelta
        today = date.today()
        week_later = today + timedelta(days=7)
        qs = self.get_queryset().filter(
            status='active',
            expected_check_out_date__range=[today, week_later]
        ).order_by('expected_check_out_date')
        return Response(StaySerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='mpis')
    def update_mpis(self, request, pk=None):
        """Обновить MPIS-статус заезда."""
        stay = self.get_object()
        serializer = MpisStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stay.mpis_status = serializer.validated_data['mpis_status']
        stay.save(update_fields=['mpis_status'])
        return Response({
            'id': stay.id,
            'mpis_status': stay.mpis_status,
            'mpis_status_display': stay.get_mpis_status_display(),
        })


class MpisPendingView(APIView):
    """
    GET /api/v1/mpis/pending/
    Список активных заездов иностранцев с незавершённой регистрацией MPIS.
    """
    permission_classes = [IsAuthenticated, IsReception]

    def get(self, request):
        org = request.user.organization
        qs = Stay.objects.select_related(
            'guest', 'unit__room__property'
        ).filter(
            organization=org,
            status='active',
            guest__is_foreigner=True,
            mpis_status__in=['pending', 'submitted'],
        ).order_by('check_in_date')

        serializer = MpisPendingStaySerializer(qs, many=True, context={'request': request})
        return Response({
            'count': qs.count(),
            'results': serializer.data,
        })
