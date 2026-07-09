"""
Production settings — Railway deployment.
"""
from .base import *
import dj_database_url
from decouple import config as env

DEBUG = False

SECRET_KEY = env('SECRET_KEY')

# Railway домен раздаёт сам себя через RAILWAY_PUBLIC_DOMAIN — добавляем его
# автоматически, чтобы health-check и API не требовали ручной настройки ALLOWED_HOSTS
# на каждый новый деплой. Дополнительные хосты — через .env.
_railway_domain = env('RAILWAY_PUBLIC_DOMAIN', default='')
_default_hosts = _railway_domain if _railway_domain else 'localhost,127.0.0.1'
ALLOWED_HOSTS = env('ALLOWED_HOSTS', default=_default_hosts).split(',')

# ── База данных — Railway даёт DATABASE_URL автоматически ─────────────────────
DATABASE_URL = env('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }

# ── Статика — WhiteNoise (раздаёт сам Django без nginx) ──────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ── Content-Security-Policy ─────────────────────────────────────────────────────
MIDDLEWARE.append('csp.middleware.CSPMiddleware')

# ── CORS — разрешаем только с прод-фронтенда ──────────────────────────────────
# Дефолт — боевой домен Vercel (frontend/, framework vite, проект "i-hostel").
# Переопределяется через FRONTEND_URL в Railway, если домен сменится.
FRONTEND_URL = env('FRONTEND_URL', default='https://i-hostel-ten.vercel.app')
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CORS_ALLOW_CREDENTIALS = True

# ── Redis — опционально (для пилота можно без Celery) ─────────────────────────
REDIS_URL = env('REDIS_URL', default='')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
else:
    # Без Redis — LocMemCache (достаточно для пилота)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
    # Отключаем Celery broker чтобы не пытался подключиться к redis://localhost
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+memory://'

# ── Безопасность ──────────────────────────────────────────────────────────────
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ── Логи ─────────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# ── Sentry — трекинг ошибок в проде ────────────────────────────────────────────
# Опционально: без SENTRY_DSN в окружении просто не активируется, деплой не падает.
SENTRY_DSN = env('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=env('RAILWAY_ENVIRONMENT_NAME', default='production'),
    )

# ── Content-Security-Policy ─────────────────────────────────────────────────────
# Чисто API-бэкенд (DRF + Django admin) — без inline-скриптов на фронте,
# поэтому политика узкая: разрешаем только свой источник и админку.
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")  # Django admin использует inline-стили
CSP_IMG_SRC = ("'self'", 'data:')
CSP_FRAME_ANCESTORS = ("'none'",)
