# Self-Service Signup + Убрать "Тарифный план" из онбординга — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать клиентам самостоятельно регистрироваться (email + подтверждение по ссылке), автоматически заводить организацию/объект с 30-дневным триалом и лимитом 20 юнитов, переводить аккаунт в read-only после истечения триала; убрать неиспользуемое поле "Тарифный план" из формы админского онбординга; подготовить FAQ-контент для внешнего лендинга.

**Architecture:** Переиспользуем логику создания Organization/Property/Manager из существующего `OnboardingView` (`apps/organizations/onboarding.py`), но разбиваем на два шага: `POST /organizations/signup/` создаёт неактивную `SignupRequest` и отправляет письмо со ссылкой через Resend; `POST /organizations/signup/confirm/<token>/` материализует Organization+Property+User и сразу возвращает JWT-токены (как логин). Ограничение "20 юнитов на организацию" валидируется в существующем `UnitViewSet.create`. Read-only после триала реализуется одним DRF permission-классом, навешиваемым на write-эндпоинты `stays` (бронирования). Frontend получает два новых публичных роута (`/signup`, `/signup/confirm/:token`) и баннер триала в layout дашборда.

**Tech Stack:** Django + DRF (backend), React + Vite + TypeScript + React Query + Zustand (frontend), Resend (email, HTTP API, без доп. библиотек — прямой POST-запрос через `requests`).

---

## Часть 0 — Подготовка (блокирующая часть 2)

⚠️ Задачи, отправляющие письма (Task 5, Task 6), **не заработают без `RESEND_API_KEY` в Railway env**. Пользователь подтвердил, что заведёт ключ отдельно и НЕ будет вставлять его в чат — код должен читать его только из переменной окружения. Если к моменту исполнения ключа ещё нет — эти два таска можно писать и тестировать с замоканным вызовом Resend (unit-тесты мокают `send_confirmation_email`), а реальную отправку проверить вручную после того, как ключ появится в Railway.

---

## Часть 1 — Убрать "Тарифный план" из онбординга

### Task 1: Убрать select "Тарифный план" из формы

**Files:**
- Modify: `frontend/src/pages/Onboarding/index.tsx:196-203` (удалить блок), `:61` (оставить состояние как константу)

- [ ] **Step 1: Убрать JSX-блок select**

В [Onboarding/index.tsx](frontend/src/pages/Onboarding/index.tsx) удалить строки 196-203:

```tsx
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Тарифный план</label>
            <select className="input-field" value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="free">Бесплатный</option>
              <option value="basic">Базовый</option>
              <option value="pro">Профессиональный</option>
            </select>
          </div>
```

- [ ] **Step 2: Заменить стейт на константу**

Заменить строку 61:

```tsx
  const [plan, setPlan] = useState('free')
```

на:

```tsx
  const plan = 'free'
```

- [ ] **Step 3: Проверить, что TypeScript не ругается на неиспользуемый `setPlan`**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок (переменная `plan` используется дальше в `handleSubmit`, `setPlan` удалена вместе с `useState`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Onboarding/index.tsx
git commit -m "Убрать select Тарифный план из формы онбординга"
```

---

## Часть 2 — Self-Service Signup

### Task 2: Модель SignupRequest + миграция

**Files:**
- Modify: `apps/organizations/models.py`
- Create: `apps/organizations/migrations/000X_signuprequest.py` (автогенерируется)

- [ ] **Step 1: Добавить модель**

В [apps/organizations/models.py](apps/organizations/models.py) добавить в конец файла:

```python
import uuid
from django.utils import timezone


class SignupRequest(TimestampedModel):
    """
    Заявка на self-service регистрацию. Живёт до подтверждения по email-ссылке,
    после чего материализуется в Organization + Property + User (owner).
    """
    email = models.EmailField(unique=True, verbose_name='Email')
    org_name = models.CharField(max_length=255, verbose_name='Название объекта')
    city = models.CharField(max_length=100, verbose_name='Город')
    booking_mode = models.CharField(
        max_length=20,
        choices=[('hostel', 'Хостел / Отель'), ('cottage', 'Гостевой дом / Баня')],
        default='hostel',
    )
    password_hash = models.CharField(max_length=255, verbose_name='Хэш пароля')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name='Подтверждено')

    class Meta:
        verbose_name = 'Заявка на регистрацию'
        verbose_name_plural = 'Заявки на регистрацию'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} ({"подтверждено" if self.confirmed_at else "ожидает"})'

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=24)
```

- [ ] **Step 2: Добавить поле `trial_ends_at` на Organization**

В той же модели `Organization` (после поля `deposit_percent`, строка ~31) добавить:

```python
    trial_ends_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Триал до',
        help_text='Если задано и дата прошла — организация в read-only режиме (нет активной подписки)',
    )
