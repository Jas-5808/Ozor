# Исправления проблем поиска и категорий

**Дата:** 25 января 2026

---

## 🔴 Исправленные проблемы

### 1. Бесконечный цикл запросов к категориям

**Проблема:** 
Категории добавлялись обратно в очередь даже после обработки, что вызывало повторяющиеся запросы каждую секунду.

**Причина:**
В `CategoryPage.tsx` строки 351-356 категории добавлялись обратно в очередь без проверки, есть ли новые данные.

**Исправление:**
```typescript
// БЫЛО:
responses.forEach((res) => {
  const hasMore = categoryHasMoreRef.current[res.categoryId] !== false;
  if (hasMore) {
    categoryQueueRef.current.push(res.categoryId);
  }
});

// СТАЛО:
responses.forEach((res) => {
  if (res.skipped || res.error) return;
  const hasMore = categoryHasMoreRef.current[res.categoryId] !== false;
  // Проверяем, что offset действительно увеличился (есть новые данные)
  const currentOffset = categoryOffsetsRef.current[res.categoryId] || 0;
  if (hasMore && currentOffset > 0 && res.items.length > 0) {
    categoryQueueRef.current.push(res.categoryId);
  }
});
```

### 2. Проблема с зависимостями useEffect

**Проблема:**
`fetchNextCategories` зависел от `categoryIds`, который пересоздавался при каждом изменении, вызывая бесконечные перезапуски.

**Исправление:**
- Добавлен `categoryIdsRef` для хранения актуальных ID категорий
- Убрана зависимость от `categoryIds` в `useCallback` для `fetchNextCategories`
- Используется ref внутри функции для доступа к актуальным данным

```typescript
// Добавлен ref
const categoryIdsRef = useRef<string[]>([]);
useEffect(() => {
  categoryIdsRef.current = categoryIds;
}, [categoryIds]);

// В fetchNextCategories используем ref
if (categoryQueueRef.current.length === 0) {
  const ids = categoryIdsRef.current.length > 0 ? categoryIdsRef.current : categoryIds;
  if (ids.length === 0) {
    setCategoriesHasMore(false);
    return;
  }
  categoryQueueRef.current = ids.slice();
}
```

### 3. Улучшен N-gram поиск

**Проблема:**
Фиксированный размер N-gram (3) не оптимален для коротких запросов.

**Исправление:**
Добавлена адаптивная функция `getNgramSize`:
- Для запросов ≤ 2 символов: используем всю длину
- Для запросов 3-4 символа: используем 2-gram
- Для длинных запросов: используем 3-gram (стандарт)

```typescript
// БЫЛО:
const NGRAM_SIZE = 3;

// СТАЛО:
const getNgramSize = (textLength: number): number => {
  if (textLength <= 2) return textLength;
  if (textLength <= 4) return 2;
  return 3; // Стандартный размер для длинных запросов
};
```

---

## ✅ Результаты

1. **Устранен бесконечный цикл** - категории больше не запрашиваются повторно без необходимости
2. **Стабилизированы зависимости** - `fetchNextCategories` больше не пересоздается при каждом изменении
3. **Улучшен поиск** - адаптивный N-gram работает лучше для коротких запросов

---

## 📝 Дополнительные рекомендации

1. **Мониторинг:** Следить за количеством запросов в DevTools Network
2. **Кеширование:** Убедиться, что кеш API работает корректно (TTL: 2 минуты)
3. **Логирование:** Добавить логи для отслеживания проблем с очередью категорий

---

## 🧪 Тестирование

Проверить:
- ✅ Запросы к категориям не повторяются бесконечно
- ✅ Поиск работает корректно для коротких запросов (2-4 символа)
- ✅ Поиск работает корректно для длинных запросов
- ✅ Загрузка дополнительных товаров работает без зацикливания
