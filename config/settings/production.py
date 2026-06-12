"""
Production settings — Railway deployment.
"""
from .base import *
import dj_database_url
from decouple import config as env

DEBUG = False

SECRET_KEY = env('SECRET_KEY')

ALLOWED_HOSTS = env('ALLOWED_HOSTS', default='*').split(',')

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

# ── CORS — разрешаем с фронтенда Railway ──────────────────────────────────────
FRONTEND_URL = env('FRONTEND_URL', default='')
if FRONTEND_URL:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
    CORS_ALLOW_CREDENTIALS = True
else:
    # Если FRONTEND_URL не задан — разрешаем всё (для пилота)
    CORS_ALLOW_ALL_ORIGINS = True

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
