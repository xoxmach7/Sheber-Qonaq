"""
Тесты стейт-машины брони: reserved -> confirmed -> active -> checked_out
+ guards переходов, порог предоплаты, walk-in.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay
from apps.payments.models import Payment


def _reserved(org, unit, guest, ci=date(2026, 7, 1), co=date(2026, 7, 5)):
    # 4 ночи x 5000 = 20000; deposit_percent 0.50 -> нужно 10000
    return Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=ci, expected_check_out_date=co,
        rate_type='daily', rate_amount=Decimal('5000'), status='reserved',
    )


@pytest.mark.django_db
def test_confirm_requires_deposit(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    # без оплаты — нельзя подтвердить
    r = api.post(f'/api/v1/stays/{stay.id}/confirm/')
    assert r.status_code == 400
    # вносим 50% (10000) и подтверждаем
    Payment.objects.create(
        stay=stay, amount=Decimal('10000'),
        payment_date=date(2026, 6, 20), method='cash',
    )
    r2 = api.post(f'/api/v1/stays/{stay.id}/confirm/')
    assert r2.status_code == 200
    stay.refresh_from_db()
    assert stay.status == 'confirmed'


@pytest.mark.django_db
def test_confirm_only_from_reserved(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    stay.status = 'active'
    stay.save(update_fields=['status'])
    r = api.post(f'/api/v1/stays/{stay.id}/confirm/')
    assert r.status_code == 400


@pytest.mark.django_db
def test_check_in_from_reserved_occupies_unit(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    r = api.post(f'/api/v1/stays/{stay.id}/check-in/')
    assert r.status_code == 200
    stay.refresh_from_db()
    assert stay.status == 'active'
    hostel_unit.refresh_from_db()
    assert hostel_unit.status == 'occupied'


@pytest.mark.django_db
def test_check_in_rejected_when_checked_out(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    stay.status = 'checked_out'
    stay.save(update_fields=['status'])
    r = api.post(f'/api/v1/stays/{stay.id}/check-in/')
    assert r.status_code == 400


@pytest.mark.django_db
def test_cancel_reserved(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    r = api.post(f'/api/v1/stays/{stay.id}/cancel/')
    assert r.status_code == 200
    stay.refresh_from_db()
    assert stay.status == 'cancelled'


@pytest.mark.django_db
def test_cancel_rejected_when_terminal(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    stay.status = 'checked_out'
    stay.save(update_fields=['status'])
    r = api.post(f'/api/v1/stays/{stay.id}/cancel/')
    assert r.status_code == 400


@pytest.mark.django_db
def test_no_show_from_active_rejected(api, org, hostel_unit, guest):
    stay = _reserved(org, hostel_unit, guest)
    stay.status = 'active'
    stay.save(update_fields=['status'])
    r = api.post(f'/api/v1/stays/{stay.id}/no-show/')
    assert r.status_code == 400


@pytest.mark.django_db
def test_walkin_creates_active_and_occupies_unit(api, hostel_unit, guest):
    payload = {
        'unit': hostel_unit.id, 'guest': guest.id,
        'check_in_date': '2026-07-01', 'expected_check_out_date': '2026-07-05',
        'rate_type': 'daily', 'rate_amount': '5000', 'status': 'active',
    }
    r = api.post('/api/v1/stays/', payload, format='json')
    assert r.status_code == 201, r.data
    assert r.data['status'] == 'active'
    hostel_unit.refresh_from_db()
    assert hostel_unit.status == 'occupied'


@pytest.mark.django_db
def test_reserved_does_not_occupy_unit(api, hostel_unit, guest):
    payload = {
        'unit': hostel_unit.id, 'guest': guest.id,
        'check_in_date': '2026-07-10', 'expected_check_out_date': '2026-07-12',
        'rate_type': 'daily', 'rate_amount': '5000', 'status': 'reserved',
    }
    r = api.post('/api/v1/stays/', payload, format='json')
    assert r.status_code == 201, r.data
    assert r.data['status'] == 'reserved'
    hostel_unit.refresh_from_db()
    assert hostel_unit.status == 'available'
