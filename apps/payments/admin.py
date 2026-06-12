from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, Expense


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'amount_colored', 'payment_date', 'method', 'received_by']
    list_filter = ['method', 'payment_date']
    search_fields = ['stay__guest__first_name', 'stay__guest__last_name', 'stay__guest__phone']
    date_hierarchy = 'payment_date'
    ordering = ['-payment_date']

    @admin.display(description='Гость', ordering='stay__guest__last_name')
    def guest_name(self, obj):
        return obj.stay.guest.full_name

    @admin.display(description='Сумма')
    def amount_colored(self, obj):
        return format_html('<span style="color:green;font-weight:bold">{} tg</span>', obj.amount)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['category', 'amount_colored', 'date', 'description', 'organization']
    list_filter = ['category', 'organization']
    date_hierarchy = 'date'
    ordering = ['-date']

    @admin.display(description='Сумма')
    def amount_colored(self, obj):
        return format_html('<span style="color:red;font-weight:bold">-{} tg</span>', obj.amount)
