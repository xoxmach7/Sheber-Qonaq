"""
Тесты котировки брони (POST /stays/quote/): цена из Property.base_rates,
расчёт единиц/итога, флаг доступности.
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.stays.models import Stay


def _payload(unit, ci='2026-07-01', co='2026-07-05', rt='daily'):
    return {'unit': unit.id, 'check_in_date': ci,
            'expected_check_out_date': co, 'rate_type': rt}


@pytest.mark.django_db
def test_quote_returns_rate_and_total(api, hostel_unit):
    # bed daily по умолчанию = 5000; 4 ночи -> 20000
    r = api.post('/api/v1/stays/quote/', _payload(hostel_unit), format='json')
    assert r.status_code == 200, r.data
    assert r.data['configured'] is True
    assert r.data['rate_amount'] == '5000'
    assert r.data['units'] == 4
    assert r.data['total'] == '20000'
    assert r.data['available'] is True


@pytest.mark.django_db
def test_quote_monthly(api, hostel_unit):
    # bed monthly = 100000; ровно 1 месяц
    r = api.post('/api/v1/stays/quote/',
                 _payload(hostel_unit, '2026-01-01', '2026-02-01', 'monthly'),
                 format='json')
    assert r.status_code == 200, r.data
    assert r.data['units'] == 1
    assert r.data['rate_amount'] == '100000'
    assert r.data['total'] == '100000'


@pytest.mark.django_db
def test_quote_no_rate_configured(api, hostel_unit):
    prop = hostel_unit.room.property
    prop.base_rates = {}
    prop.save(update_fields=['base_rates'])
    r = api.post('/api/v1/stays/quote/', _payload(hostel_unit), format='json')
    assert r.status_code == 200, r.data
    assert r.data['configured'] is False
    assert r.data['rate_amount'] is None
    assert r.data['total'] == '0'


@pytest.mark.django_db
def test_quote_unavailable_when_overlap(api, org, hostel_unit, guest):
    Stay.objects.create(
        organization=org, unit=hostel_unit, guest=guest,
        check_in_date=date(2026, 7, 1), expected_check_out_date=date(2026, 7, 10),
        rate_type='daily', rate_amount=Decimal('5000'), status='active',
    )
    r = api.post('/api/v1/stays/quote/',
                 _payload(hostel_unit, '2026-07-03', '2026-07-05'), format='json')
    assert r.status_code == 200, r.data
    assert r.data['available'] is False


@pytest.mark.django_db
def test_quote_rejects_bad_dates(api, hostel_unit):
    r = api.post('/api/v1/stays/quote/',
                 _payload(hostel_unit, '2026-07-05', '2026-07-01'), format='json')
    assert r.status_code == 400