```

- [ ] **Step 3: Сгенерировать миграцию**

Run: `python manage.py makemigrations organizations`
Expected: создан файл `apps/organizations/migrations/000X_signuprequest_organization_trial_ends_at.py` (или похожее имя), без ошибок.

- [ ] **Step 4: Применить миграцию локально**

Run: `python manage.py migrate organizations`
Expected: `Applying organizations.000X... OK`

- [ ] **Step 5: Commit**

```bash
git add apps/organizations/models.py apps/organizations/migrations/
git commit -m "Добавить модель SignupRequest и поле Organization.trial_ends_at"
```

---

### Task 3: Сервис отправки email через Resend

**Files:**
- Create: `apps/organizations/email.py`
- Modify: `config/settings/base.py`

- [ ] **Step 1: Добавить настройку в settings**

В [config/settings/base.py](config/settings/base.py), рядом с другими `env()`-настройками, добавить:

```python
RESEND_API_KEY = env('RESEND_API_KEY', default='')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')
```

(Если `env('FRONTEND_URL', ...)` уже определён где-то в файле — не дублировать, использовать существующий.)

- [ ] **Step 2: Написать функцию отправки письма**

Create `apps/organizations/email.py`:

```python
"""
Отправка писем через Resend HTTP API (без доп. SDK — прямой POST-запрос).
Требует RESEND_API_KEY в env. Без ключа функция логирует предупреждение
и не падает — signup endpoint должен решить, что делать в этом случае
(см. apps/organizations/signup.py).
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


def send_confirmation_email(to_email: str, confirm_url: str) -> bool:
    """Возвращает True при успешной отправке, False при ошибке или отсутствии ключа."""
    if not settings.RESEND_API_KEY:
        logger.warning('RESEND_API_KEY не задан — письмо на %s не отправлено', to_email)
        return False

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
            json={
                'from': 'Sheber Qonaq <onboarding@resend.dev>',
                'to': [to_email],
                'subject': 'Подтвердите регистрацию в Sheber Qonaq',
                'html': (
                    f'<p>Здравствуйте!</p>'
                    f'<p>Для завершения регистрации перейдите по ссылке:</p>'
                    f'<p><a href="{confirm_url}">{confirm_url}</a></p>'
                    f'<p>Ссылка действует 24 часа.</p>'
                ),
            },
            timeout=10,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception('Ошибка отправки письма через Resend на %s', to_email)
        return False
```

- [ ] **Step 3: Проверить, что `requests` уже в зависимостях**

Run: `python -c "import requests; print(requests.__version__)"`
Expected: печатает версию без `ModuleNotFoundError`. Если модуля нет — добавить `requests` в `requirements.txt` и выполнить `pip install requests`.

- [ ] **Step 4: Commit**

```bash
git add apps/organizations/email.py config/settings/base.py
git commit -m "Добавить сервис отправки email через Resend"
```

---

### Task 4: Serializer + view для `POST /organizations/signup/`

**Files:**
- Create: `apps/organizations/signup.py`
- Modify: `apps/organizations/urls.py`

- [ ] **Step 1: Написать failing-тест**

Create `apps/organizations/test_signup.py`:

```python
"""
Тесты self-service регистрации: подача заявки → письмо → подтверждение
→ создание Organization/Property/User с триалом.
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient

SIGNUP_URL = '/api/v1/organizations/signup/'


def _payload(**over):
    base = {
        'email': 'owner@example.com',
        'password': 'pass12345',
        'org_name': 'Мой Хостел',
        'city': 'Алматы',
        'booking_mode': 'hostel',
    }
    base.update(over)
    return base


