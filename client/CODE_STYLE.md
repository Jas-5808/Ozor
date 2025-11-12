# Руководство по стилю кода

## Принципы чистого кода

### 1. Единственная ответственность (Single Responsibility Principle)
- Каждый компонент/функция должна делать одну вещь
- Если компонент делает больше одного, разбейте его на меньшие части

### 2. DRY (Don't Repeat Yourself)
- Избегайте дублирования кода
- Выносите повторяющуюся логику в хуки или утилиты

### 3. Именование
- Используйте понятные имена
- Компоненты: PascalCase (`ProductCard`)
- Функции/переменные: camelCase (`getUserProfile`)
- Константы: UPPER_SNAKE_CASE (`API_TIMEOUT`)
- Типы/интерфейсы: PascalCase (`UserProfile`)

### 4. Размер функций и компонентов
- Функции: максимум 20-30 строк
- Компоненты: максимум 200-300 строк
- Если больше - разбивайте на части

### 5. Типизация
- Всегда используйте TypeScript типы
- Избегайте `any` - используйте `unknown` или конкретные типы
- Не используйте `@ts-ignore` без крайней необходимости

## Структура компонента

```typescript
// 1. Импорты (группированные)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';

import type { User } from '../types';

// 2. Типы и интерфейсы
interface ComponentProps {
  userId: string;
  onSuccess?: () => void;
}

// 3. Константы компонента (если нужны)
const MAX_RETRIES = 3;

// 4. Компонент
export const Component: React.FC<ComponentProps> = ({ userId, onSuccess }) => {
  // 5. Хуки (в правильном порядке)
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 6. State
  const [loading, setLoading] = useState(false);
  
  // 7. Вычисляемые значения
  const isReady = useMemo(() => {
    return user && !loading;
  }, [user, loading]);
  
  // 8. Обработчики
  const handleSubmit = useCallback(async () => {
    // логика
  }, [dependencies]);
  
  // 9. Effects
  useEffect(() => {
    // эффект
  }, [dependencies]);
  
  // 10. Рендер
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

## Организация файлов

### Структура компонента
```
ComponentName/
├── index.ts              # Экспорт
├── ComponentName.tsx     # Основной компонент
├── ComponentName.module.scss  # Стили (если нужны)
├── ComponentName.test.tsx     # Тесты
└── types.ts             # Типы компонента (если сложные)
```

### Структура хука
```
hooks/
├── useHookName.ts        # Хук
└── __tests__/
    └── useHookName.test.ts
```

## Логирование

### ❌ Плохо
```typescript
console.log('User data:', user);
console.log('API response:', response);
```

### ✅ Хорошо
```typescript
import { logger } from '../utils/logger';

logger.debug('User data loaded', { userId: user.id });
logger.api('GET', '/api/users', { userId });
logger.errorWithContext(error, { context: 'fetchUser' });
```

## Обработка ошибок

### ❌ Плохо
```typescript
try {
  await api.getData();
} catch (e) {
  console.error(e);
}
```

### ✅ Хорошо
```typescript
import { handleApiError, getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

try {
  await api.getData();
} catch (error) {
  const appError = handleApiError(error);
  logger.errorWithContext(appError, { context: 'getData' });
  setError(getUserFriendlyMessage(appError));
}
```

## Использование констант

### ❌ Плохо
```typescript
if (status === 'pending' || status === 'confirmed') {
  // ...
}
setTimeout(() => {}, 500);
```

### ✅ Хорошо
```typescript
import { ORDER_STATUS, TIMING } from '../constants';

if (status === ORDER_STATUS.PENDING || status === ORDER_STATUS.CONFIRMED) {
  // ...
}
setTimeout(() => {}, TIMING.DEBOUNCE_SEARCH);
```

## Комментарии

### ❌ Плохо
```typescript
// Получаем пользователя
const user = getUser();
// Проверяем авторизацию
if (user) {
  // Показываем профиль
  showProfile();
}
```

### ✅ Хорошо
```typescript
/**
 * Загружает данные пользователя и отображает профиль
 * @param userId - ID пользователя
 */
const loadUserProfile = async (userId: string) => {
  const user = await getUser(userId);
  if (user) {
    showProfile(user);
  }
};
```

## Разбиение больших компонентов

### ❌ Плохо - большой компонент
```typescript
export function Profile() {
  // 500+ строк кода
  // Много состояний
  // Много логики
  // Сложный JSX
}
```

### ✅ Хорошо - разбитый на части
```typescript
// hooks/useProfileData.ts
export function useProfileData() {
  // Логика загрузки данных
}

// hooks/useReferralActions.ts
export function useReferralActions() {
  // Логика работы с рефералами
}

// components/ProfileTabs.tsx
export function ProfileTabs() {
  // Компонент вкладок
}

// pages/Profile.tsx
export function Profile() {
  const profileData = useProfileData();
  const referralActions = useReferralActions();
  
  return (
    <ProfileTabs data={profileData} actions={referralActions} />
  );
}
```

## Проверка кода перед коммитом

1. ✅ Запустить линтер: `npm run lint`
2. ✅ Проверить форматирование: `npm run format:check`
3. ✅ Запустить тесты: `npm run test`
4. ✅ Проверить типы: `npm run build` (проверяет TypeScript)

## Автоматизация

Рекомендуется настроить pre-commit hook (husky):
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

