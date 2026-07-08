from django.urls import path
from .views import OrganizationDetailView
from .onboarding import OnboardingView
from .signup import SignupRequestView

urlpatterns = [
    path('me/', OrganizationDetailView.as_view(), name='organization-me'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('signup/', SignupRequestView.as_view(), name='signup'),
]
