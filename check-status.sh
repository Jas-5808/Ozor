#!/bin/bash

echo "=== Статус ozar.uz ==="
echo ""

# Проверяем Vite сервер
if curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "✅ Vite сервер: работает на порту 5174"
else
    echo "❌ Vite сервер: не запущен"
fi

# Проверяем Nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx: запущен"
else
    echo "❌ Nginx: не запущен"
fi

# Проверяем конфигурацию сайта
if [ -f "/etc/nginx/sites-enabled/ozar.uz.conf" ]; then
    echo "✅ Конфигурация ozar.uz: активна"
else
    echo "❌ Конфигурация ozar.uz: не найдена"
fi

# Проверяем SSL сертификат
if [ -f "/etc/letsencrypt/live/ozar.uz/fullchain.pem" ]; then
    echo "✅ SSL сертификат: установлен"
    
    # Проверяем срок действия сертификата
    expiry=$(sudo openssl x509 -in /etc/letsencrypt/live/ozar.uz/fullchain.pem -noout -enddate | cut -d= -f2)
    echo "   Срок действия: $expiry"
else
    echo "❌ SSL сертификат: не установлен"
fi

# Проверяем доступность сайта
if curl -s -o /dev/null -w "%{http_code}" http://ozar.uz | grep -q "200\|301\|302"; then
    echo "✅ HTTP доступ: работает"
else
    echo "❌ HTTP доступ: не работает"
fi

if [ -f "/etc/letsencrypt/live/ozar.uz/fullchain.pem" ]; then
    if curl -s -k -o /dev/null -w "%{http_code}" https://ozar.uz | grep -q "200"; then
        echo "✅ HTTPS доступ: работает"
    else
        echo "❌ HTTPS доступ: не работает"
    fi
fi

echo ""
echo "📝 Для полной настройки выполните:"
echo "1. ./setup-nginx.sh"
echo "2. ./get-ssl-cert.sh"
