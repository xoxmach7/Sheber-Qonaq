"""
Регрессия: видимость вкладки «Нарушения» больше не должна требовать ручного
подтверждения через Django admin (is_verified). Организация должна
автоматически видеть чужую запись, если гость из этой записи уже есть в
её собственной базе гостей (совпадение по ИИН/телефону/ФИО) — без
ручного шага. Полный чужой каталог по-прежнему не должен быть виден.
"""
import pytest

from apps.blacklist.models import BlacklistEntry
from apps.organizations.models import Organization
from apps.guests.models import Guest


@pytest.fixture
def org_a(db):
    return Organization.objects.create(name='Hostel A', slug='hostel-a')


@pytest.fixture
def org_b(db):
    return Organization.objects.create(name='Hostel B', slug='hostel-b')


@pytest.mark.django_db
def test_own_report_always_visible(org_a):
    entry = BlacklistEntry.objects.create(
        full_name='Иванов Иван', phone='+7 700 111-22-33',
        reason='debt', description='', reported_by=org_a,
    )
    visible = BlacklistEntry.visible_to(org_a)
    assert entry in visible


@pytest.mark.django_db
def test_other_org_without_matching_guest_does_not_see_entry(org_a, org_b):
    """
    Хостел B никогда не встречал этого гостя — полный чужой каталог ему
    не должен быть виден, даже если запись не is_verified.
    """
    BlacklistEntry.objects.create(
        full_name='Иванов Иван', phone='+7 700 111-22-33',
        reason='debt', description='', reported_by=org_a,
    )
    assert BlacklistEntry.visible_to(org_b) == []


@pytest.mark.django_db
def test_other_org_sees_entry_automatically_once_guest_matches_by_phone(org_a, org_b):
    """
    Ключевой фикс: хостелу B НЕ нужно ручное подтверждение через админку —
    как только у него в базе гостей появляется гость с тем же телефоном,
    запись о нарушении должна стать видна автоматически.
    """
    entry = BlacklistEntry.objects.create(
        full_name='Иванов Иван', phone='+7 700 111-22-33',
        reason='debt', description='', reported_by=org_a, is_verified=False,
    )
    Guest.objects.create(
        organization=org_b, first_name='Иван', last_name='Иванов',
        phone='87001112233',  # другое форматирование того же номера
    )
    visible = BlacklistEntry.visible_to(org_b)
    assert entry in visible


@pytest.mark.django_db
def test_other_org_sees_entry_automatically_once_guest_matches_by_full_name(org_a, org_b):
    entry = BlacklistEntry.objects.create(
        full_name='Петров Пётр', reason='theft', description='', reported_by=org_a,
    )
    Guest.objects.create(
        organization=org_b, first_name='Пётр', last_name='Петров',
        phone='+7 705 000-00-00',
    )
    visible = BlacklistEntry.visible_to(org_b)
    assert entry in visible


@pytest.mark.django_db
def test_other_org_sees_entry_automatically_once_guest_matches_by_iin(org_a, org_b):
    entry = BlacklistEntry(full_name='Вор', reason='theft', description='', reported_by=org_a)
    entry.iin = '880101300123'
    entry.save()

    guest = Guest(organization=org_b, first_name='Вор', last_name='Ворович', phone='+7 700 999-00-00')
    guest.iin = '880101300123'
    guest.save()

    visible = BlacklistEntry.visible_to(org_b)
    assert entry in visible


@pytest.mark.django_db
def test_inactive_entry_never_visible(org_a, org_b):
    BlacklistEntry.objects.create(
        full_name='Иванов Иван', phone='+7 700 111-22-33',
        reason='debt', description='', reported_by=org_a, is_active=False,
    )
    Guest.objects.create(
        organization=org_b, first_name='Иван', last_name='Иванов',
        phone='+7 700 111-22-33',
    )
    assert BlacklistEntry.visible_to(org_b) == []


@pytest.mark.django_db
def test_no_organization_returns_empty():
    assert BlacklistEntry.visible_to(None) == []
