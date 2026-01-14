import React from "react";
import { Navigate, useParams } from "react-router-dom";

/**
 * Короткая реферальная ссылка.
 * Пример: /r/:productId/:code -> /product/:productId?ref=:code
 *
 * Важно: это "сокращение" работает без внешних сервисов, если хостинг
 * настроен как SPA (любой роут отдаёт index.html).
 */
export function ReferralRedirect() {
  const { productId, code } = useParams<{ productId: string; code: string }>();

  if (!productId || !code) {
    return <Navigate to="/" replace />;
  }

  const safeProductId = encodeURIComponent(String(productId));
  const safeCode = encodeURIComponent(String(code));

  return <Navigate to={`/product/${safeProductId}?ref=${safeCode}`} replace />;
}

export default ReferralRedirect;

