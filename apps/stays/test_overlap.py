"""
Тесты overlap-движка: пересечение диапазонов дат на юните.
Полуоткрытый интервал [check_in, check_out): заезд в день выезда разрешён.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay
from apps.stays.serializers import StaySerializer


def _stay(org, unit, guest, ci, co, status='active', shift=None):
    return Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=ci, expected_check_out_date=co,
        rate_type='daily', rate_amount=Decimal('5000'),
        status=status, shift_type=shift,
    )


def _payload(unit, guest, ci, co, status='reserved'):
    return {
        'unit': unit.id, 'guest': guest.id,
        'check_in_date': ci, 'expected_check_out_date': co,
        'rate_type': 'daily', 'rate_amount': '5000', 'status': status,
    }


@pytest.mark.django_db
def test_same_day_turnover_allowed(org, hostel_unit, guest):
    # A выезжает 5-го, B заезжает 5-го — НЕ пересечение
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    ser = StaySerializer(data=_payload(hostel_unit, guest, '2026-07-05', '2026-07-08'))
    assert ser.is_valid(), ser.errors


@pytest.mark.django_db
def test_overlap_blocked(org, hostel_unit, guest):
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    ser = StaySerializer(data=_payload(hostel_unit, guest, '2026-07-04', '2026-07-08'))
    assert not ser.is_valid()


@pytest.mark.django_db
def test_nested_overlap_blocked(org, hostel_unit, guest):
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 10))
    ser = StaySerializer(data=_payload(hostel_unit, guest, '2026-07-03', '2026-07-05'))
    assert not ser.is_valid()


@pytest.mark.django_db
def test_cancelled_does_not_block(org, hostel_unit, guest):
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5), status='cancelled')
    ser = StaySerializer(data=_payload(hostel_unit, guest, '2026-07-02', '2026-07-04'))
    assert ser.is_valid(), ser.errors


@pytest.mark.django_db
def test_reserved_blocks(org, hostel_unit, guest):
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5), status='reserved')
    ser = StaySerializer(data=_payload(hostel_unit, guest, '2026-07-02', '2026-07-04'))
    assert not ser.is_valid()


@pytest.mark.django_db
def test_overlapping_helper_ignores_shifts(org, cottage_unit, guest):
    # cottage-смена (shift_type задан) не учитывается в дат-overlap
    _stay(org, cottage_unit, guest, date(2026, 7, 1), date(2026, 7, 1),
          status='active', shift='day')
    qs = Stay.overlapping(cottage_unit, date(2026, 7, 1), date(2026, 7, 2))
    assert qs.count() == 0


@pytest.mark.django_db
def test_extend_into_next_booking_blocked(api, org, hostel_unit, guest):
    a = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    _stay(org, hostel_unit, guest, date(2026, 7, 10), date(2026, 7, 15), status='reserved')
    r = api.post(f'/api/v1/stays/{a.id}/extend/',
                 {'new_check_out_date': '2026-07-12'}, format='json')
    assert r.status_code == 400


@pytest.mark.django_db
def test_extend_without_conflict_ok(api, org, hostel_unit, guest):
    a = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    r = api.post(f'/api/v1/stays/{a.id}/extend/',
                 {'new_check_out_date': '2026-07-08'}, format='json')
    assert r.status_code == 200