@pytest.mark.django_db
class TestSignupRequest:
    def test_creates_signup_request_and_sends_email(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True) as mock_send:
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 201
        mock_send.assert_called_once()
        from apps.organizations.models import SignupRequest
        assert SignupRequest.objects.filter(email='owner@example.com').exists()

    def test_rejects_duplicate_email(self):
        client = APIClient()
        with patch('apps.organizations.signup.send_confirmation_email', return_value=True):
            client.post(SIGNUP_URL, _payload(), format='json')
            response = client.post(SIGNUP_URL, _payload(), format='json')

        assert response.status_code == 400
        assert 'email' in response.data

    def test_rejects_short_password(self):
        client = APIClient()
        response = client.post(SIGNUP_URL, _payload(password='short'), format='json')
        assert response.status_code == 400
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pytest apps/organizations/test_signup.py -v`
Expected: FAIL — `404` (эндпоинта `/organizations/signup/` ещё нет) или `ImportError` для `apps.organizations.signup`.

- [ ] **Step 3: Написать serializer и view**

Create `apps/organizations/signup.py`:

```python
from django.contrib.auth.hashers import make_password
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from apps.organizations.models import SignupRequest
from apps.organizations.email import send_confirmation_email


class SignupRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    org_name = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=100, default='Алматы')
    booking_mode = serializers.ChoiceField(choices=['hostel', 'cottage'], default='hostel')

    def validate_email(self, value):
        value = value.lower()
        from apps.users.models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Этот email уже зарегистрирован. Войдите в аккаунт.')
        if SignupRequest.objects.filter(email__iexact=value, confirmed_at__isnull=True).exists():
            raise serializers.ValidationError(
                'Заявка с этим email уже отправлена. Проверьте почту или подождите 24 часа.'
            )
        return value


class SignupThrottle(AnonRateThrottle):
    scope = 'signup'
    rate = '5/hour'


