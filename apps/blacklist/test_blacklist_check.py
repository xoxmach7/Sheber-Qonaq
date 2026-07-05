"""
Тесты проверки чёрного списка (BlacklistEntry.check_guest).
Заодно проверяет, что описание может быть пустым (необязательное поле).
"""
import pytest

from apps.blacklist.models import BlacklistEntry


@pytest.mark.django_db
def test_check_by_phone_finds_entry():
    BlacklistEntry.objects.create(
        full_name='Проблемный Гость', phone='+7 700 999-88-77',
        reason='debt', description='',  # описание пустое — должно работать
    )
    entries = BlacklistEntry.check_guest(phone='+7 700 999-88-77')
    assert len(entries) == 1


@pytest.mark.django_db
def test_check_by_iin_finds_entry():
    entry = BlacklistEntry(full_name='Вор', reason='theft', description='')
    entry.iin = '880101300123'
    entry.save()
    entries = BlacklistEntry.check_guest(iin='880101300123')
    assert len(entries) == 1


@pytest.mark.django_db
def test_inactive_entry_not_returned():
    BlacklistEntry.objects.create(
        full_name='Старая запись', phone='+7 700 111-22-33',
        reason='other', description='', is_active=False,
    )
    entries = BlacklistEntry.check_guest(phone='+7 700 111-22-33')
    assert entries == []


@pytest.mark.django_db
def test_no_criteria_returns_empty():
    assert BlacklistEntry.check_guest() == []


@pytest.mark.django_db
def test_check_by_phone_ignores_formatting():
    """Регрессия: ЧС не должен обходиться другим форматированием номера."""
    BlacklistEntry.objects.create(
        full_name='Проблемный Гость', phone='+7 700 999-88-77',
        reason='debt', description='',
    )
    assert len(BlacklistEntry.check_guest(phone='87009998877')) == 1
    assert len(BlacklistEntry.check_guest(phone='8 (700) 999 88 77')) == 1
    assert len(BlacklistEntry.check_guest(phone='7009998877')) == 1


@pytest.mark.django_db
def test_check_by_full_name_finds_entry():
    """
    Гость с нарушением в одном хостеле должен находиться в другом хостеле
    даже без телефона/ИИН — по ФИО (регистр и порядок слов не важны).
    """
    BlacklistEntry.objects.create(
        full_name='Иванов Иван', reason='behavior', description='',
    )
    assert len(BlacklistEntry.check_guest(full_name='Иванов Иван')) == 1
    assert len(BlacklistEntry.check_guest(full_name='иван иванов')) == 1
    assert len(BlacklistEntry.check_guest(full_name='ИВАН ИВАНОВ')) == 1


@pytest.mark.django_db
def test_check_by_full_name_no_match():
    BlacklistEntry.objects.create(
        full_name='Иванов Иван', reason='behavior', description='',
    )
    assert BlacklistEntry.check_guest(full_name='Петров Пётр') == []


@pytest.mark.django_db
def test_check_combines_all_criteria_without_duplicates():
    """
    Одна и та же запись не должна дублироваться в результате, если совпала
    сразу по нескольким критериям (напр. и по телефону, и по ФИО).
    """
    BlacklistEntry.objects.create(
        full_name='Иванов Иван', phone='+7 700 999-88-77',
        reason='debt', description='',
    )
    entries = BlacklistEntry.check_guest(phone='+7 700 999-88-77', full_name='Иван Иванов')
    assert len(entries) == 1
