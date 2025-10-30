#!/bin/sh
set -e

# Выбираем шаблон конфигурации в зависимости от переменной USE_SSL
if [ "$USE_SSL" = "true" ]; then
    echo "USE_SSL is true. Generating HTTPS config."
    TEMPLATE_FILE=/etc/nginx/templates/default.conf.ssl.template
else
    echo "USE_SSL is not true. Generating HTTP config."
    TEMPLATE_FILE=/etc/nginx/templates/default.conf.nossl.template
fi

# Подставляем переменные окружения в выбранный шаблон
envsubst '$DOMAIN_NAME' < "$TEMPLATE_FILE" > /etc/nginx/conf.d/default.conf

# Выводим результат для отладки
echo "--- Generated Nginx config ---"
cat /etc/nginx/conf.d/default.conf
echo "------------------------------"

# Запускаем Nginx в foreground режиме (стандартная практика для Docker)
exec nginx -g 'daemon off;'
