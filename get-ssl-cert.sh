#!/bin/bash

echo "=== Получение SSL сертификата для ozar.uz ==="
echo ""

# Проверяем, что домен настроен в Nginx
if [ ! -f "/etc/nginx/sites-enabled/ozar.uz.conf" ]; then
    echo "❌ Сайт ozar.uz не настроен в Nginx"
    echo "Запустите: ./setup-nginx.sh"
    exit 1
fi

# Проверяем, что Nginx работает
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ Nginx не запущен"
    echo "Запустите: sudo systemctl start nginx"
    exit 1
fi

echo "✅ Nginx запущен и сайт настроен"
echo ""

# Получаем SSL сертификат
echo "🔒 Получаем SSL сертификат от Let's Encrypt..."
sudo certbot --nginx -d ozar.uz -d www.ozar.uz --non-interactive --agree-tos --email admin@ozar.uz

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SSL сертификат успешно получен!"
    echo ""
    echo "✅ Сайт теперь доступен по адресу:"
    echo "   https://ozar.uz"
    echo "   https://www.ozar.uz"
    echo ""
    echo "🔄 Сертификат будет автоматически обновляться"
else
    echo "❌ Ошибка при получении SSL сертификата"
    echo "Проверьте:"
    echo "1. Домен ozar.uz указывает на этот сервер"
    echo "2. Порты 80 и 443 открыты"
    echo "3. Nginx корректно настроен"
fi
