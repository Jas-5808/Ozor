// Важно: этот barrel НЕ должен реэкспортить admin pages.
// Иначе любое `import { AdminLayout } from './admin'` подтянет все страницы в стартовый бандл.
export { default as AdminLayout } from './AdminLayout';

