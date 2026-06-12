from django.contrib import admin
from .models import BlacklistEntry

@admin.register(BlacklistEntry)
class BlacklistEntryAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'reason', 'reported_by', 'is_verified', 'is_active', 'created_at']
    list_filter = ['reason', 'is_verified', 'is_active']
    search_fields = ['full_name', 'phone']
    readonly_fields = ['iin_hash', 'created_at']
    actions = ['mark_verified']

    @admin.action(description='Отметить как подтверждено')
    def mark_verified(self, request, queryset):
        queryset.update(is_verified=True)
