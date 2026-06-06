from django.contrib import admin
from django.utils.html import format_html
from .models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'phone', 'document_type', 'city_of_origin',
        'active_stays', 'is_blacklisted_colored', 'organization',
    ]
    list_filter = ['document_type', 'is_active', 'is_blacklisted', 'organization']
    search_fields = ['first_name', 'last_name', 'phone']
    readonly_fields = ['iin_hash', 'created_at', 'updated_at']
    ordering = ['last_name', 'first_name']

    fieldsets = (
        ('Личные данные', {
            'fields': ('organization', 'first_name', 'last_name', 'phone', 'email')
        }),
        ('Документ', {
            'fields': ('document_type', 'document_number', 'iin_hash')
        }),
        ('Дополнительно', {
            'fields': ('city_of_origin', 'notes', 'is_active', 'is_blacklisted', 'blacklist_reason')
        }),
        ('Служебное', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Активных заездов')
    def active_stays(self, obj):
        count = obj.stays.filter(status='active').count()
        if count:
            return format_html('<span style="color:green;font-weight:bold">{}</span>', count)
        return '—'

    @admin.display(description='ЧС')
    def is_blacklisted_colored(self, obj):
        if obj.is_blacklisted:
            return format_html('<span style="color:red;font-weight:bold">⛔ ЧС</span>')
        return '—'
