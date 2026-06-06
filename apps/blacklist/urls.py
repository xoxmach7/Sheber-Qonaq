from rest_framework.routers import DefaultRouter
from .views import BlacklistViewSet

router = DefaultRouter()
router.register('blacklist', BlacklistViewSet, basename='blacklist')
urlpatterns = router.urls
