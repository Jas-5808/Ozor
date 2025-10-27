#!/bin/bash

echo "=== Настройка https://ozar.uz/ ==="
echo ""

# Проверяем наличие SSL сертификатов
if [ ! -f "ssl/ozar.uz.crt" ] || [ ! -f "ssl/ozar.uz.key" ]; then
    echo "❌ SSL сертификаты не найдены"
    echo "Создаем SSL сертификат..."
    ./create-ssl-cert.sh
    echo ""
fi

# Проверяем DNS
if ! grep -q "ozar.uz" /etc/hosts; then
    echo "❌ Домен ozar.uz не настроен в DNS"
    echo "Запустите: ./setup-dns-final.sh"
    echo ""
else
    echo "✅ Домен ozar.uz настроен в DNS"
fi

# Проверяем Vite сервер
if ! curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "❌ Vite сервер не запущен на порту 5174"
    echo "Запустите: npm run dev"
    echo ""
else
    echo "✅ Vite сервер работает на порту 5174"
fi

echo ""
echo "Для запуска HTTPS прокси-сервера выполните:"
echo "sudo ./start-https-proxy.sh"
echo ""
echo "После этого откройте: https://ozar.uz/"
