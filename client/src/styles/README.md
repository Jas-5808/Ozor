# Структура стилей проекта

## Обзор

Стили проекта организованы в модульную структуру для лучшей поддерживаемости и масштабируемости.

## Структура

```
src/styles/
├── shared/              # Общие стили
│   ├── _variables.scss  # CSS переменные
│   ├── _mixins.scss     # SCSS миксины
│   └── _utilities.module.scss  # Утилитарные классы
├── components/          # Стили компонентов
│   ├── _product-card.module.scss
│   ├── _buttons.module.scss
│   └── _forms.module.scss
└── pages/               # Стили страниц
    ├── _product.module.scss
    └── _registration.module.scss
```

## Использование

### Импорт в компонентах

```typescript
// Для модульных стилей
import styles from '../styles/components/product-card.module.scss';

// Для общих переменных и миксинов
import '../styles/shared/variables.scss';
```

### Использование переменных

```scss
.my-component {
  color: var(--text);
  background: var(--bg);
  box-shadow: var(--shadow-card);
}
```

### Использование миксинов

```scss
@import '../styles/shared/mixins';

.my-button {
  @include button-hover;
  @include flex-center;
}
```

## Миграция

Старый файл `style.module.scss` (2130 строк) был разбит на модули:
- Стили карточек продуктов → `components/_product-card.module.scss`
- Стили кнопок → `components/_buttons.module.scss`
- Стили форм → `components/_forms.module.scss`
- Стили страницы продукта → `pages/_product.module.scss`
- Стили регистрации → `pages/_registration.module.scss`
- Общие утилиты → `shared/_utilities.module.scss`

## Преимущества

1. **Модульность** - каждый модуль отвечает за свою область
2. **Переиспользование** - переменные и миксины в одном месте
3. **Поддерживаемость** - легко найти и изменить нужные стили
4. **Производительность** - только нужные стили загружаются в компоненты
5. **Масштабируемость** - легко добавлять новые модули

