from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'plan', 'contact_phone',
                  'contact_email', 'is_active', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']
