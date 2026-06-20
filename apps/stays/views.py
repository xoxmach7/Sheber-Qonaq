from decimal import Decimal
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
        # Продление не должно наезжать на следующую бронь этого юнита
        if Stay.overlapping(stay.unit, stay.check_in_date, new_date, exclude_pk=stay.id).exists():
            return Response(
                {'error': 'Продление пересекается с другой бронью на этом юните.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        stay.expected_check_out_date = new_date
        if serializer.validated_data.get('notes'):
            stay.notes = (stay.notes + '\nПродление: ' + serializer.validated_data['notes']).strip()
        stay.save(update_fields=['expected_check_out_date', 'notes'])

        return Response(StaySerializer(stay, context={'request': request}).data)

    # ── Стейт-машина брони: reserved → confirmed → active → checked_out ──

    def _stay_response(self, stay):
        return Response(StaySerializer(stay, context={'request': self.request}).data)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Подтвердить бронь (reserved → confirmed).
        Требует предоплату не меньше organization.deposit_percent от суммы брони.
        """
        stay = self.get_object()
        if stay.status != 'reserved':
            return Response(
                {'error': 'Подтвердить можно только бронь в статусе «резерв».'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        percent = stay.organization.deposit_percent or Decimal('0')
        required = (percent * stay.total_expected).quantize(Decimal('1'))
        if stay.total_paid < required:
            return Response(
                {
                    'error': f'Нужна предоплата не меньше {required} ₸ '
                             f'({int(percent * 100)}%). Оплачено {stay.total_paid:.0f} ₸.',
                    'required': str(required),
                    'paid': str(stay.total_paid),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        stay.status = 'confirmed'
        stay.save(update_fields=['status'])
        return self._stay_response(stay)

    @action(detail=True, methods=['post'], url_path='check-in')
    @transaction.atomic
    def check_in(self, request, pk=None):
        """Заселить гостя (reserved/confirmed → active)."""
        stay = self.get_object()
        if stay.status not in ('reserved', 'confirmed'):
            return Response(
                {'error': 'Заселить можно только бронь в статусе «резерв» или «подтверждено».'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stay.status = 'active'
        stay.save(update_fields=['status'])
        # Операционно помечаем юнит занятым (для hostel-режима)
        if not stay.shift_type and stay.unit.status == 'available':
            stay.unit.status = 'occupied'
            stay.unit.save(update_fields=['status'])
        return self._stay_response(stay)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Отменить бронь (любой незавершённый статус → cancelled)."""
        stay = self.get_object()
        if stay.status in ('checked_out', 'cancelled', 'no_show', 'expired'):
            return Response(
                {'error': 'Нельзя отменить завершённую бронь.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        was_active = stay.status == 'active'
        if request.data.get('notes'):
            stay.notes = (stay.notes + '\nОтмена: ' + request.data['notes']).strip()
        stay.status = 'cancelled'
        stay.save(update_fields=['status', 'notes'])
        # Если гость был заселён — освобождаем юнит
        if was_active and not stay.shift_type and stay.unit.status == 'occupied':
            stay.unit.status = 'available'
            stay.unit.save(update_fields=['status'])
        return self._stay_response(stay)

    @action(detail=True, methods=['post'], url_path='no-show')
    def no_show(self, request, pk=None):
        """Гость не явился (reserved/confirmed → no_show)."""
        stay = self.get_object()
        if stay.status not in ('reserved', 'confirmed'):
            return Response(
                {'error': 'Отметить неявку можно только для брони/подтверждённой брони.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stay.status = 'no_show'
        stay.save(update_fields=['status'])
        return self._stay_response(stay)

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


    @action(detail=False, methods=['get'], url_path='cottage-calendar')
    def cottage_calendar(self, request):
        """
        GET /api/v1/stays/cottage-calendar/?unit=<id>&month=2026-06
        Возвращает доступность смен по каждому дню месяца для cottage-режима.
        Формат ответа:
        {
          "unit_id": 5,
          "month": "2026-06",
          "days": {
            "2026-06-01": {"day": null, "night": null, "full": null},
            "2026-06-02": {"day": {"stay_id":12,"guest":"Иванов А."}, "night": null, "full": null},
            ...
          }
        }
        null = свободно, объект = занято (с данными бронирования).
        """
        from datetime import date, timedelta
        import calendar as cal

        unit_id = request.query_params.get('unit')
        month_str = request.query_params.get('month')  # "2026-06"

        if not unit_id or not month_str:
            return Response({'error': 'Параметры unit и month обязательны.'}, status=400)

        try:
            year, month = map(int, month_str.split('-'))
        except ValueError:
            return Response({'error': 'Формат month: YYYY-MM'}, status=400)

        # Первый и последний день месяца
        first_day = date(year, month, 1)
        last_day = date(year, month, cal.monthrange(year, month)[1])

        # Все активные stays для этого unit в этом месяце
        stays = self.get_queryset().filter(
            unit_id=unit_id,
            status='active',
            check_in_date__range=[first_day, last_day],
            shift_type__isnull=False,  # только cottage-смены
        ).select_related('guest')

        # Индексируем по дате + типу смены
        booked = {}
        for s in stays:
            key = str(s.check_in_date)
            if key not in booked:
                booked[key] = {}
            booked[key][s.shift_type] = {
                'stay_id': s.id,
                'guest': s.guest.full_name,
                'guest_phone': s.guest.phone,
            }

        # Строим ответ по всем дням месяца
        days = {}
        current = first_day
        while current <= last_day:
            key = str(current)
            day_bookings = booked.get(key, {})
            days[key] = {
                'day':   day_bookings.get('day'),
                'night': day_bookings.get('night'),
                'full':  day_bookings.get('full'),
            }
            current += timedelta(days=1)

        return Response({
            'unit_id': int(unit_id),
            'month': month_str,
            'days': days,
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
