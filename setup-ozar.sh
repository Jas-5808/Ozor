#!/bin/bash

echo "=== Настройка ozar.uz -> localhost:5176 ==="
echo ""

# Проверяем, добавлен ли домен в hosts
if ! grep -q "ozar.uz" /etc/hosts; then
    echo "❌ Домен ozar.uz не найден в /etc/hosts"
    echo "Запустите: ./setup-dns.sh"
    echo ""
else
    echo "✅ Домен ozar.uz найден в /etc/hosts"
fi

# Проверяем, запущен ли Vite на порту 5174
if ! curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "❌ Vite сервер не запущен на порту 5174"
    echo "Запустите: npm run dev"
    echo ""
else
    echo "✅ Vite сервер работает на порту 5174"
fi

echo ""
echo "Для запуска прокси-сервера выполните:"
echo "./start-proxy.sh"
echo ""
echo "После этого откройте в браузере: http://ozar.uz"
