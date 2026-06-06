"""
Celery задачи для уведомлений.
Сейчас: напоминание о показе.
Потом: напоминание о предстоящем выселении, о долге.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_viewing_reminder(self, viewing_id: int):
    """
    Напоминание о показе за 1 час.
    Отправляется через WhatsApp/SMS (интеграция добавляется позже).
    """
    try:
        from apps.leads.models import Viewing
        viewing = Viewing.objects.select_related('lead').get(id=viewing_id)

        if viewing.outcome != 'pending':
            logger.info(f'Показ {viewing_id} уже завершён, напоминание пропущено.')
            return

        # TODO: интеграция с WhatsApp / SMS
        # Сейчас просто логируем
        logger.info(
            f'НАПОМИНАНИЕ: Показ для {viewing.lead.name} ({viewing.lead.phone}) '
            f'запланирован на {viewing.scheduled_at:%d.%m.%Y %H:%M}'
        )

        viewing.reminder_sent = True
        viewing.save(update_fields=['reminder_sent'])

    except Exception as exc:
        logger.error(f'Ошибка отправки напоминания для показа {viewing_id}: {exc}')
        raise self.retry(exc=exc, countdown=60)


@shared_task
def check_expiring_stays():
    """
    Ежедневная задача: находит проживания заканчивающиеся через 3 дня.
    Уведомляет ресепшн.
    """
    from datetime import date, timedelta
    from apps.stays.models import Stay

    target_date = date.today() + timedelta(days=3)
    expiring = Stay.objects.filter(
        status='active',
        expected_check_out_date=target_date,
    ).select_related('guest', 'unit', 'organization')

    for stay in expiring:
        logger.info(
            f'Проживание заканчивается через 3 дня: '
            f'{stay.guest.full_name} / {stay.unit.name} / {stay.expected_check_out_date}'
        )
        # TODO: push-уведомление в приложение


@shared_task
def check_overdue_payments():
    """
    Ежедневная задача: находит гостей с долгом.
    """
    from apps.stays.models import Stay
    from decimal import Decimal

    active_stays = Stay.objects.filter(status='active').select_related('guest')
    debtors = [s for s in active_stays if s.balance > Decimal('0')]

    for stay in debtors:
        logger.info(
            f'Долг: {stay.guest.full_name} / {stay.balance} тг / {stay.unit}'
        )
