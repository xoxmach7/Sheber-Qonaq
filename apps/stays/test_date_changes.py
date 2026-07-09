"""
История изменений дат заезда/выезда (StayDateChange) — фиксируется при
продлении (extend) и при прямом редактировании Stay (PATCH), чтобы можно
было разобраться, кто и когда сдвинул даты при спорных начислениях.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay, StayDateChange


def _stay(org, unit, guest, ci, co, status='active'):
    return Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=ci, expected_check_out_date=co,
        rate_type='daily', rate_amount=Decimal('5000'), status=status,
    )


@pytest.mark.django_db
def test_extend_logs_date_change(api, org, hostel_unit, guest):
    stay = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    r = api.post(f'/api/v1/stays/{stay.id}/extend/',
                 {'new_check_out_date': '2026-07-10'}, format='json')
    assert r.status_code == 200

    change = StayDateChange.objects.get(stay=stay)
    assert change.field == 'expected_check_out_date'
    assert change.old_value == date(2026, 7, 5)
    assert change.new_value == date(2026, 7, 10)
    assert change.changed_by is not None


@pytest.mark.django_db
def test_patch_check_in_date_logs_change(api, org, hostel_unit, guest):
    stay = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    r = api.patch(f'/api/v1/stays/{stay.id}/', {'check_in_date': '2026-06-30'}, format='json')
    assert r.status_code == 200

    change = StayDateChange.objects.get(stay=stay)
    assert change.field == 'check_in_date'
    assert change.old_value == date(2026, 7, 1)
    assert change.new_value == date(2026, 6, 30)


@pytest.mark.django_db
def test_update_without_date_change_does_not_log(api, org, hostel_unit, guest):
    stay = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    r = api.patch(f'/api/v1/stays/{stay.id}/', {'notes': 'просто заметка'}, format='json')
    assert r.status_code == 200
    assert not StayDateChange.objects.filter(stay=stay).exists()


@pytest.mark.django_db
def test_date_changes_endpoint_returns_history(api, org, hostel_unit, guest):
    stay = _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    api.post(f'/api/v1/stays/{stay.id}/extend/',
             {'new_check_out_date': '2026-07-10'}, format='json')

    r = api.get(f'/api/v1/stays/{stay.id}/date_changes/')
    assert r.status_code == 200
    assert len(r.data) == 1
    assert r.data[0]['old_value'] == '2026-07-05'
    assert r.data[0]['new_value'] == '2026-07-10'
