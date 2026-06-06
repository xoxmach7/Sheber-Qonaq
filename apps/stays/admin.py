from django.contrib import admin
from .models import Stay

@admin.register(Stay)
class StayAdmin(admin.ModelAdmin):
    list_display = ['guest', 'unit', 'check_in_date', 'expected_check_out_date',
                    'rate_type', 'rate_amount', 'status', 'total_paid', 'balance']
    list_filter = ['status', 'rate_type', 'source', 'organization']
    search_fields = ['guest__first_name', 'guest__last_name', 'guest__phone']
    date_hierarchy = 'check_in_date'
    readonly_fields = ['total_paid', 'total_expected', 'balance', 'created_at']
