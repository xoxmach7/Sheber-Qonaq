from .base import *
from decouple import config as env

DEBUG = True

# debug_toolbar опционален — не ломаем запуск если не установлен
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
except ImportError:
    pass

INTERNAL_IPS = ['127.0.0.1']

# Если USE_SQLITE=true в .env — используем SQLite (без Docker/PostgreSQL)
if env('USE_SQLITE', default='false').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
