#!/bin/bash

# Синхронизация файлов certbot между хостом и контейнером
echo "Синхронизация файлов certbot..."

# Создаем директорию на хосте
sudo mkdir -p /var/www/certbot-host/.well-known/acme-challenge

# Копируем файлы из контейнера на хост
sudo docker cp nginx:/var/www/certbot/.well-known/acme-challenge/ /var/www/certbot-host/.well-known/

echo "Файлы синхронизированы!"

