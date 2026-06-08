from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import StayViewSet, MpisPendingView

router = DefaultRouter()
router.register('stays', StayViewSet, basename='stay')

urlpatterns = router.urls + [
    path('mpis/pending/', MpisPendingView.as_view(), name='mpis-pending'),
]
