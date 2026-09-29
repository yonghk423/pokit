import { useAnalyticsScreenViews } from './useAnalyticsScreenViews';

/** 루트 레이아웃용 — 화면 전환 Analytics만 담당 */
export function AnalyticsScreenTracker() {
  useAnalyticsScreenViews();
  return null;
}