class SignupRequestView(APIView):
    """
    POST /api/v1/organizations/signup/
    Создаёт заявку на регистрацию и отправляет письмо с ссылкой подтверждения.
    Публичный эндпоинт (без авторизации).
    """
    permission_classes = [AllowAny]
    throttle_classes = [SignupThrottle]

    def post(self, request):
        ser = SignupRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        signup_request = SignupRequest.objects.create(
            email=data['email'],
            org_name=data['org_name'],
            city=data['city'],
            booking_mode=data['booking_mode'],
            password_hash=make_password(data['password']),
        )

        confirm_url = f'{settings.FRONTEND_URL}/signup/confirm/{signup_request.token}'
        send_confirmation_email(signup_request.email, confirm_url)

        return Response(
            {'detail': 'Письмо с подтверждением отправлено на указанный email.'},
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 4: Подключить URL**

В [apps/organizations/urls.py](apps/organizations/urls.py):

```python
from django.urls import path
from .views import OrganizationDetailView
from .onboarding import OnboardingView
from .signup import SignupRequestView

urlpatterns = [
    path('me/', OrganizationDetailView.as_view(), name='organization-me'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('signup/', SignupRequestView.as_view(), name='signup'),
]
```

- [ ] **Step 5: Добавить throttle scope в settings**

В [config/settings/base.py](config/settings/base.py), внутри `REST_FRAMEWORK` (после `'PAGE_SIZE': 50,`), добавить:

```python
    'DEFAULT_THROTTLE_RATES': {
        'signup': '5/hour',
    },
```

- [ ] **Step 6: Запустить тесты — убедиться, что проходят**

Run: `pytest apps/organizations/test_signup.py -v`
Expected: `3 passed`

- [ ] **Step 7: Commit**

```bash
git add apps/organizations/signup.py apps/organizations/urls.py apps/organizations/test_signup.py config/settings/base.py
git commit -m "Добавить endpoint POST /organizations/signup/"
```

---

### Task 5: Endpoint подтверждения `POST /organizations/signup/confirm/<token>/`

⚠️ Требует `RESEND_API_KEY` для e2e-проверки реальной отправки, но сам endpoint подтверждения не отправляет письма — тестируется независимо через мок.

**Files:**
- Modify: `apps/organizations/signup.py`, `apps/organizations/urls.py`
- Modify: `apps/organizations/test_signup.py`

- [ ] **Step 1: Написать failing-тест**

Добавить в `apps/organizations/test_signup.py`:

```python
import uuid
from datetime import timedelta
from django.utils import timezone

CONFIRM_URL = '/api/v1/organizations/signup/confirm/{token}/'


@pytest.mark.django_db
class TestSignupConfirm:
    def _create_signup_request(self, **over):
        from django.contrib.auth.hashers import make_password
        defaults = {
            'email': 'owner@example.com',
            'org_name': 'Мой Хостел',
            'city': 'Алматы',
            'booking_mode': 'hostel',
            'password_hash': make_password('pass12345'),
        }
        defaults.update(over)
        return SignupRequest.objects.create(**defaults)

    def test_confirms_and_creates_organization(self):
        signup_request = self._create_signup_request()
        client = APIClient()

        response = client.post(CONFIRM_URL.format(token=signup_request.token))

        assert response.status_code == 201
        assert 'access' in response.data
        assert 'refresh' in response.data

        from apps.organizations.models import Organization
        from apps.users.models import User
        org = Organization.objects.get(name='Мой Хостел')
        assert org.trial_ends_at is not None
        assert org.trial_ends_at > timezone.now() + timedelta(days=29)

        user = User.objects.get(email='owner@example.com')
        assert user.organization_id == org.id
        assert user.role == 'owner'

        signup_request.refresh_from_db()
        assert signup_request.confirmed_at is not None

    def test_rejects_unknown_token(self):
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=uuid.uuid4()))
        assert response.status_code == 404

    def test_rejects_already_confirmed(self):
        signup_request = self._create_signup_request(confirmed_at=timezone.now())
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=signup_request.token))
        assert response.status_code == 400

    def test_rejects_expired_request(self):
        signup_request = self._create_signup_request()
        signup_request.created_at = timezone.now() - timedelta(hours=25)
        signup_request.save(update_fields=['created_at'])
        client = APIClient()
        response = client.post(CONFIRM_URL.format(token=signup_request.token))
        assert response.status_code == 400
```

Добавить импорт `SignupRequest` в начало файла: `from apps.organizations.models import SignupRequest`.

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pytest apps/organizations/test_signup.py::TestSignupConfirm -v`
Expected: FAIL — `404` для всех (эндпоинта подтверждения ещё нет).

- [ ] **Step 3: Написать view подтверждения**

В `apps/organizations/signup.py` добавить (используя `Property`, `timezone`, `get_object_or_404` — импорты ниже):

```python
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import Organization
from apps.properties.models import Property

User = get_user_model()


class SignupConfirmView(APIView):
    """
    POST /api/v1/organizations/signup/confirm/<token>/
    Материализует Organization + Property + User (owner) из SignupRequest,
    ставит trial_ends_at = now + 30 дней, возвращает JWT-токены как логин.
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        signup_request = get_object_or_404(SignupRequest, token=token)

        if signup_request.confirmed_at is not None:
            return Response({'detail': 'Заявка уже подтверждена.'}, status=status.HTTP_400_BAD_REQUEST)
        if signup_request.is_expired:
            return Response(
                {'detail': 'Ссылка истекла. Зарегистрируйтесь заново.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            slug = signup_request.org_name.lower().replace(' ', '-')[:100]
            base, counter = slug, 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f'{base}-{counter}'
                counter += 1

            org = Organization.objects.create(
                name=signup_request.org_name,
                slug=slug,
                plan='free',
                trial_ends_at=timezone.now() + timedelta(days=30),
                contact_email=signup_request.email,
            )
            Property.objects.create(
                organization=org,
                name=signup_request.org_name,
                city=signup_request.city,
                address='',
                booking_mode=signup_request.booking_mode,
            )
            username_base = signup_request.email.split('@')[0]
            username, counter = username_base, 1
            while User.objects.filter(username=username).exists():
                username = f'{username_base}{counter}'
                counter += 1

            user = User(
                username=username,
                email=signup_request.email,
                role='owner',
                organization=org,
            )
            user.password = signup_request.password_hash
            user.save()

            signup_request.confirmed_at = timezone.now()
            signup_request.save(update_fields=['confirmed_at'])

        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh)},
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 4: Подключить URL**

В [apps/organizations/urls.py](apps/organizations/urls.py) добавить импорт и путь:

```python
from .signup import SignupRequestView, SignupConfirmView

urlpatterns = [
    path('me/', OrganizationDetailView.as_view(), name='organization-me'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('signup/', SignupRequestView.as_view(), name='signup'),
    path('signup/confirm/<uuid:token>/', SignupConfirmView.as_view(), name='signup-confirm'),
]
```

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `pytest apps/organizations/test_signup.py -v`
Expected: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/organizations/signup.py apps/organizations/urls.py apps/organizations/test_signup.py
git commit -m "Добавить endpoint подтверждения регистрации и материализацию Organization"
```

---

### Task 6: Лимит 20 юнитов на организацию

**Files:**
- Modify: `apps/properties/views.py` (найти `UnitViewSet`)
- Create/Modify: `apps/properties/test_unit_limit.py`

- [ ] **Step 1: Найти текущий `UnitViewSet.create` / `perform_create`**

Run: `grep -n "class UnitViewSet" -A 20 apps/properties/views.py`

Изучить текущую реализацию `perform_create` (или её отсутствие — тогда DRF использует стандартный `create`), чтобы встроить проверку лимита без дублирования существующей логики привязки к организации.

- [ ] **Step 2: Написать failing-тест**

Create `apps/properties/test_unit_limit.py`:

```python
"""
Лимит 20 юнитов на организацию (защита self-service free-триала от злоупотреблений).
"""
import pytest
from rest_framework.test import APIClient
from apps.organizations.models import Organization
from apps.properties.models import Property, Room
from apps.users.models import User

UNITS_URL = '/api/v1/units/'


@pytest.fixture
def org(db):
    return Organization.objects.create(name='Тест Хостел', slug='test-hostel', plan='free')


@pytest.fixture
def prop(org):
    return Property.objects.create(organization=org, name='Тест', city='Алматы', address='', booking_mode='hostel')


@pytest.fixture
def owner(org):
    return User.objects.create_user(username='owner1', password='pass12345', role='owner', organization=org)


@pytest.fixture
def owner_api(owner):
    client = APIClient()
    client.force_authenticate(user=owner)
    return client


@pytest.mark.django_db
def test_rejects_21st_unit(owner_api, org, prop):
    room = Room.objects.create(organization=org, property=prop, name='Комната', room_type='private', floor=1, max_capacity=1)
    from apps.properties.models import Unit
    for i in range(20):
        Unit.objects.create(organization=org, room=room, name=f'Юнит {i}', unit_type='private_room', status='available')

    response = owner_api.post(UNITS_URL, {'room': room.id, 'name': 'Юнит 21', 'unit_type': 'private_room'}, format='json')

    assert response.status_code == 400
    assert 'юнит' in str(response.data).lower() or 'unit' in str(response.data).lower()
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `pytest apps/properties/test_unit_limit.py -v`
Expected: FAIL — `201` вместо `400` (лимит ещё не реализован).

- [ ] **Step 4: Добавить проверку лимита**

В `apps/properties/views.py`, в `UnitViewSet` добавить метод `perform_create` (если его нет — создать; если есть — дописать проверку в начало):

```python
    def perform_create(self, serializer):
        org = self.request.user.organization
        MAX_UNITS_PER_ORG = 20
        if org.units.count() >= MAX_UNITS_PER_ORG:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'detail': f'Достигнут лимит {MAX_UNITS_PER_ORG} юнитов на объект. '
                            f'Свяжитесь с нами для увеличения лимита.'}
            )
        serializer.save(organization=org)
```

Примечание: если у `UnitViewSet` уже есть `perform_create` с другой логикой (например, привязкой `room`), объединить — сохранить существующее поведение и добавить проверку лимита первой строкой. Если у `Organization` нет related_name `units` — использовать `Unit.objects.filter(organization=org).count()` вместо `org.units.count()`.

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `pytest apps/properties/test_unit_limit.py -v`
Expected: `1 passed`

- [ ] **Step 6: Прогнать полный набор тестов properties, чтобы не сломать существующее**

Run: `pytest apps/properties/ -v`
Expected: все тесты проходят (включая старые).

- [ ] **Step 7: Commit**

```bash
git add apps/properties/views.py apps/properties/test_unit_limit.py
git commit -m "Ограничить создание юнитов лимитом 20 на организацию"
```

---

### Task 7: Read-only после истечения триала

**Files:**
- Create: `apps/core/permissions.py` (добавить класс)
- Modify: `apps/stays/views.py`
- Create: `apps/stays/test_trial_readonly.py`

- [ ] **Step 1: Написать failing-тест**

Create `apps/stays/test_trial_readonly.py`:

```python
"""
После истечения trial_ends_at организация переходит в read-only:
GET разрешён, create/update/delete брони — запрещены (403).
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from apps.organizations.models import Organization
from apps.properties.models import Property, Room, Unit
from apps.users.models import User

STAYS_URL = '/api/v1/stays/'


@pytest.fixture
def expired_org(db):
    return Organization.objects.create(
        name='Истёкший Триал', slug='expired-trial', plan='free',
        trial_ends_at=timezone.now() - timedelta(days=1),
    )


@pytest.fixture
def active_org(db):
    return Organization.objects.create(
        name='Активный Триал', slug='active-trial', plan='free',
        trial_ends_at=timezone.now() + timedelta(days=10),
    )


def _owner_api(org):
    user = User.objects.create_user(username=f'owner_{org.id}', password='pass12345', role='owner', organization=org)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_expired_trial_blocks_stay_creation(expired_org):
    prop = Property.objects.create(organization=expired_org, name='X', city='Алматы', address='', booking_mode='hostel')
    room = Room.objects.create(organization=expired_org, property=prop, name='R', room_type='private', floor=1, max_capacity=1)
    unit = Unit.objects.create(organization=expired_org, room=room, name='U', unit_type='private_room', status='available')
    client = _owner_api(expired_org)

    response = client.post(STAYS_URL, {'unit': unit.id, 'check_in': '2026-08-01', 'check_out': '2026-08-02'}, format='json')

    assert response.status_code == 403

    get_response = client.get(STAYS_URL)
    assert get_response.status_code == 200


@pytest.mark.django_db
def test_active_trial_allows_stay_creation(active_org):
    from apps.guests.models import Guest
    prop = Property.objects.create(organization=active_org, name='X', city='Алматы', address='', booking_mode='hostel')
    room = Room.objects.create(organization=active_org, property=prop, name='R', room_type='private', floor=1, max_capacity=1)
    unit = Unit.objects.create(organization=active_org, room=room, name='U', unit_type='private_room', status='available')
    client = _owner_api(active_org)

    response = client.post(STAYS_URL, {'unit': unit.id, 'check_in': '2026-08-01', 'check_out': '2026-08-02'}, format='json')

    assert response.status_code in (200, 201)
```

Примечание для исполнителя: перед запуском проверить в `apps/stays/serializers.py`, какие поля реально обязательны для создания `Stay` (может требоваться `guest`) — при необходимости дополнить payload теста, не меняя намерение теста (что 403/201 отличаются только наличием активного триала).

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pytest apps/stays/test_trial_readonly.py -v`
Expected: FAIL на `test_expired_trial_blocks_stay_creation` — сейчас вернётся `201` (или другая ошибка валидации, не `403`), т.к. проверки триала ещё нет.

- [ ] **Step 3: Добавить permission-класс**

В [apps/core/permissions.py](apps/core/permissions.py) добавить в конец:

```python
from django.utils import timezone

SAFE_METHODS_READONLY = ('GET', 'HEAD', 'OPTIONS')


class TrialNotExpired(BasePermission):
    """
    Блокирует изменяющие запросы (POST/PUT/PATCH/DELETE), если у организации
    истёк триал (trial_ends_at в прошлом) и нет активной оплаченной подписки.
    Организации без trial_ends_at (созданные вручную через /onboarding/) не ограничены.
    """
    message = 'Пробный период закончился. Доступ только для просмотра. Свяжитесь с нами для подключения подписки.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS_READONLY:
            return True
        org = getattr(request.user, 'organization', None)
        if org is None or org.trial_ends_at is None:
            return True
        return timezone.now() <= org.trial_ends_at
```

- [ ] **Step 4: Подключить к `StayViewSet`**

В [apps/stays/views.py](apps/stays/views.py), строка ~21, изменить:

```python
class StayViewSet(OrganizationMixin, viewsets.ModelViewSet):
    ...
    permission_classes = [IsAuthenticated, IsReception]
```

на:

```python
class StayViewSet(OrganizationMixin, viewsets.ModelViewSet):
    ...
    permission_classes = [IsAuthenticated, IsReception, TrialNotExpired]
```

И добавить импорт `TrialNotExpired` из `apps.core.permissions` в начало файла.

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `pytest apps/stays/test_trial_readonly.py -v`
Expected: `2 passed`

- [ ] **Step 6: Прогнать полный набор тестов stays, чтобы не сломать существующее**

Run: `pytest apps/stays/ -v`
Expected: все тесты проходят.

- [ ] **Step 7: Commit**

```bash
git add apps/core/permissions.py apps/stays/views.py apps/stays/test_trial_readonly.py
git commit -m "Блокировать изменение броней после истечения триала (read-only)"
```

---

### Task 8: Frontend — страница `/signup`

**Files:**
- Create: `frontend/src/pages/Signup/index.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Проверить существующий паттерн публичной страницы (LoginPage) для консистентности стиля**

Run: `sed -n '1,50p' frontend/src/pages/Login/index.tsx` (или актуальный путь — найти через `grep -rn "LoginPage" frontend/src/App.tsx`)

Скопировать общую структуру (обёртка, инпуты `.input-field`, кнопка) — не выдумывать новый стиль.

- [ ] **Step 2: Написать страницу**

Create `frontend/src/pages/Signup/index.tsx`:

```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import api from '../../api/client'

interface SignupPayload {
  email: string; password: string; org_name: string; city: string; booking_mode: 'hostel' | 'cottage'
}

const signupApi = (payload: SignupPayload) =>
  api.post('/organizations/signup/', payload).then(r => r.data)

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [city, setCity] = useState('Алматы')
  const [bookingMode, setBookingMode] = useState<'hostel' | 'cottage'>('hostel')

  const mutation = useMutation({ mutationFn: signupApi })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password, org_name: orgName, city, booking_mode: bookingMode })
  }

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Проверьте почту</h2>
          <p className="text-sm text-gray-500">
            Мы отправили ссылку для подтверждения на {email}. Перейдите по ней, чтобы завершить регистрацию.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-3">
        <h1 className="text-xl font-extrabold text-gray-900">Регистрация</h1>
        <p className="text-sm text-gray-400">Бесплатно на 30 дней, без карты</p>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email *</label>
          <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Пароль *</label>
          <input type="password" required minLength={8} className="input-field" placeholder="Минимум 8 символов"
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Название объекта *</label>
          <input required className="input-field" placeholder="Дом на Абая" value={orgName} onChange={e => setOrgName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Город</label>
          <input className="input-field" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setBookingMode('hostel')}
            className={`py-2.5 rounded-xl border-2 text-sm font-semibold ${bookingMode === 'hostel' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            Хостел / Отель
          </button>
          <button type="button" onClick={() => setBookingMode('cottage')}
            className={`py-2.5 rounded-xl border-2 text-sm font-semibold ${bookingMode === 'cottage' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            Гостевой дом
          </button>
        </div>

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
            {(mutation.error as any)?.response?.data?.email?.[0] || 'Ошибка. Проверьте данные.'}
          </div>
        )}

        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 bg-primary-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
          {mutation.isPending ? 'Отправляем...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Подключить публичный роут**

В [frontend/src/App.tsx](frontend/src/App.tsx), рядом со строкой `<Route path="/login" element={<LoginPage />} />` (строка 43), добавить:

```tsx
        <Route path="/signup" element={<SignupPage />} />
```

И импорт в начало файла:

```tsx
import SignupPage from './pages/Signup'
```

- [ ] **Step 4: Проверить типы**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Signup/index.tsx frontend/src/App.tsx
git commit -m "Добавить публичную страницу регистрации /signup"
```

---

### Task 9: Frontend — страница подтверждения `/signup/confirm/:token`

**Files:**
- Create: `frontend/src/pages/SignupConfirm/index.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Написать страницу**

Create `frontend/src/pages/SignupConfirm/index.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'

export default function SignupConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    if (!token) return
    api.post(`/organizations/signup/confirm/${token}/`)
      .then(r => {
        localStorage.setItem('access_token', r.data.access)
        localStorage.setItem('refresh_token', r.data.refresh)
        navigate('/dashboard')
      })
      .catch(() => setStatus('error'))
  }, [token, navigate])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Ссылка недействительна</h2>
          <p className="text-sm text-gray-500">Возможно, она устарела или уже была использована.</p>
          <Link to="/signup" className="text-primary-600 text-sm font-semibold">Зарегистрироваться заново</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">Подтверждаем регистрацию...</p>
    </div>
  )
}
```

- [ ] **Step 2: Подключить роут**

В [frontend/src/App.tsx](frontend/src/App.tsx) добавить рядом с `/signup`:

```tsx
        <Route path="/signup/confirm/:token" element={<SignupConfirmPage />} />
```

И импорт:

```tsx
import SignupConfirmPage from './pages/SignupConfirm'
```

- [ ] **Step 3: Проверить типы**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SignupConfirm/index.tsx frontend/src/App.tsx
git commit -m "Добавить страницу подтверждения регистрации /signup/confirm/:token"
```

---

### Task 10: Frontend — баннер триала в дашборде

**Files:**
- Modify: найти основной layout-компонент (проверить `frontend/src/App.tsx:44-51`, обычно `Layout` или `AppLayout`)
- Modify: `frontend/src/types/index.ts` (добавить `trial_ends_at` в тип `Organization`, если такой тип существует, иначе — в тип `User`/ответ `/organizations/me/`)

- [ ] **Step 1: Найти layout-компонент и текущий тип организации**

Run: `grep -n "element={<Navigate" -B 10 frontend/src/App.tsx` — найти компонент-обёртку защищённых роутов (строки 44-51).
Run: `grep -rn "interface Organization" frontend/src/types/`

- [ ] **Step 2: Добавить поле в тип**

В найденном файле типов (например `frontend/src/types/index.ts`) в интерфейсе `Organization` (или создать, если типизация организации инлайновая) добавить:

```ts
trial_ends_at: string | null
```

- [ ] **Step 3: Написать баннер**

Create `frontend/src/components/TrialBanner.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface OrgInfo { trial_ends_at: string | null }

const fetchOrg = () => api.get<OrgInfo>('/organizations/me/').then(r => r.data)

export default function TrialBanner() {
  const { data } = useQuery({ queryKey: ['organization-me'], queryFn: fetchOrg })

  if (!data?.trial_ends_at) return null

  const daysLeft = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86_400_000)

  if (daysLeft > 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center font-medium">
        Осталось {daysLeft} {daysLeft === 1 ? 'день' : 'дней'} бесплатного периода
      </div>
    )
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 text-center font-medium">
      Пробный период закончился. Доступ только для просмотра. Свяжитесь с нами для подключения подписки.
    </div>
  )
}
```

- [ ] **Step 4: Подключить баннер в layout**

В найденном на Step 1 layout-компоненте добавить `<TrialBanner />` сразу после открывающего тега основного контейнера (перед контентом страниц, после топбара — конкретное место определить по структуре компонента при исполнении, ориентируясь на то, что баннер должен быть виден на всех защищённых страницах).

- [ ] **Step 5: Проверить типы**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TrialBanner.tsx frontend/src/types/ <layout-file>
git commit -m "Добавить баннер триала в дашборд"
```

