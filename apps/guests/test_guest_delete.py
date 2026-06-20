"""
Тесты умного удаления гостя:
- без истории заселений -> физическое удаление (204);
- с историей (Stay PROTECT) -> архивация is_active=False (200).
"""
from decimal import Decimal
from datetime import date

import pytest

from apps.guests.models import Guest


@pytest.mark.django_db
def test_delete_guest_without_stays_is_hard(api, guest):
    resp = api.delete(f'/api/v1/guests/{guest.id}/')
    assert resp.status_code == 204
    assert not Guest.objects.filter(id=guest.id).exists()


@pytest.mark.django_db
def test_delete_guest_with_stays_archives(api, org, hostel_unit, guest):
    from apps.stays.models import Stay
    Stay.objects.create(
        organization=org, unit=hostel_unit, guest=guest,
        check_in_date=date(2026, 6, 1), expected_check_out_date=date(2026, 7, 1),
        rate_type='monthly', rate_amount=Decimal('100000'), status='active',
    )
    resp = api.delete(f'/api/v1/guests/{guest.id}/')
    assert resp.status_code == 200
    assert resp.data.get('archived') is True
    guest.refresh_from_db()
    assert guest.is_active is False
    assert Guest.objects.filter(id=guest.id).exists()
