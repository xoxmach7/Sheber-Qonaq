"""
Шаг 6: дашборд считает занятость ИЗ БРОНЕЙ, а не из unit.status.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal


@pytest.mark.django_db
def test_occupied_from_bookings_not_unit_status(api, org, hostel_unit, guest):
    from apps.stays.models import Stay
    today = date.today()
    Stay.objects.create(
        organization=org, unit=hostel_unit, guest=guest,
        check_in_date=today - timedelta(days=1),
        expected_check_out_date=today + timedelta(days=2),
        rate_type='daily', rate_amount=Decimal('5000'), status='active',
    )
    # unit.status намеренно НЕ 'occupied' — раньше дашборд верил ему
    hostel_unit.status = 'available'
    hostel_unit.save(update_fields=['status'])

    r = api.get('/api/v1/dashboard/')
    assert r.status_code == 200, r.content
    occ = r.data['occupancy']
    assert occ['total'] == 1
    assert occ['occupied'] == 1   # из брони
    assert occ['available'] == 0


@pytest.mark.django_db
def test_checked_out_not_counted_even_if_unit_status_stale(api, org, hostel_unit, guest):
    from apps.stays.models import Stay
    today = date.today()
    Stay.objects.create(
        organization=org, unit=hostel_unit, guest=guest,
        check_in_date=today - timedelta(days=5),
        expected_check_out_date=today - timedelta(days=1),  # уже выехал
        rate_type='daily', rate_amount=Decimal('5000'), status='checked_out',
    )
    hostel_unit.status = 'occupied'  # «залипший» статус
    hostel_unit.save(update_fields=['status'])

    r = api.get('/api/v1/dashboard/')
    occ = r.data['occupancy']
    assert occ['occupied'] == 0   # бронь завершена и не покрывает сегодня
    assert occ['available'] == 1
