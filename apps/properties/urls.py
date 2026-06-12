from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, RoomViewSet, UnitViewSet

router = DefaultRouter()
router.register('properties', PropertyViewSet, basename='property')
router.register('rooms', RoomViewSet, basename='room')
router.register('units', UnitViewSet, basename='unit')
urlpatterns = router.urls
