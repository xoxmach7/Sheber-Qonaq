from django.contrib import admin
from .models import Property, Room, Unit

class UnitInline(admin.TabularInline):
    model = Unit
    extra = 1
    fields = ['name', 'unit_type', 'status', 'sort_order']

class RoomInline(admin.TabularInline):
    model = Room
    extra = 1
    show_change_link = True

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'organization', 'is_active']
    list_filter = ['city', 'is_active', 'organization']
    search_fields = ['name', 'address']

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'property', 'room_type', 'floor', 'max_capacity']
    list_filter = ['room_type', 'floor', 'property']
    search_fields = ['name', 'number']
    inlines = [UnitInline]

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'room', 'unit_type', 'status']
    list_filter = ['status', 'unit_type', 'room__property']
    search_fields = ['name']
