from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['title', 'type', 'organization', 'is_read', 'guest_name', 'created_at']
    list_filter   = ['type', 'is_read', 'organization']
    search_fields = ['title', 'guest_name']
    readonly_fields = ['created_at']
