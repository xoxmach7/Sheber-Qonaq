"""
Шаг 7: авто-expire протухших резервов через 12ч без предоплаты.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone


def _reserve(org, unit, guest, paid=Decimal('0')):
    from apps.stays.models import Stay
    from apps.payments.models import Payment
    # 4 ночи x 5000 = 20000; deposit 50% -> required 10000
    s = Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=date(2026, 7, 1), expected_check_out_date=date(2026, 7, 5),
        rate_type='daily', rate_amount=Decimal('5000'), status='reserved',
    )
    if paid > 0:
        Payment.objects.create(stay=s, amount=paid, payment_date=date(2026, 6, 20), method='cash')
    return s


def _age_hours(stay, hours):
    """created_at имеет auto_now_add — обходим через .update()."""
    from apps.stays.models import Stay
    Stay.objects.filter(pk=stay.pk).update(created_at=timezone.now() - timedelta(hours=hours))


@pytest.mark.django_db
def test_old_unpaid_reservation_expires(org, hostel_unit, guest):
    from apps.stays.services import expire_stale_reservations
    s = _reserve(org, hostel_unit, guest, paid=Decimal('0'))
    _age_hours(s, 13)
    assert expire_stale_reservations(12) == 1
    s.refresh_from_db()
    assert s.status == 'expired'


@pytest.mark.django_db
def test_fresh_reservation_survives(org, hostel_unit, guest):
    from apps.stays.services import expire_stale_reservations
    s = _reserve(org, hostel_unit, guest, paid=Decimal('0'))
    _age_hours(s, 5)
    assert expire_stale_reservations(12) == 0
    s.refresh_from_db()
    assert s.status == 'reserved'


@pytest.mark.django_db
def test_prepaid_reservation_survives(org, hostel_unit, guest):
    from apps.stays.services import expire_stale_reservations
    s = _reserve(org, hostel_unit, guest, paid=Decimal('10000'))  # 50% внесено
    _age_hours(s, 24)
    assert expire_stale_reservations(12) == 0
    s.refresh_from_db()
    assert s.status == 'reserved'  # деньги есть — не трогаем
