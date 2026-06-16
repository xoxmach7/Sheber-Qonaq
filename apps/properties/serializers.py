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

    class Meta:
        model = Unit
        fields = [
            'id', 'name', 'unit_type', 'unit_type_display',
            'status', 'status_display', 'description', 'sort_order',
            'room', 'room_name', 'current_guest', 'current_stay_id',
            'current_guest_phone', 'check_in', 'check_out',
        ]
        read_only_fields = ['id']

    def _active_stay(self, obj):
        if obj.status == 'occupied':
            return obj.stays.filter(status='active').select_related('guest').first()
        return None

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


class PropertySerializer(serializers.ModelSerializer):
    rooms_count = serializers.IntegerField(source='rooms.count', read_only=True)

    class Meta:
        model = Property
        fields = ['id', 'name', 'address', 'city', 'description',
                  'is_active', 'booking_mode', 'shift_rates',
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
