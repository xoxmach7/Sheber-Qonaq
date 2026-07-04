from django.contrib import admin
from django.utils.html import format_html
from .models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'phone', 'document_type', 'nationality', 'is_foreigner',
        'city_of_origin', 'active_stays', 'is_blacklisted_colored', 'organization',
    ]
    list_filter = ['document_type', 'is_foreigner', 'is_active', 'organization']
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
        ('Гражданство / Увед. о прибытии', {
            'fields': ('nationality', 'is_foreigner')
        }),
        ('Дополнительно', {
            'fields': ('city_of_origin', 'notes', 'is_active')
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
        return '-'

    @admin.display(description='ЧС')
    def is_blacklisted_colored(self, obj):
        from apps.blacklist.models import BlacklistEntry
        if obj.phone and BlacklistEntry.objects.filter(is_active=True, phone=obj.phone).exists():
            return format_html('<span style="color:red;font-weight:bold">ЧС</span>')
        return '-'
