/** November launch promotion ends at midnight in Korea, independently of device timezone. */
export const PRO_FREE_ACCESS_END = '2026-12-01T00:00:00+09:00';
export function isProFreeAccessActive(now = Date.now()): boolean {
  return now < Date.parse(PRO_FREE_ACCESS_END);
}
