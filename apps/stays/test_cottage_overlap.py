"""
Тесты overlap-проверки cottage-смен в StaySerializer.validate.
Защищают от двойного бронирования одной смены/дня.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay
from apps.stays.serializers import StaySerializer


def _make_active_shift(org, unit, guest, shift_type, day=date(2026, 6, 20)):
    return Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=day, expected_check_out_date=day,
        rate_type='daily', rate_amount=Decimal('35500'),
        shift_type=shift_type, status='active',
    )


def _payload(unit, guest, shift_type, day='2026-06-20'):
    return {
        'unit': unit.id, 'guest': guest.id,
        'check_in_date': day, 'expected_check_out_date': day,
        'rate_type': 'daily', 'rate_amount': '35500', 'shift_type': shift_type,
    }


@pytest.mark.django_db
def test_same_shift_same_day_blocked(org, cottage_unit, guest):
    _make_active_shift(org, cottage_unit, guest, 'day')
    ser = StaySerializer(data=_payload(cottage_unit, guest, 'day'))
    assert not ser.is_valid()


@pytest.mark.django_db
def test_full_blocks_other_shift(org, cottage_unit, guest):
    _make_active_shift(org, cottage_unit, guest, 'full')
    ser = StaySerializer(data=_payload(cottage_unit, guest, 'day'))
    assert not ser.is_valid()


@pytest.mark.django_db
def test_day_and_night_allowed(org, cottage_unit, guest):
    _make_active_shift(org, cottage_unit, guest, 'day')
    ser = StaySerializer(data=_payload(cottage_unit, guest, 'night'))
    assert ser.is_valid(), ser.errors


@pytest.mark.django_db
def test_cottage_requires_shift_type(org, cottage_unit, guest):
    data = _payload(cottage_unit, guest, 'day')
    data.pop('shift_type')
    ser = StaySerializer(data=data)
    assert not ser.is_valid()
