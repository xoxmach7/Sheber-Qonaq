from django.urls import path
from .views import OrganizationDetailView

urlpatterns = [
    path('me/', OrganizationDetailView.as_view(), name='organization-me'),
]
