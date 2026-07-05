from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import ProtectedError
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

    def destroy(self, request, *args, **kwargs):
        """
        Умное удаление гостя:
          - нет связанных заселений -> удаляем физически;
          - есть история (Stay защищён PROTECT) -> архивируем (is_active=False),
            чтобы не потерять финансовую историю.
        """
        guest = self.get_object()
        if guest.stays.exists():
            guest.is_active = False
            guest.save(update_fields=['is_active'])
            return Response(
                {'detail': 'Гость архивирован: у него есть история заселений.',
                 'archived': True},
                status=status.HTTP_200_OK,
            )
        try:
            guest.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            guest.is_active = False
            guest.save(update_fields=['is_active'])
            return Response(
                {'detail': 'Гость архивирован: есть связанные записи.',
                 'archived': True},
                status=status.HTTP_200_OK,
            )

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
            full_name=serializer.validated_data.get('full_name'),
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
