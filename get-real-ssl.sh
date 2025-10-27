#!/bin/bash

# Скрипт для получения SSL сертификата с синхронизацией файлов

echo "🔒 Получение SSL сертификата для ozar.uz..."

# Создаем директорию на хосте
echo "ReferalShop" | sudo -S mkdir -p /var/www/certbot-host/.well-known/acme-challenge

# Получаем сертификат
echo "ReferalShop" | sudo -S certbot certonly --webroot -w /var/www/certbot-host -d ozar.uz -d www.ozar.uz --non-interactive --agree-tos --email admin@ozar.uz

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат получен!"
    
    # Копируем сертификаты в контейнер
    echo "📁 Копируем сертификаты в Nginx контейнер..."
    echo "ReferalShop" | sudo -S docker cp /etc/letsencrypt/live/ozar.uz/privkey.pem nginx:/etc/letsencrypt/live/ozar.uz/privkey.pem
    echo "ReferalShop" | sudo -S docker cp /etc/letsencrypt/live/ozar.uz/fullchain.pem nginx:/etc/letsencrypt/live/ozar.uz/fullchain.pem
    
    echo "🎉 SSL сертификат настроен!"
    echo "Теперь https://ozar.uz будет работать без предупреждений!"
else
    echo "❌ Ошибка при получении SSL сертификата"
    echo "Проверьте:"
    echo "1. Домен ozar.uz указывает на этот сервер"
    echo "2. Порты 80 и 443 открыты"
    echo "3. Nginx корректно настроен"
fi
