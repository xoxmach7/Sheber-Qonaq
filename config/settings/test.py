"""
Настройки для тестов (pytest / CI).
SQLite в памяти — быстро, без внешних сервисов (Postgres/Redis не нужны).
"""
from .base import *  # noqa

# Быстрая БД в памяти
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Кэш в памяти процесса вместо Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Celery выполняет задачи синхронно (без брокера)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Быстрый хэш паролей для тестов
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Детерминированный ключ шифрования для тестов ИИН
FIELD_ENCRYPTION_KEY = ''  # пустой -> используется dev-fallback в encryption.py

DEBUG = False
