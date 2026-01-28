# Алиас из ~/.ssh/config
HOST = tables

# Папка на сервере (проверь, как она у тебя называется: tables_project или deploy_project)
REMOTE_PATH = /root/tables

# --- КОМАНДЫ ---

# 1. Обновить Бэкенд (Python)
back:
	@echo "🚀 Заливаем бэкенд..."
	rsync -avzP --exclude '__pycache__' --exclude 'venv' --exclude '.git' --exclude '.env' ./backend/ $(HOST):$(REMOTE_PATH)/backend/
	rsync -avzP ./docker-compose.yml $(HOST):$(REMOTE_PATH)/docker-compose.yml
	rsync -avzP ./nginx/default.conf $(HOST):$(REMOTE_PATH)/nginx/default.conf
	@echo "🔄 Пересобираем контейнеры..."
	ssh $(HOST) "cd $(REMOTE_PATH) && docker compose up -d --build web celery && docker compose restart nginx"
	@echo "✅ Бэкенд готов!"

# 2. Обновить Фронтенд (Angular)
front:
	@echo "🚀 Заливаем фронтенд..."
	# --delete удаляет старые файлы на сервере (важно для кэша)
	rsync -avzP --delete ./frontend/dist/brio-trade-logistic/ $(HOST):$(REMOTE_PATH)/frontend/dist/brio-trade-logistic/
	@echo "✅ Фронтенд обновлен! (Nginx подхватит сам)"

# 3. Полный деплой (если менял всё)
all: back front

# 4. Вспомогательная команда: зайти на сервер
ssh:
	ssh $(HOST)

# 5. Посмотреть логи (последние 100 строк)
logs:
	ssh $(HOST) "cd $(REMOTE_PATH) && docker compose logs --tail=100 -f"