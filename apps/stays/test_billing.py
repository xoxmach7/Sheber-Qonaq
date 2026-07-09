"""
Тесты биллинга Stay.total_expected — сердце системы, нельзя ломать.
Чистая логика, без БД (Stay создаётся через __new__).
"""
from decimal import Decimal
from datetime import date

from apps.stays.models import Stay


def make_stay(rate_type='daily', rate_amount='5000', shift_type='',
              check_in=None, check_out=None, actual_check_out=None):
    s = Stay.__new__(Stay)
    s.rate_type = rate_type
    s.rate_amount = Decimal(str(rate_amount))
    s.shift_type = shift_type
    s.check_in_date = check_in
    s.expected_check_out_date = check_out
    s.actual_check_out_date = actual_check_out
    return s


def test_daily_three_nights():
    s = make_stay('daily', 5000, check_in=date(2026, 6, 1), check_out=date(2026, 6, 4))
    assert s.total_expected == Decimal('15000')


def test_weekly_rounds_up():
    # 10 дней -> ceil(10/7) = 2 недели
    s = make_stay('weekly', 30000, check_in=date(2026, 6, 1), check_out=date(2026, 6, 11))
    assert s.total_expected == Decimal('60000')


def test_monthly_exact_month_is_one():
    # 1 янв -> 1 фев = ровно 1 месяц (31 день), НЕ 2 (регресс-тест на старый баг ceil(31/30))
    s = make_stay('monthly', 100000, check_in=date(2026, 1, 1), check_out=date(2026, 2, 1))
    assert s.total_expected == Decimal('100000')


def test_monthly_partial_is_proportional():
    # 1 месяц 14 дней -> 1 месяц + 14/30 месяца (пропорционально), НЕ 2 полных месяца.
    # Регресс-тест: раньше остаток в днях округлялся вверх до целого месяца —
    # 1 лишний день переплаты превращался в лишний полный месяц (100%+ переплата).
    s = make_stay('monthly', 100000, check_in=date(2026, 1, 1), check_out=date(2026, 2, 15))
    assert s.total_expected == Decimal('147000')


def test_monthly_one_extra_day_is_not_a_full_extra_month():
    # Регресс-тест на конкретный баг из прода: продление до 09.06-10.08 (2 месяца
    # и 1 день) при ставке 85000 не должно начислять как за 3 месяца (255000).
    s = make_stay('monthly', 85000, check_in=date(2026, 6, 9), check_out=date(2026, 8, 10))
    assert s.total_expected < Decimal('255000')  # старое (баговое) значение — 3 полных месяца
    assert s.total_expected == Decimal('172550')


def test_shift_day_is_flat_rate():
    # Дневная смена: check_out == check_in. Раньше давало 0, должно быть фикс. цена.
    s = make_stay('daily', 35500, shift_type='day',
                  check_in=date(2026, 6, 20), check_out=date(2026, 6, 20))
    assert s.total_expected == Decimal('35500')


def test_shift_full_is_flat_rate():
    s = make_stay('daily', 49500, shift_type='full',
                  check_in=date(2026, 6, 20), check_out=date(2026, 6, 21))
    assert s.total_expected == Decimal('49500')


def test_actual_checkout_overrides_expected():
    # Выселился раньше — считаем по фактической дате
    s = make_stay('daily', 5000, check_in=date(2026, 6, 1),
                  check_out=date(2026, 6, 10), actual_check_out=date(2026, 6, 3))
    assert s.total_expected == Decimal('10000')
