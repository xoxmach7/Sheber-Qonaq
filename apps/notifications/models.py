from django.db import models
from apps.organizations.models import Organization


class Notification(models.Model):
    TYPES = [
        ('debt',     'Долг'),
        ('expiring', 'Заезд истекает'),
        ('overdue',  'Просрочен выезд'),
        ('info',     'Информация'),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='notifications'
    )
    type        = models.CharField(max_length=20, choices=TYPES, default='info')
    title       = models.CharField(max_length=200)
    body        = models.TextField()
    is_read     = models.BooleanField(default=False)

    # Опциональные связи для перехода в контекст
    stay_id     = models.IntegerField(null=True, blank=True)
    guest_name  = models.CharField(max_length=200, blank=True)

    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['organization', 'is_read', '-created_at'])]

    def __str__(self):
        return f'[{self.type}] {self.title}'
