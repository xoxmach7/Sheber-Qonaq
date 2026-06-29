"""
Ежедневная проверка: долги, истекающие заезды, просроченные выезды.
Запускается через Railway Cron: python manage.py run_daily_checks
"""
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Создаёт уведомления о долгах и истекающих заездах'

    def handle(self, *args, **options):
        self.stdout.write('=== run_daily_checks start ===')
        self._expire_reservations()
        self._check_expiring()
        self._check_overdue()
        self._check_debts()
        self.stdout.write('=== run_daily_checks done ===')

    def _expire_reservations(self):
        """Снимает протухшие резервы без предоплаты (старше 12ч) -> expired."""
        from apps.stays.services import expire_stale_reservations
        try:
            n = expire_stale_reservations(hours=12)
            self.stdout.write(f'  expired {n} stale reservation(s)')
        except Exception as exc:
            logger.exception('expire_stale_reservations failed: %s', exc)
            self.stdout.write(self.style.ERROR(f'  expire failed: {exc}'))

    def _create(self, org, notif_type, title, body, stay):
        from apps.notifications.models import Notification
        exists = Notification.objects.filter(
            organization=org,
            type=notif_type,
            stay_id=stay.id,
            created_at__date=date.today(),
        ).exists()
        if not exists:
            Notification.objects.create(
                organization=org,
                type=notif_type,
                title=title,
                body=body,
                stay_id=stay.id,
                guest_name=stay.guest.full_name,
            )
            self.stdout.write(f'  + {notif_type}: {stay.guest.full_name}')

    def _check_expiring(self):
        from apps.stays.models import Stay
        today = date.today()
        for days, label in [(1, 'завтра'), (3, 'через 3 дня')]:
            for stay in Stay.objects.filter(
                status='active',
                expected_check_out_date=today + timedelta(days=days),
            ).select_related('guest', 'unit', 'organization'):
                self._create(
                    stay.organization, 'expiring',
                    f'Выезд {label}: {stay.guest.full_name}',
                    f'{stay.guest.full_name} выезжает {label} '
                    f'({stay.expected_check_out_date.strftime("%d.%m.%Y")}). '
                    f'Место: {stay.unit.name}.',
                    stay,
                )

    def _check_overdue(self):
        from apps.stays.models import Stay
        today = date.today()
        for stay in Stay.objects.filter(
            status='active',
            expected_check_out_date__lt=today,
        ).select_related('guest', 'unit', 'organization'):
            days = (today - stay.expected_check_out_date).days
            self._create(
                stay.organization, 'overdue',
                f'Просрочен выезд: {stay.guest.full_name}',
                f'{stay.guest.full_name} не выехал вовремя. '
                f'Просрочка: {days} дн. Место: {stay.unit.name}.',
                stay,
            )

    def _check_debts(self):
        from apps.stays.models import Stay
        for stay in Stay.objects.filter(
            status='active',
        ).select_related('guest', 'unit', 'organization'):
            if stay.balance > Decimal('0'):
                self._create(
                    stay.organization, 'debt',
                    f'Долг: {stay.guest.full_name}',
                    f'{stay.guest.full_name} — задолженность '
                    f'{stay.balance:,.0f} тг. Место: {stay.unit.name}.',
                    stay,
                )
