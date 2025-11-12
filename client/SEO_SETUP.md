# Настройка SEO файлов (robots.txt и sitemap.xml)

## Проблема
В dev режиме nginx проксирует все запросы на Vite, который возвращает HTML для всех маршрутов (SPA fallback). Это приводит к тому, что `/robots.txt` возвращает HTML вместо текстового файла.

## Решение

### 1. Файлы созданы
- ✅ `public/robots.txt` - создан и настроен
- ✅ `public/sitemap.xml` - создан и настроен

### 2. Проверка в dev режиме
Vite автоматически обслуживает файлы из `public/` директории. Проверьте:
- `http://localhost:5174/robots.txt` - должен возвращать текстовый файл
- `http://localhost:5174/sitemap.xml` - должен возвращать XML файл

### 3. Настройка nginx
В конфигурации nginx (`ozar-frontend-https.conf`) уже добавлены специальные location блоки для `robots.txt` и `sitemap.xml`, которые должны иметь приоритет над общим `location /` блоком.

### 4. Для Production
После выполнения `npm run build`, файлы из `public/` будут скопированы в `dist/`. 
В production nginx должен обслуживать эти файлы напрямую из `dist/`:

```nginx
# Serve static files from dist directory (production)
location ~* ^/(robots\.txt|sitemap\.xml|favicon\.ico)$ {
    root /path/to/client/dist;
    add_header Content-Type text/plain;
    expires 1d;
    add_header Cache-Control "public, max-age=86400";
    access_log off;
}
```

### 5. Проверка
После настройки проверьте:
- `https://ozar.uz/robots.txt` - должен возвращать текстовый файл с Content-Type: text/plain
- `https://ozar.uz/sitemap.xml` - должен возвращать XML файл с Content-Type: application/xml

## Содержимое robots.txt
```
User-agent: *
Allow: /

# Sitemap
Sitemap: https://ozar.uz/sitemap.xml

# Disallow admin and private pages
Disallow: /admin/
Disallow: /sale/
Disallow: /api/
Disallow: /profile
Disallow: /cart
Disallow: /favorites
Disallow: /update-profile
Disallow: /test-auth

# Allow public pages
Allow: /
Allow: /catalog
Allow: /product/

# Crawl-delay (optional, helps prevent server overload)
Crawl-delay: 1
```

