import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('sheber')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Расписание периодических задач
app.conf.beat_schedule = {
    # Каждый день в 09:00 по Алматы — проверка истекающих проживаний
    'check-expiring-stays-daily': {
        'task': 'apps.notifications.tasks.check_expiring_stays',
        'schedule': crontab(hour=9, minute=0),
    },
    # Каждый день в 10:00 — проверка должников
    'check-overdue-payments-daily': {
        'task': 'apps.notifications.tasks.check_overdue_payments',
        'schedule': crontab(hour=10, minute=0),
    },
}
