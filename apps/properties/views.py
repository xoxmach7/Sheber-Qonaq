from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.mixins import OrganizationMixin
from apps.core.permissions import IsOwnerOrManager, IsReception, CanUpdateUnitStatus
from .models import Property, Room, Unit
from .serializers import (
    PropertySerializer, RoomSerializer, UnitSerializer,
    UnitStatusSerializer, OccupancySerializer
)


class UnitPagination(PageNumberPagination):
    """
    Карта размещения (Occupancy) грузит все юниты одним запросом
    (`propertiesApi.allUnits`) и группирует их по комнатам на фронте — это
    не постраничный список для скролла, а карта целиком.

    Why: глобальный DEFAULT_PAGINATION_CLASS/PAGE_SIZE=50 обрезал ответ
    `/units/` на 50 записях. У аккаунтов с >50 местами (несколько комнат/
    объектов) часть коек — обычно именно свободные, идущие после занятых
    по id — просто не попадала в ответ и молча пропадала с карты
    («свободные места не показываются в блоке комнаты»).
    """
    page_size = 1000


class PropertyViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsOwnerOrManager()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def occupancy(self, request, pk=None):
        """Карта занятости объекта — для главного экрана."""
        prop = self.get_object()
        return Response(OccupancySerializer(prop).data)


class RoomViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Room.objects.prefetch_related('units').all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['property', 'room_type', 'floor']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsOwnerOrManager()]
        return [IsAuthenticated()]


class UnitViewSet(OrganizationMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.select_related('room__property').prefetch_related(
        'stays__guest'
    ).all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['room', 'status', 'unit_type']
    pagination_class = UnitPagination

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAuthenticated(), IsOwnerOrManager()]
        if self.action == 'set_status':
            return [IsAuthenticated(), CanUpdateUnitStatus()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'])
    def set_status(self, request, pk=None):
        """Быстрое обновление статуса койки (ресепшн, горничная, техник и выше)."""
        unit = self.get_object()
        serializer = UnitStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit.status = serializer.validated_data['status']
        unit.save(update_fields=['status'])
        return Response(UnitSerializer(unit).data)
