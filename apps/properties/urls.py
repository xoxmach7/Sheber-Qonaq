from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, RoomViewSet, UnitViewSet
from .setup import RoomsSetupView

router = DefaultRouter()
router.register('properties', PropertyViewSet, basename='property')
router.register('rooms', RoomViewSet, basename='room')
router.register('units', UnitViewSet, basename='unit')
urlpatterns = [
    path('setup-rooms/', RoomsSetupView.as_view(), name='setup-rooms'),
] + router.urls
