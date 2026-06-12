"""
Dashboard — главный экран приложения.
Один запрос возвращает всё что нужно владельцу при открытии приложения.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from decimal import Decimal

from apps.properties.models import Unit, Property
from apps.stays.models import Stay
from apps.payments.models import Payment, Expense
from apps.leads.models import Viewing
from apps.blacklist.models import BlacklistEntry


class DashboardView(APIView):
    """
    GET /api/v1/dashboard/
    Полная сводка для главного экрана. Всё в одном запросе.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        today = date.today()
        month_start = today.replace(day=1)

        # ── 1. ЗАПОЛНЯЕМОСТЬ ─────────────────────────────────────────────────
        units = Unit.objects.filter(room__property__organization=org)
        unit_stats = units.values('status').annotate(count=Count('id'))
        status_map = {s['status']: s['count'] for s in unit_stats}

        total_units = units.count()
        occupied = status_map.get('occupied', 0)
        available = status_map.get('available', 0)
        reserved = status_map.get('reserved', 0)
        dirty = status_map.get('dirty', 0)
        maintenance = status_map.get('maintenance', 0)
        occupancy_rate = round(occupied / total_units * 100, 1) if total_units else 0

        # ── 2. ФИНАНСЫ МЕСЯЦА ────────────────────────────────────────────────
        payments_month = Payment.objects.filter(
            stay__organization=org,
            payment_date__gte=month_start,
            payment_date__lte=today,
        )
        income_month = payments_month.aggregate(t=Sum('amount'))['t'] or Decimal('0')

        expenses_month = Expense.objects.filter(
            organization=org,
            date__gte=month_start,
            date__lte=today,
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

        net_profit = income_month - expenses_month

        # ── 3. ДОЛГИ АКТИВНЫХ ГОСТЕЙ ─────────────────────────────────────────
        active_stays = Stay.objects.filter(
            organization=org, status='active'
        ).select_related('guest', 'unit')

        debtors = []
        total_debt = Decimal('0')
        for stay in active_stays:
            bal = stay.balance
            if bal > Decimal('0'):
                total_debt += bal
                debtors.append({
                    'stay_id': stay.id,
                    'guest_name': stay.guest.full_name,
                    'guest_phone': stay.guest.phone,
                    'unit_name': stay.unit.name,
                    'debt': str(bal),
                })

        # ── 4. СОБЫТИЯ СЕГОДНЯ ───────────────────────────────────────────────
        # Выезжают сегодня
        checkouts_today = active_stays.filter(
            expected_check_out_date=today
        ).values(
            'id', 'guest__first_name', 'guest__last_name',
            'guest__phone', 'unit__name',
        )

        # Заезжают сегодня (статус active, заселились сегодня)
        checkins_today = Stay.objects.filter(
            organization=org,
            check_in_date=today,
        ).values(
            'id', 'guest__first_name', 'guest__last_name',
            'guest__phone', 'unit__name', 'status',
        )

        # Показы сегодня
        viewings_today = Viewing.objects.filter(
            lead__organization=org,
            scheduled_at__date=today,
        ).values(
            'id', 'lead__name', 'lead__phone',
            'scheduled_at', 'outcome',
        )

        # ── 5. ПРЕДУПРЕЖДЕНИЯ ────────────────────────────────────────────────
        # Заканчиваются через ≤3 дня
        expiring_count = active_stays.filter(
            expected_check_out_date__lte=today + timedelta(days=3),
            expected_check_out_date__gt=today,
        ).count()

        # MPIS: иностранцы без подтверждённой регистрации
        mpis_pending_count = Stay.objects.filter(
            organization=org,
            status='active',
            guest__is_foreigner=True,
            mpis_status__in=['pending', 'submitted'],
        ).count()

        # Режим бронирования — берём из первого активного Property организации
        first_property = Property.objects.filter(organization=org, is_active=True).first()
        property_mode = first_property.booking_mode if first_property else 'hostel'

        return Response({
            'date': today,
            'month': today.strftime('%Y-%m'),
            'property_mode': property_mode,

            'occupancy': {
                'total': total_units,
                'occupied': occupied,
                'available': available,
                'reserved': reserved,
                'dirty': dirty,
                'maintenance': maintenance,
                'rate': occupancy_rate,
            },

            'finances': {
                'income_this_month': income_month,
                'expenses_this_month': expenses_month,
                'net_profit': net_profit,
                'total_active_debt': total_debt,
                'debtors_count': len(debtors),
            },

            'today': {
                'checkouts': list(checkouts_today),
                'checkins': list(checkins_today),
                'viewings': list(viewings_today),
            },

            'alerts': {
                'expiring_soon_count': expiring_count,
                'mpis_pending_count': mpis_pending_count,
                'debtors': debtors[:5],   # топ-5 должников
            },
        })
