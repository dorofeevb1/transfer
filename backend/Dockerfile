# Этап 1: Сборка зависимостей
FROM python:3.14-slim-bookworm AS builder

# Системные переменные
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Установка системных зависимостей для сборки
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    git && \
    rm -rf /var/lib/apt/lists/*

# Установка Poetry
RUN pip install --no-cache-dir --upgrade pip poetry

# Настройка Poetry - НЕ создавать виртуальное окружение
RUN poetry config virtualenvs.create false

WORKDIR /app

# Копирование файлов зависимостей для кэширования слоев Docker
COPY pyproject.toml poetry.lock* ./

# Установка зависимостей в системный Python
RUN poetry install --no-interaction --no-ansi --only main --no-root


# Этап 2: Финальный образ
FROM python:3.14-slim-bookworm AS runtime

# Установка системных зависимостей для работы приложения
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Создание непривилегированного пользователя и группы
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Копирование установленных пакетов из стадии builder
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages

# Копирование исполняемых файлов (например, gunicorn) из стадии builder
COPY --from=builder /usr/local/bin /usr/local/bin

# Копирование исходного кода приложения в качестве базового слоя
COPY . .

# Создание директорий для медиа и статичных файлов и передача прав
# Эти директории будут точками монтирования для томов
RUN mkdir -p /app/staticfiles /app/mediafiles && \
    chown -R appuser:appgroup /app

# Переключение на непривилегированного пользователя
USER appuser

# Открытие порта для gunicorn (для внутренней сети Docker)
EXPOSE 8000

# Команда для запуска приложения (будет переопределена в docker-compose)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "brio_backend.wsgi:application"]
