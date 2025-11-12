# Настройка nginx для robots.txt и sitemap.xml

## Проблема
В dev режиме nginx проксирует все запросы на Vite, который возвращает HTML для всех маршрутов (SPA fallback). Это приводит к тому, что `/robots.txt` возвращает HTML вместо текстового файла.

## Решение

### Для Production (после сборки)
После выполнения `npm run build`, файлы из `public/` будут скопированы в `dist/`. 
Нужно настроить nginx для обслуживания статических файлов напрямую:

```nginx
# Serve static files from dist directory
location ~* ^/(robots\.txt|sitemap\.xml|favicon\.ico)$ {
    root /path/to/client/dist;
    add_header Content-Type text/plain;
    expires 1d;
    add_header Cache-Control "public, max-age=86400";
    access_log off;
}
```

### Для Dev режима
Vite автоматически обслуживает файлы из `public/` директории. 
Убедитесь, что файлы `robots.txt` и `sitemap.xml` находятся в `Ozor/client/public/`.

## Проверка
После настройки проверьте:
- `https://ozar.uz/robots.txt` - должен возвращать текстовый файл
- `https://ozar.uz/sitemap.xml` - должен возвращать XML файл

