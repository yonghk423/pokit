import { getLocalMinutesOfDayNow, parseHHmmToMinutes } from '@entities/day-plan';

export const PRIMARY = 'rgb(249, 115, 22)';

export const CATEGORIES = [
  { key: 'run', label: '러닝', icon: 'figure.run' as const },
  { key: 'work', label: '업무', icon: 'briefcase.fill' as const },
  { key: 'reading', label: '독서', icon: 'book.fill' as const },
  { key: 'study', label: '공부', icon: 'book.closed.fill' as const },
  { key: 'meditation', label: '명상', icon: 'brain.head.profile' as const },
  { key: 'yoga', label: '요가', icon: 'figure.yoga' as const },
  { key: 'rest', label: '휴식', icon: 'moon.zzz.fill' as const },
  { key: 'water', label: '수분', icon: 'drop.fill' as const },
  { key: 'medicine', label: '약 복용', icon: 'cross.case.fill' as const },
  { key: 'stretch', label: '스트레칭', icon: 'dumbbell.fill' as const },
  { key: 'other', label: '기타', icon: 'ellipsis' as const },
];

export type TimeBlock = {
  id: string;
  categoryKey: string;
  startTime: string;
  endTime: string;
  /** 새 플로우 설정에서 입력하는 블록 제목(일정 블록 title로 저장) */
  title: string;
  /**
   * `false`: 시간만 조정 중. 확정 전에는 다른 카테고리를 추가할 수 없음.
   * `true`: 일정에 반영된 블록. 같은 카테고리를 다시 눌러 다음 블록 추가 가능.
   */
  timeCommitted?: boolean;
  /** 사용자가 추가한 순서(표시·저장 순서). 없으면 0으로 취급 */
  addedSeq?: number;
};

export type PriorityTask = { id: string; title: string; categoryKey: string };

export type PrioritySection = {
  categoryKey: string;
  label: string;
  tasks: PriorityTask[];
};

/** 우선순위 모드: 선택한 카테고리 순서 + 각 할 일의 categoryKey로 섹션 구성 */
export function getPriorityDisplaySections(
  categoryOrder: string[],
  tasks: PriorityTask[],
): PrioritySection[] {
  const order = categoryOrder.length > 0 ? [...categoryOrder] : ['work'];
  const orphanKeys = [
    ...new Set(tasks.map((t) => t.categoryKey).filter((k) => !order.includes(k))),
  ];
  const fullOrder = [...order, ...orphanKeys];
  return fullOrder.map((ck) => ({
    categoryKey: ck,
    label: CATEGORIES.find((c) => c.key === ck)?.label ?? '기타',
    tasks: tasks.filter((t) => t.categoryKey === ck),
  }));
}

/** 저장·번호 매김용: 카테고리 순서대로 비어 있지 않은 할 일 제목 */
export function getOrderedPriorityLines(categoryOrder: string[], tasks: PriorityTask[]): string[] {
  const sections = getPriorityDisplaySections(categoryOrder, tasks);
  const out: string[] = [];
  for (const s of sections) {
    for (const t of s.tasks) {
      const line = t.title.trim();
      if (line) out.push(line);
    }
  }
  return out;
}

export type PlanMode = 'time' | 'priority' | 'quickMemo';

/** 블록 최소 길이(분). 드래그·검증에 공통 사용 */
export const MIN_BLOCK_DURATION_MINUTES = 15;

/** 타임라인 드래그 시 분 단위 스냅 */
export const TIME_SNAP_MINUTES = 5;

