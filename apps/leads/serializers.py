from rest_framework import serializers
from .models import Lead, Viewing


class ViewingSerializer(serializers.ModelSerializer):
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = Viewing
        fields = [
            'id', 'lead', 'scheduled_at', 'conducted_at',
            'outcome', 'outcome_display', 'notes', 'reminder_sent', 'created_at',
        ]
        read_only_fields = ['id', 'reminder_sent', 'created_at']


class LeadSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    viewings = ViewingSerializer(many=True, read_only=True)
    next_viewing = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'phone', 'source', 'source_display',
            'interested_unit_type', 'budget_min', 'budget_max',
            'status', 'status_display', 'notes',
            'converted_to_guest', 'converted_at',
            'viewings', 'next_viewing', 'created_at',
        ]
        read_only_fields = ['id', 'converted_to_guest', 'converted_at', 'created_at']

    def get_next_viewing(self, obj):
        from django.utils import timezone
        viewing = obj.viewings.filter(
            scheduled_at__gte=timezone.now(),
            outcome='pending'
        ).order_by('scheduled_at').first()
        if viewing:
            return ViewingSerializer(viewing).data
        return None


class LeadStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Lead.STATUSES)
    notes = serializers.CharField(required=False, allow_blank=True)
