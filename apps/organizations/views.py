from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsOwnerOrManager
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationDetailView(generics.RetrieveUpdateAPIView):
    """Владелец видит и редактирует только свою организацию."""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get_object(self):
        return self.request.user.organization
