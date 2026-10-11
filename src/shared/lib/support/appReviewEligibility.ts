/** 처음 연 시각부터 이 시간이 지나면 평가 창을 요청한다. */
export const APP_REVIEW_MIN_USE_MS = 24 * 60 * 60 * 1000;

export type AppReviewPromptRecord = {
  firstOpenedAt: string;
  requestedAt?: string;
};

/** 로컬 캘린더 `YYYY-MM-DD`. 히스토리 dateKey와 같은 기준이다. */
export function localCalendarDateKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hasPriorCalendarDayUse(dateKeys: readonly string[], todayKey: string): boolean {
  return dateKeys.some((key) => key < todayKey && /^\d{4}-\d{2}-\d{2}$/.test(key));
}

/**
 * 하루 이상 쓴 뒤에만, 그리고 한 번만 시스템 평가 창을 연다.
 * 어제 이전 사용 기록이 있으면 그 자체로 하루 이상으로 본다.
 */
export function decideAppReviewPrompt(input: {
  record: AppReviewPromptRecord | null;
  nowMs: number;
  todayKey: string;
  priorDayUse: boolean;
  setupComplete: boolean;
}): { record: AppReviewPromptRecord; request: boolean } {
  const parsed = input.record?.firstOpenedAt ? Date.parse(input.record.firstOpenedAt) : Number.NaN;
  const firstOpenedAt = Number.isFinite(parsed)
    ? input.record!.firstOpenedAt
    : new Date(input.nowMs).toISOString();

  const kept: AppReviewPromptRecord = input.record?.requestedAt
    ? { firstOpenedAt, requestedAt: input.record.requestedAt }
    : { firstOpenedAt };

  if (kept.requestedAt || !input.setupComplete) {
    return { record: kept, request: false };
  }

  const elapsed = input.nowMs - Date.parse(firstOpenedAt);
  const usedLongEnough = input.priorDayUse || elapsed >= APP_REVIEW_MIN_USE_MS;
  if (!usedLongEnough) {
    return { record: kept, request: false };
  }

  return {
    record: { firstOpenedAt, requestedAt: new Date(input.nowMs).toISOString() },
    request: true,
  };
}
