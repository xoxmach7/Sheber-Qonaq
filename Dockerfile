FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Системные зависимости для psycopg2 и Pillow
RUN apt-get update && apt-get install -y \
    libpq-dev gcc libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

RUN SECRET_KEY=collectstatic-build-only DATABASE_URL=sqlite:////tmp/build.db python manage.py collectstatic --noinput

EXPOSE 8080

# Автоматически применяем миграции при каждом старте, затем запускаем сервер
CMD ["sh", "-c", "python manage.py migrate --noinput && python -m gunicorn config.wsgi:application --bind 0.0.0.0:8080 --workers 1 --timeout 120"]
