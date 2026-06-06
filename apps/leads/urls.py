from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, ViewingViewSet

router = DefaultRouter()
router.register('leads', LeadViewSet, basename='lead')
router.register('viewings', ViewingViewSet, basename='viewing')
urlpatterns = router.urls