/** 0~1440(24:00) → `HH:mm`. 1440은 `24:00` */
export function formatMinutesToHHmm(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    return '00:00';
  }
  const m = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  if (m === 24 * 60) return '24:00';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function snapMinutes(minutes: number, step: number = TIME_SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/** 새 시간 블록: 시작=로컬 현재 시각(스냅), 종료=시작+기본 길이(자정 넘김·최소 길이 보정) */
export function defaultEditorBlockTimesFromNow(
  now: Date = new Date(),
  spanMinutes: number = 60,
): { startTime: string; endTime: string } {
  const rawStart = getLocalMinutesOfDayNow(now);
  let startM = snapMinutes(rawStart, TIME_SNAP_MINUTES);
  const span = Math.max(spanMinutes, MIN_BLOCK_DURATION_MINUTES);
  let endM = snapMinutes(startM + span, TIME_SNAP_MINUTES);
  if (endM > 24 * 60) endM = 24 * 60;
  if (endM <= startM) {
    endM = Math.min(24 * 60, startM + MIN_BLOCK_DURATION_MINUTES);
  }
  if (endM - startM < MIN_BLOCK_DURATION_MINUTES) {
    startM = Math.max(0, endM - MIN_BLOCK_DURATION_MINUTES);
  }
  return {
    startTime: formatMinutesToHHmm(startM),
    endTime: formatMinutesToHHmm(endM),
  };
}

/** 우선순위 모드 기본 목표 구간 길이(분). 이전 09:00~12:00에 맞춘 3시간. */
export const PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES = 180;

/** 우선순위: 시작=지금(로컬·5분 스냅), 종료=시작+기본 길이(자정·최소 길이 보정) */
export function defaultPriorityWindowFromNow(now: Date = new Date()): {
  startTime: string;
  endTime: string;
} {
  return defaultEditorBlockTimesFromNow(now, PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES);
}

/**
 * 추가 순서상 직전 블록 종료 시각부터 이어 붙이는 기본 구간(겹침 방지용 기본값).
 * `previousEndTime`이 24:00이거나 여유가 없으면 null.
 */
export function defaultEditorBlockTimesAfterPreviousEnd(
  previousEndTime: string,
  spanMinutes: number = 60,
): { startTime: string; endTime: string } | null {
  const endPrev = parseHHmmToMinutes(previousEndTime);
  if (endPrev === null) return null;
  const span = Math.max(spanMinutes, MIN_BLOCK_DURATION_MINUTES);
  let startM = snapMinutes(endPrev, TIME_SNAP_MINUTES);
  if (startM >= 24 * 60) return null;

  let endM = snapMinutes(startM + span, TIME_SNAP_MINUTES);
  if (endM > 24 * 60) endM = 24 * 60;
  if (endM <= startM) {
    endM = Math.min(24 * 60, startM + MIN_BLOCK_DURATION_MINUTES);
  }
  if (endM - startM < MIN_BLOCK_DURATION_MINUTES) {
    if (startM + MIN_BLOCK_DURATION_MINUTES <= 24 * 60) {
      endM = startM + MIN_BLOCK_DURATION_MINUTES;
    } else {
      return null;
    }
  }
  return {
    startTime: formatMinutesToHHmm(startM),
    endTime: formatMinutesToHHmm(endM),
  };
}

/** 시작만 오늘의 “지금”(스냅)으로 옮기고, 가능하면 기존 구간 길이 유지 */
export function shiftBlockStartToNowKeepingDuration(
  currentStart: string,
  currentEnd: string,
  now: Date = new Date(),
): { startTime: string; endTime: string } | null {
  const eOld = parseHHmmToMinutes(currentEnd);
  if (eOld === null) return null;
  const sOld = parseHHmmToMinutes(currentStart);
  const dur =
    sOld !== null && eOld > sOld
      ? Math.max(eOld - sOld, MIN_BLOCK_DURATION_MINUTES)
      : 60;

  let startM = snapMinutes(getLocalMinutesOfDayNow(now), TIME_SNAP_MINUTES);
  let endM = snapMinutes(startM + dur, TIME_SNAP_MINUTES);
  if (endM > 24 * 60) endM = 24 * 60;
  if (endM <= startM) {
    endM = Math.min(24 * 60, startM + MIN_BLOCK_DURATION_MINUTES);
  }
  if (endM - startM < MIN_BLOCK_DURATION_MINUTES) {
    startM = Math.max(0, endM - MIN_BLOCK_DURATION_MINUTES);
  }
  return {
    startTime: formatMinutesToHHmm(startM),
    endTime: formatMinutesToHHmm(endM),
  };
}

/** 입력 필드 blur 시 시작·종료를 도메인 규칙에 맞게 정리. 실패 시 null */
export function normalizeBlockTimeRange(
  startTime: string,
  endTime: string,
): { startTime: string; endTime: string } | null {
  const s = parseHHmmToMinutes(startTime);
  const e = parseHHmmToMinutes(endTime);
  if (s === null || e === null) return null;
  if (e <= s) {
    const e2 = Math.min(24 * 60, s + MIN_BLOCK_DURATION_MINUTES);
    return { startTime: formatMinutesToHHmm(s), endTime: formatMinutesToHHmm(e2) };
  }
  if (e - s < MIN_BLOCK_DURATION_MINUTES) {
    return {
      startTime: formatMinutesToHHmm(s),
      endTime: formatMinutesToHHmm(Math.min(24 * 60, s + MIN_BLOCK_DURATION_MINUTES)),
    };
  }
  return { startTime: formatMinutesToHHmm(s), endTime: formatMinutesToHHmm(e) };
}

export function makeBlockId(): string {
  const c = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return c.crypto?.randomUUID?.() ?? `tb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getDaySliderPercents(startTime: string, endTime: string) {
  const fallback = { startPct: 18.75, endPct: 47.9, rangeLeftPct: 18.75, rangeWidthPct: 29.15 };
  const s = parseHHmmToMinutes(startTime);
  const e = parseHHmmToMinutes(endTime);
  if (s === null || e === null || e <= s) {
    return fallback;
  }
  const startPct = (s / 1440) * 100;
  const endPct = (e / 1440) * 100;
  const rangeWidthPct = Math.max(endPct - startPct, 0.5);
  const finite = (n: number, fb: number) => (Number.isFinite(n) ? n : fb);
  return {
    startPct: finite(startPct, fallback.startPct),
    endPct: finite(endPct, fallback.endPct),
    rangeLeftPct: finite(startPct, fallback.rangeLeftPct),
    rangeWidthPct: finite(rangeWidthPct, fallback.rangeWidthPct),
  };
}

export function sortBlocksByCategoryOrder(blocks: TimeBlock[]): TimeBlock[] {
  const order = new Map(CATEGORIES.map((c, i) => [c.key, i]));
  return [...blocks].sort((a, b) => (order.get(a.categoryKey) ?? 99) - (order.get(b.categoryKey) ?? 99));
}

/** 시간 기반 플랜 편집: 추가한 순서대로 */
export function sortBlocksByAddedSeq(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) => (a.addedSeq ?? 0) - (b.addedSeq ?? 0));
}

export function rangesOverlapMinutes(
  a: { s: number; e: number },
  b: { s: number; e: number },
): boolean {
  return !(a.e <= b.s || b.e <= a.s);
}

export function amPmKorean(hhmm: string): string {
  const m = parseHHmmToMinutes(hhmm);
  if (m === null) return '';
  const h = Math.floor(m / 60);
  return h < 12 ? '오전' : '오후';
}

export function displayHour12(hhmm: string): string {
  const m = parseHHmmToMinutes(hhmm);
  if (m === null) return '--:--';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')}`;
}
