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
# SQLITE_PATH можно переопределить для сред где BASE_DIR на network/VirtioFS mount
if env('USE_SQLITE', default='false').lower() == 'true':
    _sqlite_path = env('SQLITE_PATH', default=str(BASE_DIR / 'db.sqlite3'))
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': _sqlite_path,
        }
    }
