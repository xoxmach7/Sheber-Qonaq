from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.mixins import OrganizationMixin
from apps.core.permissions import IsReception
from apps.core.encryption import hash_for_search
from apps.blacklist.models import BlacklistEntry
from apps.blacklist.serializers import BlacklistEntrySerializer
from .models import Guest
from .serializers import GuestSerializer, BlacklistCheckSerializer


class GuestViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    permission_classes = [IsAuthenticated, IsReception]
    search_fields = ['first_name', 'last_name', 'phone']
    filterset_fields = ['is_active']
    ordering_fields = ['last_name', 'created_at']

    @action(detail=False, methods=['post'])
    def check_blacklist(self, request):
        """
        Проверить гостя по ИИН и/или телефону перед заселением.
        Используется при регистрации нового гостя.
        """
        serializer = BlacklistCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entries = BlacklistEntry.check_guest(
            iin=serializer.validated_data.get('iin'),
            phone=serializer.validated_data.get('phone'),
        )

        return Response({
            'is_blacklisted': len(entries) > 0,
            'entries': BlacklistEntrySerializer(entries, many=True).data,
        })

    @action(detail=False, methods=['post'])
    def search_by_iin(self, request):
        """Поиск гостя по ИИН (внутри организации)."""
        iin = request.data.get('iin', '').strip()
        if not iin:
            return Response({'error': 'ИИН не указан.'}, status=400)
        iin_hash = hash_for_search(iin)
        guests = self.get_queryset().filter(iin_hash=iin_hash)
        return Response(GuestSerializer(guests, many=True, context={'request': request}).data)
