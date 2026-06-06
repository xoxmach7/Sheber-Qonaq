from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, ExpenseViewSet, FinanceSummaryView

router = DefaultRouter()
router.register('payments', PaymentViewSet, basename='payment')
router.register('expenses', ExpenseViewSet, basename='expense')

urlpatterns = router.urls + [
    path('summary/', FinanceSummaryView.as_view(), name='finance-summary'),
]
