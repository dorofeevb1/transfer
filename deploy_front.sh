#!/bin/bash
SERVER_IP="37.77.104.201"
PROJECT_PATH="/root/tables"

echo "📦 Собираем Angular (локально)..."
# Тут твоя команда сборки, если ты билдишь сам. Если тебе кидают готовую dist, закомментируй это.
# cd frontend && ng build && cd .. 

echo "🚀 Заливаем файлы..."
# --delete удалит на сервере старые файлы, которых нет в новой сборке (важно для кэша)
rsync -avzP --delete ./frontend/dist/ root@$SERVER_IP:$PROJECT_PATH/frontend/dist/

echo "✅ Фронтенд обновлен! (Перезагрузка не требуется)"
