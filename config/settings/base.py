from pathlib import Path
from decouple import config
import secrets

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECRET_KEY должен быть установлен в .env для production
# В development генерируем случайный ключ при каждом запуске (для безопасности)
SECRET_KEY = config('SECRET_KEY', default=secrets.token_urlsafe(50))

# DEBUG по умолчанию False для безопасности
DEBUG = config('DEBUG', default=False, cast=bool)

# ALLOWED_HOSTS требует явного указания доменов в .env
# Для development используйте: ALLOWED_HOSTS=localhost,127.0.0.1
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# Applications
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
]

LOCAL_APPS = [
    'apps.core',
    'apps.organizations',
    'apps.users',
    'apps.properties',
    'apps.guests',
    'apps.stays',
    'apps.payments',
    'apps.leads',
    'apps.blacklist',
    'apps.notifications',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='sheber_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Custom User model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Almaty'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_RATES': {
        'signup': '5/hour',
    },
}

# JWT
from datetime import timedelta
SIMPLE_JWT = {
    # Access token живёт 30 минут. Если утечёт — окно атаки ограничено.
    # Фронтенд автоматически обновляет через /auth/refresh/ при 401.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),

    # Refresh token живёт 14 дней (сессия без повторного логина).
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),

    # Rotate: при каждом /auth/refresh/ выдаётся новый refresh token.
    'ROTATE_REFRESH_TOKENS': True,

    # Blacklist: использованный refresh token немедленно инвалидируется.
    # Без этого флага старый и новый refresh оба работают до expire.
    # Требует rest_framework_simplejwt.token_blacklist в INSTALLED_APPS — уже есть.
    'BLACKLIST_AFTER_ROTATION': True,

    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS - по умолчанию закрыт для безопасности
# Для development установите CORS_ALLOW_ALL=True в .env
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000'
).split(',') if not CORS_ALLOW_ALL_ORIGINS else []
CORS_ALLOW_CREDENTIALS = True

# Redis
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

# Celery
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Encryption key for sensitive fields (IIN)
FIELD_ENCRYPTION_KEY = config('FIELD_ENCRYPTION_KEY', default='')

# Resend — отправка email (подтверждение регистрации и т.п.)
RESEND_API_KEY = config('RESEND_API_KEY', default='')

# Базовый URL фронтенда — используется для ссылок в письмах (confirm_url и т.п.)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# API docs
SPECTACULAR_SETTINGS = {
    'TITLE': 'Sheber Hospitality Platform API',
    'DESCRIPTION': 'PMS для управления объектами размещения',
    'VERSION': '1.0.0',
}
