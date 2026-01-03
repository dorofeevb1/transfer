#!/bin/bash
SERVER_IP="37.77.104.201"
PROJECT_PATH="/root/tables"

echo "🚀 Заливаем бэкенд..."
# --exclude: не копируем мусор и виртуальное окружение
rsync -avzP --exclude '__pycache__' --exclude 'venv' --exclude '.env' ./backend/ root@$SERVER_IP:$PROJECT_PATH/backend/

echo "🔄 Пересобираем только контейнер Django..."
ssh root@$SERVER_IP "cd $PROJECT_PATH && docker compose up -d --build web"

# Если менялась статика админки, нужно собрать её заново
# ssh root@$SERVER_IP "cd $PROJECT_PATH && docker compose exec web python manage.py collectstatic --noinput"

echo "✅ Бэкенд обновлен!"
