/** Match src/shared/config/proPromotion.ts. Evaluate per request in long-lived workers. */
export function requiresDownloadSubscription(now = Date.now()): boolean {
  return now >= Date.parse('2026-12-01T00:00:00+09:00');
}
