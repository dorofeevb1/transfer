# Этап 1: Сборка Frontend (Angular)
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Устанавливаем Angular CLI глобально
RUN npm install -g @angular/cli

COPY frontend/package.json frontend/package-lock.json ./
# Используем npm install согласно требованию
RUN npm install

COPY frontend/ .
RUN npm run build


# Этап 2: Сборка зависимостей Backend (Python)
FROM python:3.14-slim-bookworm AS backend-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    git && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip poetry
RUN poetry config virtualenvs.create false

WORKDIR /app

COPY backend/pyproject.toml backend/poetry.lock* ./

RUN poetry install --no-interaction --no-ansi --only main --no-root


# Этап 3: Финальный образ Backend
FROM python:3.14-slim-bookworm AS backend-runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

COPY --from=backend-builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

COPY backend/ .

RUN mkdir -p /app/staticfiles /app/mediafiles && \
    chown -R appuser:appgroup /app/staticfiles /app/mediafiles /app/brio_backend /app/apps

USER appuser
EXPOSE 8000


# Этап 4: Финальный образ Nginx
FROM nginx:alpine AS nginx-final

# Устанавливаем только gettext для утилиты envsubst
RUN apk add --no-cache gettext

# Копируем основную конфигурацию Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Удаляем стандартную конфигурацию Nginx, так как наша основная конфигурация будет включать нашу.
RUN rm -f /etc/nginx/conf.d/default.conf

# Копируем шаблоны конфигураций сайта и entrypoint-скрипт
COPY nginx/app.conf.ssl.template /etc/nginx/templates/default.conf.ssl.template
COPY nginx/app.conf.nossl.template /etc/nginx/templates/default.conf.nossl.template
COPY nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Копируем собранные статические файлы Frontend
COPY --from=frontend-builder /app/dist/brio-trade-logistic /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

# Запускаем наш entrypoint-скрипт вместо стандартной команды nginx
CMD ["/entrypoint.sh"]
