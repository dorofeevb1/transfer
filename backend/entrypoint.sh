#!/bin/sh
# backend/entrypoint.sh

echo "Waiting for postgres..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Миграции только для web контейнера (не для celery)
if [ "$1" != "celery" ]; then
  echo "Applying database migrations..."
  python manage.py migrate
fi

# Выполняем переданную команду
exec "$@"
