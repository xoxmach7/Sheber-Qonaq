from rest_framework import serializers
from .models import Property, Room, Unit


class UnitSerializer(serializers.ModelSerializer):
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    status_display    = serializers.CharField(source='get_status_display', read_only=True)
    room_name         = serializers.CharField(source='room.name', read_only=True)
    current_guest     = serializers.SerializerMethodField()
    current_stay_id   = serializers.SerializerMethodField()
    current_guest_phone = serializers.SerializerMethodField()
    check_in          = serializers.SerializerMethodField()
    check_out         = serializers.SerializerMethodField()
    has_booking         = serializers.SerializerMethodField()
    next_check_in       = serializers.SerializerMethodField()
    next_check_out      = serializers.SerializerMethodField()
    next_booking_guest  = serializers.SerializerMethodField()
    next_booking_status = serializers.SerializerMethodField()
    next_stay_id        = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id', 'name', 'unit_type', 'unit_type_display',
            'status', 'status_display', 'description', 'sort_order',
            'room', 'room_name', 'current_guest', 'current_stay_id',
            'current_guest_phone', 'check_in', 'check_out',
            'has_booking', 'next_check_in', 'next_check_out',
            'next_booking_guest', 'next_booking_status', 'next_stay_id',
        ]
        read_only_fields = ['id']

    def validate_room(self, value):
        # Межарендная защита: комната должна принадлежать организации пользователя.
        request = self.context.get('request')
        org = getattr(getattr(request, 'user', None), 'organization', None)
        if org and value.organization_id != org.id:
            raise serializers.ValidationError('Комната не найдена.')
        return value

    def _all_stays(self, obj):
        # Если stays уже prefetch'нуты (список Unit из UnitViewSet), .all() отдаёт
        # их из кэша без запроса к БД. .filter() на менеджере, наоборот, ВСЕГДА
        # бьёт в базу заново — даже если prefetch_related был на queryset'е выше.
        # Поэтому здесь фильтруем в Python, а не через .filter().
        return list(obj.stays.all())

    def _active_stay(self, obj):
        if obj.status != 'occupied':
            return None
        if not hasattr(self, '_active_stay_cache'):
            self._active_stay_cache = {}
        if obj.pk not in self._active_stay_cache:
            self._active_stay_cache[obj.pk] = next(
                (s for s in self._all_stays(obj) if s.status == 'active'), None
            )
        return self._active_stay_cache[obj.pk]

    def get_current_guest(self, obj):
        stay = self._active_stay(obj)
        return stay.guest.full_name if stay else None

    def get_current_stay_id(self, obj):
        stay = self._active_stay(obj)
        return stay.id if stay else None

    def get_current_guest_phone(self, obj):
        stay = self._active_stay(obj)
        return stay.guest.phone if stay else None

    def get_check_in(self, obj):
        stay = self._active_stay(obj)
        return str(stay.check_in_date) if stay else None

    def get_check_out(self, obj):
        stay = self._active_stay(obj)
        return str(stay.expected_check_out_date) if stay else None

    def _next_booking(self, obj):
        """Ближайшая будущая/текущая бронь (reserved/confirmed), не считая заселения."""
        if not hasattr(obj, '_next_booking_cache'):
            from datetime import date
            today = date.today()
            candidates = [
                s for s in self._all_stays(obj)
                if s.status in ('reserved', 'confirmed')
                and s.shift_type is None
                and s.expected_check_out_date >= today
            ]
            candidates.sort(key=lambda s: s.check_in_date)
            obj._next_booking_cache = candidates[0] if candidates else None
        return obj._next_booking_cache

    def get_has_booking(self, obj):
        return self._next_booking(obj) is not None

    def get_next_check_in(self, obj):
        b = self._next_booking(obj)
        return str(b.check_in_date) if b else None

    def get_next_check_out(self, obj):
        b = self._next_booking(obj)
        return str(b.expected_check_out_date) if b else None

    def get_next_booking_guest(self, obj):
        b = self._next_booking(obj)
        return b.guest.full_name if b else None

    def get_next_booking_status(self, obj):
        b = self._next_booking(obj)
        return b.status if b else None

    def get_next_stay_id(self, obj):
        b = self._next_booking(obj)
        return b.id if b else None


class UnitStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Unit.STATUSES)


class RoomSerializer(serializers.ModelSerializer):
    units = UnitSerializer(many=True, read_only=True)
    units_count = serializers.IntegerField(source='units.count', read_only=True)
    available_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'name', 'number', 'room_type', 'floor',
                  'max_capacity', 'description', 'property',
                  'units', 'units_count', 'available_count']
        read_only_fields = ['id']

    def get_available_count(self, obj):
        return obj.units.filter(status='available').count()

    def validate_property(self, value):
        # Межарендная защита: объект размещения должен принадлежать организации пользователя.
        request = self.context.get('request')
        org = getattr(getattr(request, 'user', None), 'organization', None)
        if org and value.organization_id != org.id:
            raise serializers.ValidationError('Объект не найден.')
        return value


class PropertySerializer(serializers.ModelSerializer):
    rooms_count = serializers.IntegerField(source='rooms.count', read_only=True)

    class Meta:
        model = Property
        fields = ['id', 'name', 'address', 'city', 'description',
                  'is_active', 'booking_mode', 'shift_rates', 'base_rates',
                  'rooms_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class OccupancySerializer(serializers.ModelSerializer):
    """Карта занятости для дашборда."""
    rooms = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()
    occupied_units = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = ['id', 'name', 'rooms', 'total_units',
                  'occupied_units', 'occupancy_rate']

    def get_rooms(self, obj):
        return RoomSerializer(obj.rooms.prefetch_related('units'), many=True).data

    def get_total_units(self, obj):
        return Unit.objects.filter(room__property=obj).count()

    def get_occupied_units(self, obj):
        return Unit.objects.filter(room__property=obj, status='occupied').count()

    def get_occupancy_rate(self, obj):
        total = self.get_total_units(obj)
        if not total:
            return 0
        return round(self.get_occupied_units(obj) / total * 100, 1)
