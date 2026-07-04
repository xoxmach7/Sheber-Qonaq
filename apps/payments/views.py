from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from datetime import date
from decimal import Decimal

from apps.core.mixins import OrganizationMixin
from apps.core.permissions import IsReception, CanManageFinances
from apps.stays.models import Stay
from .models import Payment, Expense
from .serializers import PaymentSerializer, ExpenseSerializer, FinanceSummarySerializer


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsReception]
    filterset_fields = ['stay', 'method', 'payment_date']
    ordering_fields = ['payment_date', 'amount']

    def get_permissions(self):
        # Удалять запись об оплате может только финансовая роль (owner/superadmin) —
        # иначе ресепшн мог бы стереть историю платежей и исказить баланс/долги.
        if self.action == 'destroy':
            return [IsAuthenticated(), CanManageFinances()]
        return super().get_permissions()

    def get_queryset(self):
        return Payment.objects.filter(
            stay__organization=self.request.user.organization
        ).select_related('stay__guest', 'received_by').order_by('-payment_date')

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)


class ExpenseViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, CanManageFinances]
    filterset_fields = ['category', 'property']
    ordering_fields = ['date', 'amount']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )


class FinanceSummaryView(APIView):
    """
    GET /api/v1/payments/summary/?month=2026-06
    Возвращает P&L за указанный месяц.
    """
    permission_classes = [IsAuthenticated, CanManageFinances]

    def get(self, request):
        month_param = request.query_params.get('month')
        try:
            if month_param:
                year, month = map(int, month_param.split('-'))
                period_start = date(year, month, 1)
            else:
                today = date.today()
                period_start = date(today.year, today.month, 1)
        except (ValueError, AttributeError):
            return Response({'error': 'Формат месяца: YYYY-MM'}, status=400)

        # Конец месяца
        import calendar
        last_day = calendar.monthrange(period_start.year, period_start.month)[1]
        period_end = date(period_start.year, period_start.month, last_day)

        org = request.user.organization

        # Доходы за период
        payments = Payment.objects.filter(
            stay__organization=org,
            payment_date__range=[period_start, period_end]
        )
        total_income = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        income_by_method = {}
        for method_data in payments.values('method').annotate(total=Sum('amount')):
            income_by_method[method_data['method']] = str(method_data['total'])

        # Расходы за период
        expenses = Expense.objects.filter(
            organization=org,
            date__range=[period_start, period_end]
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        expenses_by_category = {}
        for exp_data in expenses.values('category').annotate(total=Sum('amount')):
            expenses_by_category[exp_data['category']] = str(exp_data['total'])

        # Общий долг по всем активным проживаниям
        active_stays = Stay.objects.filter(organization=org, status='active')
        total_debt = sum(s.balance for s in active_stays if s.balance > 0)

        summary = {
            'period_start': period_start,
            'period_end': period_end,
            'income': total_income,
            'expenses': total_expenses,
            'net_profit': total_income - total_expenses,
            'total_debt': total_debt,
            'payments_count': payments.count(),
            'income_by_method': income_by_method,
            'expenses_by_category': expenses_by_category,
        }
        return Response(FinanceSummarySerializer(summary).data)
