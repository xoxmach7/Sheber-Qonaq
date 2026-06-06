"""
python manage.py seed_demo

Заполняет БД реалистичными демо-данными:
  - Организация: Hostel Medeu
  - 1 объект (частный дом, Алматы)
  - 5 комнат, 30 мест
  - 15 гостей с казахскими именами
  - 12 активных заездов (микс оплачено/долг)
  - Несколько платежей и расходов
  - 6 лидов в воронке
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Засеять демо-данные'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Удалить все данные организации и заново засеять с нуля',
        )

    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Засеиваем демо-данные...\n')
        from apps.organizations.models import Organization
        from apps.properties.models import Property, Room, Unit
        from apps.stays.models import Stay
        from apps.payments.models import Payment, Expense
        from apps.guests.models import Guest
        from apps.leads.models import Lead

        if kwargs.get('reset'):
            org = Organization.objects.filter(slug='hostel-medeu').first()
            if org:
                self.stdout.write('  🗑 Удаляем старые данные...')
                # Payment не имеет org FK — удаляем через stays
                stays_qs = Stay.objects.filter(organization=org)
                Payment.objects.filter(stay__in=stays_qs).delete()
                stays_qs.delete()
                # Expense привязан к property, не к org напрямую
                Expense.objects.filter(property__organization=org).delete()
                Unit.objects.filter(organization=org).delete()
                Room.objects.filter(organization=org).delete()
                Property.objects.filter(organization=org).delete()
                Guest.objects.filter(organization=org).delete()
                Lead.objects.filter(organization=org).delete()
                self.stdout.write('  ✓ Очищено\n')

        # ── 1. Организация ───────────────────────────────────────────────────
        org, created = Organization.objects.get_or_create(
            slug='hostel-medeu',
            defaults={
                'name': 'Hostel Medeu',
                'plan': 'basic',
                'is_active': True,
            }
        )
        self.stdout.write(f'  ✓ Организация: {org.name}')

        # ── 2. Привязать admin к организации ─────────────────────────────────
        admin = User.objects.filter(username='admin').first()
        if admin:
            admin.organization = org
            admin.role = 'owner'
            admin.save()
            self.stdout.write(f'  ✓ admin привязан к организации, роль: owner')

        # ── 3. Объект размещения ──────────────────────────────────────────────
        prop, _ = Property.objects.get_or_create(
            slug='medeu-house' if hasattr(Property, 'slug') else None,
            organization=org,
            defaults={
                'name': 'Hostel Medeu — Главный дом',
                'address': 'ул. Горная 15',
                'city': 'Алматы',
                'is_active': True,
            }
        ) if hasattr(Property, 'slug') else (
            Property.objects.filter(organization=org).first() or
            Property.objects.create(
                organization=org,
                name='Hostel Medeu — Главный дом',
                address='ул. Горная 15',
                city='Алматы',
                is_active=True,
            ),
            False
        )
        self.stdout.write(f'  ✓ Объект: {prop.name}')

        # ── 4. Комнаты и места ───────────────────────────────────────────────
        rooms_data = [
            {'name': 'Комната 1', 'room_type': 'dorm',    'floor': 1, 'beds': 6},
            {'name': 'Комната 2', 'room_type': 'dorm',    'floor': 1, 'beds': 6},
            {'name': 'Комната 3', 'room_type': 'dorm',    'floor': 2, 'beds': 6},
            {'name': 'Комната 4', 'room_type': 'private', 'floor': 2, 'beds': 6},
            {'name': 'Комната 5', 'room_type': 'private', 'floor': 2, 'beds': 6},
        ]

        all_units = []
        for rd in rooms_data:
            room, _ = Room.objects.get_or_create(
                organization=org,
                property=prop,
                name=rd['name'],
                defaults={
                    'room_type': rd['room_type'],
                    'floor': rd['floor'],
                    'max_capacity': rd['beds'],
                }
            )
            unit_type = 'bed' if rd['room_type'] == 'dorm' else 'private_room'
            num = rd['name'].split()[-1]
            prefix = f'К{num}'
            for i in range(1, rd['beds'] + 1):
                if rd['room_type'] == 'dorm':
                    # Пары: 1→Н1 (нижняя), 2→В1 (верхняя), 3→Н2, 4→В2...
                    bunk_num = (i + 1) // 2
                    pos = 'Н' if i % 2 == 1 else 'В'
                    unit_name = f'{prefix}-{pos}{bunk_num}'
                else:
                    unit_name = f'{prefix}-К{i}'
                unit, _ = Unit.objects.get_or_create(
                    organization=org,
                    room=room,
                    name=unit_name,
                    defaults={
                        'unit_type': unit_type,
                        'status': 'available',
                        'sort_order': i,
                    }
                )
                all_units.append(unit)

        self.stdout.write(f'  ✓ Комнат: {len(rooms_data)}, Мест: {len(all_units)}')

        # ── 5. Гости ──────────────────────────────────────────────────────────
        guests_data = [
            {'first_name': 'Алибек',    'last_name': 'Сейткали',   'phone': '+77011234501'},
            {'first_name': 'Динара',    'last_name': 'Нурланова',  'phone': '+77011234502'},
            {'first_name': 'Ержан',     'last_name': 'Бекович',    'phone': '+77011234503'},
            {'first_name': 'Айгерим',   'last_name': 'Касымова',   'phone': '+77011234504'},
            {'first_name': 'Нурлан',    'last_name': 'Ахметов',    'phone': '+77011234505'},
            {'first_name': 'Жанара',    'last_name': 'Сатыбалды',  'phone': '+77011234506'},
            {'first_name': 'Асхат',     'last_name': 'Жумагулов',  'phone': '+77011234507'},
            {'first_name': 'Мадина',    'last_name': 'Берікова',   'phone': '+77011234508'},
            {'first_name': 'Тимур',     'last_name': 'Рахимов',    'phone': '+77011234509'},
            {'first_name': 'Гульнара',  'last_name': 'Омарова',    'phone': '+77011234510'},
            {'first_name': 'Даурен',    'last_name': 'Сулейменов', 'phone': '+77011234511'},
            {'first_name': 'Зарина',    'last_name': 'Ибрагимова', 'phone': '+77011234512'},
            {'first_name': 'Арман',     'last_name': 'Тастанов',   'phone': '+77011234513'},
            {'first_name': 'Сабина',    'last_name': 'Дюсенова',   'phone': '+77011234514'},
            {'first_name': 'Руслан',    'last_name': 'Байжанов',   'phone': '+77011234515'},
        ]

        guest_objs = []
        for gd in guests_data:
            guest, _ = Guest.objects.get_or_create(
                organization=org,
                phone=gd['phone'],
                defaults={
                    'first_name': gd['first_name'],
                    'last_name': gd['last_name'],
                }
            )
            guest_objs.append(guest)

        self.stdout.write(f'  ✓ Гостей: {len(guest_objs)}')

        # ── 6. Активные заезды ────────────────────────────────────────────────
        today = date.today()

        stays_data = [
            # (guest_idx, unit_idx, check_in_offset, stay_days, rate_type, rate, paid, source)
            (0,  0,  -35, 60,  'monthly', 80000,  80000,  'direct'),    # оплачен
            (1,  1,  -10, 30,  'monthly', 75000,  0,      'instagram'), # должник
            (2,  2,  -28, 30,  'monthly', 80000,  80000,  'krisha'),    # оплачен
            (3,  3,  -5,  30,  'monthly', 70000,  35000,  'direct'),    # частичная оплата
            (4,  4,  -60, 90,  'monthly', 80000,  160000, 'referral'),  # 2 месяца оплачено
            (5,  5,  -7,  14,  'weekly',  25000,  25000,  'olx'),       # недельный, оплачен
            (6,  6,  -3,  14,  'weekly',  25000,  0,      'instagram'), # недельный, должник
            (7,  7,  -20, 30,  'monthly', 75000,  75000,  'direct'),    # оплачен
            (8,  8,  -15, 30,  'monthly', 80000,  40000,  'krisha'),    # частичная
            (9,  9,  -2,  7,   'weekly',  22000,  22000,  'direct'),    # краткосрочный
            (10, 10, -45, 60,  'monthly', 78000,  78000,  'referral'),  # оплачен
            (11, 11, -8,  30,  'monthly', 72000,  0,      'olx'),       # должник
        ]

        stay_objs = []
        for sd in stays_data:
            gi, ui, ci_offset, days, rtype, rate, paid, source = sd
            check_in = today + timedelta(days=ci_offset)
            check_out = check_in + timedelta(days=days)

            # Не создавать если уже занят юнит
            unit = all_units[ui]
            existing = Stay.objects.filter(
                organization=org, unit=unit, status='active'
            ).first()
            if existing:
                stay_objs.append(existing)
                continue

            stay = Stay.objects.create(
                organization=org,
                unit=unit,
                guest=guest_objs[gi],
                check_in_date=check_in,
                expected_check_out_date=check_out,
                rate_type=rtype,
                rate_amount=Decimal(str(rate)),
                deposit_amount=Decimal('5000'),
                status='active',
                source=source,
                created_by=admin,
            )
            stay_objs.append(stay)

            # Установить статус юнита
            unit.status = 'occupied'
            unit.save()

            # Создать оплату если есть
            if paid > 0:
                Payment.objects.get_or_create(
                    stay=stay,
                    amount=Decimal(str(paid)),
                    defaults={
                        'payment_date': check_in + timedelta(days=1),
                        'method': random.choice(['cash', 'kaspi', 'kaspi']),
                        'received_by': admin,
                    }
                )

        self.stdout.write(f'  ✓ Заездов создано: {len(stays_data)}')

        # ── 7. Расходы за текущий месяц ───────────────────────────────────────
        expenses_data = [
            ('utility',     35000,  'Коммуналка — электричество, вода'),
            ('utility',     8000,   'Интернет'),
            ('supply',      15000,  'Постельное бельё, полотенца'),
            ('supply',      7500,   'Бытовая химия'),
            ('maintenance', 25000,  'Ремонт кровати в комнате 3'),
            ('advertising', 12000,  'Реклама Instagram'),
        ]

        for cat, amount, desc in expenses_data:
            Expense.objects.get_or_create(
                organization=org,
                property=prop,
                category=cat,
                amount=Decimal(str(amount)),
                description=desc,
                defaults={'date': today.replace(day=max(1, today.day - random.randint(1, 15)))},
            )

        self.stdout.write(f'  ✓ Расходов: {len(expenses_data)}')

        # ── 8. Лиды в воронке ────────────────────────────────────────────────
        leads_data = [
            ('Серик Абдрахман',   '+77025551001', 'new',               'Хочет место на месяц, бюджет 80к'),
            ('Айша Мусина',       '+77025551002', 'viewing_scheduled', 'Интересует отдельная комната'),
            ('Дмитрий Ковалев',   '+77025551003', 'viewed',            'Смотрел вчера, торгуется'),
            ('Малика Сарсенова',  '+77025551004', 'negotiating',       'Хочет скидку на 2 месяца'),
            ('Ильяс Жексенов',    '+77025551005', 'won',               'Заселился в комнату 4'),
            ('Анна Соколова',     '+77025551006', 'lost',              'Нашла дешевле на OLX'),
        ]

        for name, phone, status, notes in leads_data:
            Lead.objects.get_or_create(
                phone=phone,
                organization=org,
                defaults={
                    'name': name,
                    'status': status,
                    'notes': notes,
                }
            )

        self.stdout.write(f'  ✓ Лидов: {len(leads_data)}')

        # ── Итог ─────────────────────────────────────────────────────────────
        self.stdout.write('\n✅ Демо-данные загружены успешно!')
        self.stdout.write('   Войди на http://localhost:3000 как admin / admin')
        self.stdout.write(f'   Активных заездов: {Stay.objects.filter(organization=org, status="active").count()}')
        self.stdout.write(f'   Свободных мест: {Unit.objects.filter(organization=org, status="available").count()}')
