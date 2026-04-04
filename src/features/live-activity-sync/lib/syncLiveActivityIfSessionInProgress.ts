import { reconcileLiveActivityFromPlan } from './reconcileLiveActivityFromPlan';

/**
 * @deprecated 이름 호환용 — 내부는 `reconcileLiveActivityFromPlan`과 동일.
 */
export function syncLiveActivityIfSessionInProgress(): void {
  reconcileLiveActivityFromPlan();
}