---

## Часть 3 — FAQ для лендинга

### Task 11: Написать FAQ-контент

**Files:**
- Create: `docs/faq-signup.md`

- [ ] **Step 1: Написать файл**

Create `docs/faq-signup.md`:

```markdown
# FAQ — Регистрация в Sheber Qonaq

**Этот файл предназначен для копирования на внешний лендинг. Не рендерится внутри приложения.**

## Как зарегистрироваться?

Перейдите на страницу регистрации, укажите email, пароль и название вашего объекта
(хостела, гостевого дома или бани). Мы отправим письмо со ссылкой подтверждения —
перейдите по ней, и аккаунт будет создан автоматически. Вы сразу попадёте в систему.

## Что входит в бесплатный период?

30 дней полного доступа: неограниченное количество бронирований, до 20 комнат/юнитов
на один объект, все основные функции — карта размещения, гости, финансы, отчёты.

## Есть ли ограничения на бесплатном периоде?

Да — один объект размещения на одну регистрацию и максимум 20 юнитов
(комнат, домиков или койко-мест) в этом объекте. Это защита от злоупотреблений;
если вам нужно больше — свяжитесь с нами, обсудим индивидуальные условия.

## Что будет через 30 дней?

Если вы не подключите платную подписку, аккаунт перейдёт в режим "только просмотр":
вся история броней, гостей и финансов останется доступна, но создавать и редактировать
новые записи будет нельзя, пока не оформите подписку.

## Как оформить платную подписку?

Свяжитесь с нами любым удобным способом (контакты — на сайте). Мы поможем подобрать
тариф под ваш объект и снимем ограничение бесплатного периода.

## Не пришло письмо с подтверждением

Проверьте папку "Спам". Ссылка действительна 24 часа — если она устарела,
зарегистрируйтесь ещё раз с тем же email.

## Можно ли зарегистрировать несколько объектов на один email?

На данный момент — нет, одна регистрация создаёт один объект. Если у вас несколько
объектов, напишите нам, поможем настроить multi-property доступ вручную.
```

- [ ] **Step 2: Commit**

```bash
git add docs/faq-signup.md
git commit -m "Добавить FAQ-контент для лендинга по self-service регистрации"
```

---

## Финальная проверка

- [ ] **Step 1: Прогнать весь backend test suite**

Run: `pytest`
Expected: все тесты проходят (включая новые из Tasks 4, 5, 6, 7 и существующие 54+).

- [ ] **Step 2: Прогнать typecheck фронтенда**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Ручная проверка (после того как RESEND_API_KEY добавлен в Railway/локальный .env)**

1. `POST /api/v1/organizations/signup/` с реальным email → проверить, что письмо пришло.
2. Перейти по ссылке из письма → проверить, что аккаунт создан и происходит редирект на `/dashboard`.
3. Вручную выставить `trial_ends_at` в прошлое через Django admin → проверить, что создание брони возвращает 403, а список броней (GET) всё ещё открыт.
