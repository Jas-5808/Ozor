#!/bin/bash

echo "Настройка локального DNS для ozar.uz..."
echo "Вам потребуется ввести пароль для sudo"

# Проверяем, есть ли уже запись
if grep -q "ozar.uz" /etc/hosts; then
    echo "✅ Запись ozar.uz уже существует в /etc/hosts"
else
    echo "127.0.0.1 ozar.uz" | sudo tee -a /etc/hosts
    echo "127.0.0.1 www.ozar.uz" | sudo tee -a /etc/hosts
    echo "✅ DNS записи добавлены!"
fi

echo ""
echo "Теперь ozar.uz будет перенаправляться на localhost"
echo "Для полной настройки HTTPS запустите: ./setup-https.sh"
