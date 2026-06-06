#!/bin/bash
exec 2>&1
set -x

echo "=A= STARTUP"
echo "=B= DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE}"
echo "=C= PORT=${PORT}"
echo "=D= DATABASE_URL=${DATABASE_URL:0:30}"

echo "=E= Testing Django import..."
python -c "
import sys
print('Python', sys.version)
try:
    import django
    django.setup()
    print('=F= Django OK')
except Exception as e:
    print('=ERR= Django failed:', e)
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

echo "=G= Running migrate..."
python manage.py migrate --noinput

echo "=H= Starting gunicorn on port ${PORT:-8080}..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers 1 \
    --timeout 120 \
    --log-level debug \
    --access-logfile - \
    --error-logfile -
