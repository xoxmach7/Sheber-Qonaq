from django.urls import path
from .views import OrganizationDetailView
from .onboarding import OnboardingView
from .signup import SignupRequestView, SignupConfirmView, SignupResendView

urlpatterns = [
    path('me/', OrganizationDetailView.as_view(), name='organization-me'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('signup/', SignupRequestView.as_view(), name='signup'),
    path('signup/resend/', SignupResendView.as_view(), name='signup-resend'),
    path('signup/confirm/<uuid:token>/', SignupConfirmView.as_view(), name='signup-confirm'),
]
