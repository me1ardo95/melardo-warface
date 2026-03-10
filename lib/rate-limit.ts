/** In-memory rate limiter: max N запросов в минуту на ключ */
const store = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function prune(key: string) {
  const now = Date.now();
  const timestamps = store.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);
  if (valid.length === 0) store.delete(key);
  else store.set(key, valid);
  return valid;
}

/**
 * Проверяет rate limit. Возвращает true если лимит не превышен, false если превышен.
 * @param key - идентификатор (например user_id)
 */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const valid = prune(key);
  if (valid.length >= MAX_REQUESTS) return false;
  valid.push(now);
  store.set(key, valid);
  return true;
}
