"""
Тесты API доступности: поиск свободных коек по датам + календарь занятости.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay


def _stay(org, unit, guest, ci, co, status='active'):
    return Stay.objects.create(
        organization=org, unit=unit, guest=guest,
        check_in_date=ci, expected_check_out_date=co,
        rate_type='daily', rate_amount=Decimal('5000'), status=status,
    )


@pytest.mark.django_db
def test_availability_lists_free_unit_with_rate(api, hostel_unit):
    r = api.get('/api/v1/stays/availability/?from=2026-07-01&to=2026-07-05')
    assert r.status_code == 200, r.data
    assert r.data['nights'] == 4
    ids = [u['unit'] for u in r.data['results']]
    assert hostel_unit.id in ids
    u = next(x for x in r.data['results'] if x['unit'] == hostel_unit.id)
    assert u['rates']['daily'] == 5000
    assert u['total'] == '20000'


@pytest.mark.django_db
def test_availability_excludes_occupied(api, org, hostel_unit, guest):
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5), status='reserved')
    r = api.get('/api/v1/stays/availability/?from=2026-07-03&to=2026-07-06')
    assert r.status_code == 200, r.data
    ids = [u['unit'] for u in r.data['results']]
    assert hostel_unit.id not in ids


@pytest.mark.django_db
def test_availability_free_on_adjacent_dates(api, org, hostel_unit, guest):
    # занят 1-5, ищем 5-8 — заезд в день выезда, должен быть свободен
    _stay(org, hostel_unit, guest, date(2026, 7, 1), date(2026, 7, 5))
    r = api.get('/api/v1/stays/availability/?from=2026-07-05&to=2026-07-08')
    ids = [u['unit'] for u in r.data['results']]
    assert hostel_unit.id in ids


@pytest.mark.django_db
def test_availability_rejects_bad_range(api):
    r = api.get('/api/v1/stays/availability/?from=2026-07-05&to=2026-07-01')
    assert r.status_code == 400


@pytest.mark.django_db
def test_occupancy_calendar_counts_nights(api, org, hostel_unit, guest):
    # занимает ночи 2 и 3 июля (выезд 4-го свободен)
    _stay(org, hostel_unit, guest, date(2026, 7, 2), date(2026, 7, 4))
    r = api.get('/api/v1/stays/occupancy-calendar/?from=2026-07-01&to=2026-07-05')
    assert r.status_code == 200, r.data
    days = r.data['days']
    assert r.data['total_units'] == 1
    assert days['2026-07-01']['occupied'] == 0
    assert days['2026-07-02']['occupied'] == 1
    assert days['2026-07-03']['occupied'] == 1
    assert days['2026-07-04']['occupied'] == 0
    assert days['2026-07-02']['rate'] == 100
