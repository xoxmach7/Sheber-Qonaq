from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from apps.users.jwt_auth import CaseInsensitiveTokenObtainPairView

urlpatterns = [
    path('login/', CaseInsensitiveTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
]
