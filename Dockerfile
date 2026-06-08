FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

RUN SECRET_KEY=collectstatic-build-only DATABASE_URL=sqlite:////tmp/build.db python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["sh", "-c", "echo CONTAINER_START && python manage.py migrate --noinput && echo MIGRATE_OK && python -m gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 1 --timeout 120 --log-level debug"]
