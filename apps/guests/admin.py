from django.contrib import admin
from .models import Guest

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'document_type', 'city_of_origin', 'organization', 'is_active']
    list_filter = ['document_type', 'is_active', 'organization']
    search_fields = ['first_name', 'last_name', 'phone']
    readonly_fields = ['iin_hash', 'created_at', 'updated_at']
