from django.contrib import admin
from django.utils.html import format_html
from .models import Property, Room, Unit


class UnitInline(admin.TabularInline):
    model = Unit
    extra = 0
    fields = ['name', 'unit_type', 'status', 'sort_order']
    ordering = ['sort_order']

    def get_extra(self, request, obj=None, **kwargs):
        return 0 if obj and obj.units.exists() else 3


class RoomInline(admin.TabularInline):
    model = Room
    extra = 1
    fields = ['name', 'room_type', 'floor', 'max_capacity']
    show_change_link = True

    def save_model(self, request, obj, form, change):
        obj.organization = obj.property.organization
        super().save_model(request, obj, form, change)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'organization', 'rooms_count', 'units_count', 'is_active']
    list_filter = ['city', 'is_active', 'organization']
    search_fields = ['name', 'address']
    inlines = [RoomInline]

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            obj.organization = form.instance.organization
            obj.save()
        for obj in formset.deleted_objects:
            obj.delete()
        formset.save_m2m()

    @admin.display(description='Комнат')
    def rooms_count(self, obj):
        return obj.rooms.count()

    @admin.display(description='Мест')
    def units_count(self, obj):
        return Unit.objects.filter(room__property=obj).count()


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'property', 'room_type', 'floor', 'max_capacity', 'units_count', 'free_count']
    list_filter = ['room_type', 'floor', 'property', 'organization']
    search_fields = ['name', 'number']
    ordering = ['property', 'floor', 'name']
    inlines = [UnitInline]

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            obj.organization = form.instance.organization
            obj.save()
        for obj in formset.deleted_objects:
            obj.delete()
        formset.save_m2m()

    @admin.display(description='Мест всего')
    def units_count(self, obj):
        return obj.units.count()

    @admin.display(description='Свободно')
    def free_count(self, obj):
        count = obj.units.filter(status='available').count()
        color = 'green' if count > 0 else 'red'
        return format_html('<span style="color:{}">{}</span>', color, count)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'room', 'room_property', 'unit_type', 'status_colored', 'sort_order']
    list_filter = ['status', 'unit_type', 'room__property', 'organization']
    search_fields = ['name', 'room__name']
    ordering = ['room__property', 'room__floor', 'sort_order']

    @admin.display(description='Объект', ordering='room__property')
    def room_property(self, obj):
        return obj.room.property.name

    @admin.display(description='Статус')
    def status_colored(self, obj):
        colors = {'available': 'green', 'occupied': 'red', 'maintenance': 'orange', 'blocked': 'gray'}
        labels = {'available': 'Свободно', 'occupied': 'Занято', 'maintenance': 'Ремонт', 'blocked': 'Заблок.'}
        color = colors.get(obj.status, 'black')
        label = labels.get(obj.status, obj.status)
        return format_html('<span style="color:{};font-weight:bold">{}</span>', color, label)
