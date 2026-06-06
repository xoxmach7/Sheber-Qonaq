from django.contrib import admin
from .models import Lead, Viewing

class ViewingInline(admin.TabularInline):
    model = Viewing
    extra = 0
    fields = ['scheduled_at', 'outcome', 'reminder_sent']
    readonly_fields = ['reminder_sent']

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'source', 'status', 'organization', 'created_at']
    list_filter = ['status', 'source', 'organization']
    search_fields = ['name', 'phone']
    inlines = [ViewingInline]

@admin.register(Viewing)
class ViewingAdmin(admin.ModelAdmin):
    list_display = ['lead', 'scheduled_at', 'outcome', 'reminder_sent']
    list_filter = ['outcome', 'reminder_sent']
