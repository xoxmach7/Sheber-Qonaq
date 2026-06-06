from django.contrib import admin
from .models import Payment, Expense

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['stay', 'amount', 'payment_date', 'method', 'received_by']
    list_filter = ['method', 'payment_date']
    search_fields = ['stay__guest__first_name', 'stay__guest__last_name']
    date_hierarchy = 'payment_date'

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['category', 'amount', 'date', 'description', 'organization']
    list_filter = ['category', 'organization']
    date_hierarchy = 'date'
