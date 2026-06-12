from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'body',
            'is_read', 'stay_id', 'guest_name', 'created_at',
        ]
        read_only_fields = ['id', 'type', 'title', 'body', 'stay_id', 'guest_name', 'created_at']
