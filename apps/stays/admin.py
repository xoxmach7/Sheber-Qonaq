from django.contrib import admin
from django.utils.html import format_html
from .models import Stay


@admin.register(Stay)
class StayAdmin(admin.ModelAdmin):
    list_display = [
        'guest_name', 'unit_info', 'check_in_date', 'expected_check_out_date',
        'rate_amount', 'total_paid', 'balance_colored', 'status_colored', 'source',
    ]
    list_filter = ['status', 'rate_type', 'source', 'organization']
    search_fields = ['guest__first_name', 'guest__last_name', 'guest__phone']
    date_hierarchy = 'check_in_date'
    readonly_fields = ['total_paid', 'total_expected', 'balance', 'created_at', 'updated_at']
    ordering = ['-check_in_date']

    fieldsets = (
        ('Гость и место', {
            'fields': ('organization', 'guest', 'unit', 'status', 'source')
        }),
        ('Даты', {
            'fields': ('check_in_date', 'expected_check_out_date', 'actual_check_out_date')
        }),
        ('Тариф и оплата', {
            'fields': ('rate_type', 'rate_amount', 'total_expected', 'total_paid', 'balance')
        }),
        ('Дополнительно', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Гость', ordering='guest__last_name')
    def guest_name(self, obj):
        return obj.guest.full_name

    @admin.display(description='Место')
    def unit_info(self, obj):
        return f'{obj.unit.room.name} / {obj.unit.name}'

    @admin.display(description='Баланс')
    def balance_colored(self, obj):
        b = obj.balance
        color = 'red' if b < 0 else ('green' if b == 0 else 'orange')
        return format_html('<span style="color:{};font-weight:bold">{} ₸</span>', color, b)

    @admin.display(description='Статус')
    def status_colored(self, obj):
        colors = {'active': 'green', 'checked_out': 'gray', 'cancelled': 'red', 'reserved': 'blue'}
        labels = {'active': 'Активен', 'checked_out': 'Выехал', 'cancelled': 'Отменён', 'reserved': 'Бронь'}
        color = colors.get(obj.status, 'black')
        label = labels.get(obj.status, obj.status)
        return format_html('<span style="color:{}">{}</span>', color, label)
