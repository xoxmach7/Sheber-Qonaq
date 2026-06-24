"""
Сервисные функции движка проживаний.
"""
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone


def expire_stale_reservations(hours: int = 12) -> int:
    """
    Авто-снятие протухших резервов (Шаг 7).

    Бронь в статусе `reserved`, созданная раньше чем `hours` часов назад и
    БЕЗ достаточной предоплаты (total_paid < deposit_percent × total_expected),
    переводится в `expired` — чтобы освободить занятые даты.

    Резервы с достаточной предоплатой не трогаем (их просто забыли подтвердить —
    деньги внесены). Возвращает число протухших броней.
    """
    from apps.stays.models import Stay

    cutoff = timezone.now() - timedelta(hours=hours)
    expired_count = 0

    stays = (
        Stay.objects.filter(status='reserved', created_at__lt=cutoff)
        .select_related('organization')
    )
    for stay in stays:
        percent = stay.organization.deposit_percent or Decimal('0')
        required = (percent * stay.total_expected).quantize(Decimal('1'))
        if stay.total_paid < required:
            with transaction.atomic():
                stay.status = 'expired'
                stay.save(update_fields=['status', 'updated_at'])
            expired_count += 1

    return expired_count
