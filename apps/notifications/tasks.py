from celery import shared_task
import logging

logger = logging.getLogger(__name__)


def _get_or_skip(stay, notif_type, title, body):
    """Создаёт уведомление только если такого ещё нет сегодня."""
    from datetime import date
    from .models import Notification
    exists = Notification.objects.filter(
        organization=stay.organization,
        type=notif_type,
        stay_id=stay.id,
        created_at__date=date.today(),
    ).exists()
    if not exists:
        Notification.objects.create(
            organization=stay.organization,
            type=notif_type,
            title=title,
            body=body,
            stay_id=stay.id,
            guest_name=stay.guest.full_name,
        )


@shared_task
def check_expiring_stays():
    """Ежедневно: заезды истекают через 1 или 3 дня."""
    from datetime import date, timedelta
    from apps.stays.models import Stay

    today = date.today()
    for days, label in [(1, 'завтра'), (3, 'через 3 дня')]:
        target = today + timedelta(days=days)
        stays  = Stay.objects.filter(
            status='active',
            expected_check_out_date=target,
        ).select_related('guest', 'unit', 'organization')

        for stay in stays:
            _get_or_skip(
                stay,
                notif_type='expiring',
                title=f'Выезд {label}: {stay.guest.full_name}',
                body=(
                    f'{stay.guest.full_name} должен выехать {label} '
                    f'({stay.expected_check_out_date.strftime("%d.%m.%Y")}). '
                    f'Место: {stay.unit.name}.'
                ),
            )


@shared_task
def check_overdue_stays():
    """Ежедневно: просроченные выезды (дата выезда < сегодня, статус active)."""
    from datetime import date
    from apps.stays.models import Stay

    overdue = Stay.objects.filter(
        status='active',
        expected_check_out_date__lt=date.today(),
    ).select_related('guest', 'unit', 'organization')

    for stay in overdue:
        days = (date.today() - stay.expected_check_out_date).days
        _get_or_skip(
            stay,
            notif_type='overdue',
            title=f'Просрочен выезд: {stay.guest.full_name}',
            body=(
                f'{stay.guest.full_name} не выехал вовремя. '
                f'Просрочка: {days} дн. Место: {stay.unit.name}.'
            ),
        )


@shared_task
def check_debts():
    """Ежедневно: гости с долгом > 0."""
    from decimal import Decimal
    from apps.stays.models import Stay

    active = Stay.objects.filter(
        status='active'
    ).select_related('guest', 'unit', 'organization')

    for stay in active:
        if stay.balance > Decimal('0'):
            _get_or_skip(
                stay,
                notif_type='debt',
                title=f'Долг: {stay.guest.full_name}',
                body=(
                    f'{stay.guest.full_name} имеет задолженность '
                    f'{stay.balance:,.0f} тг. Место: {stay.unit.name}.'
                ),
            )


@shared_task(bind=True, max_retries=3)
def send_viewing_reminder(self, viewing_id: int):
    try:
        from apps.leads.models import Viewing
        viewing = Viewing.objects.select_related('lead').get(id=viewing_id)
        if viewing.outcome != 'pending':
            return
        logger.info(
            f'НАПОМИНАНИЕ: Показ для {viewing.lead.name} ({viewing.lead.phone}) '
            f'запланирован на {viewing.scheduled_at:%d.%m.%Y %H:%M}'
        )
        viewing.reminder_sent = True
        viewing.save(update_fields=['reminder_sent'])
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
