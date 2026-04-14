import {
  addDaysToLocalDateKey,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  parseHHmmToMinutes,
} from '@entities/day-plan';

export const PRIMARY = 'rgb(0, 0, 0)';

export const CATEGORIES = [
  { key: 'work', label: '작업', icon: 'briefcase.fill' as const },
  { key: 'reading', label: '독서', icon: 'book.fill' as const },
  { key: 'meditation', label: '명상', icon: 'brain.head.profile' as const },
  { key: 'yoga', label: '요가', icon: 'figure.yoga' as const },
  { key: 'fasting', label: '단식', icon: 'timer' as const },
  { key: 'water', label: '수분섭취', icon: 'drop.fill' as const },
  { key: 'medicine', label: '약 복용', icon: 'cross.case.fill' as const },
  { key: 'other', label: '사용자', icon: 'person.fill' as const },
];

/** 새 플로우 설정에서 임시로 숨길 카테고리 (도메인은 유지, UI에서만 비노출) */
export const PICKER_CATEGORIES = CATEGORIES.filter(
  (c) => c.key !== 'work' && c.key !== 'meditation' && c.key !== 'yoga',
);

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
  const order = categoryOrder.length > 0 ? [...categoryOrder] : [];
  const orphanKeys = [
    ...new Set(tasks.map((t) => t.categoryKey).filter((k) => !order.includes(k))),
  ];
  const fullOrder = [...order, ...orphanKeys];
  return fullOrder.map((ck) => ({
    categoryKey: ck,
    label: CATEGORIES.find((c) => c.key === ck)?.label ?? '사용자',
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

export type PlanMode = 'priority' | 'quickMemo';

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

export function makeBlockId(): string {
  const c = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return c.crypto?.randomUUID?.() ?? `tb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

/** `YYYY-MM-DD` → 화면용 한글 날짜 */
export function formatDateKeyDisplayKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const y = m[1];
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${y}년 ${mo}월 ${d}일`;
}

/** 시계 박스 등 짧은 표기 — `4월 14일` */
export function formatDateKeyCompactKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${mo}월 ${d}일`;
}

/** 우선순위 플로 소개 문구 — 단일일·기간 */
export function planDayIntroFromRange(todayKey: string, startKey: string, endKey: string): string {
  const lo = startKey <= endKey ? startKey : endKey;
  const hi = startKey <= endKey ? endKey : startKey;
  if (lo === hi) {
    return lo === todayKey ? '오늘' : formatDateKeyDisplayKo(lo);
  }
  return `${formatDateKeyDisplayKo(lo)} ~ ${formatDateKeyDisplayKo(hi)}`;
}

/**
 * 블록을 어느 날짜 플랜에 넣을지 — 기간 안에 오늘이 있으면 오늘, 없으면 기간 시작일.
 */
export function pickPlanDateKeyForBlock(startKey: string, endKey: string): string {
  const today = getLocalDateKey();
  const lo = startKey <= endKey ? startKey : endKey;
  const hi = startKey <= endKey ? endKey : startKey;
  if (today >= lo && today <= hi) return today;
  return lo;
}

export function sortedPlanDateRange(startKey: string, endKey: string): { lo: string; hi: string } {
  return startKey <= endKey ? { lo: startKey, hi: endKey } : { lo: endKey, hi: startKey };
}

/**
 * 시각만 볼 때 자정을 넘기는 구간(예: 오후 1시 ~ 다음날 새벽 1시).
 * 당일 24:00 종료(당일 끝까지)는 익일로 보지 않음.
 */
export function isOvernightHhmmRange(start: string, end: string): boolean {
  const ps = parseHHmmToMinutes(start.trim());
  const pe = parseHHmmToMinutes(end.trim());
  if (ps === null || pe === null) return false;
  if (pe === ps) return false;
  if (pe === 24 * 60 && pe > ps) return false;
  return pe < ps;
}

/**
 * 달력 다중일일 때 시작 시계 아래 날짜 — 구간 첫날.
 */
export function priorityClockCaptionDateKeyStart(rangeLo: string): string {
  return rangeLo;
}

/**
 * 달력 다중일일 때 종료 시계 아래 날짜.
 * 오전/오후·시분에 따라 자정을 넘기면 종료 시각은 적용 기간 **마지막 날의 다음날** 새벽으로 본다.
 */
export function priorityClockCaptionDateKeyEnd(
  rangeHi: string,
  priorityStart: string,
  priorityEnd: string,
): string {
  const ps = parseHHmmToMinutes(priorityStart.trim());
  const pe = parseHHmmToMinutes(priorityEnd.trim());
  if (ps === null || pe === null) return rangeHi;
  if (pe === 24 * 60 && pe > ps) return rangeHi;
  if (pe < ps) {
    return addDaysToLocalDateKey(rangeHi, 1);
  }
  return rangeHi;
}

/**
 * 우선순위 플로우 블록을 붙일 날짜. 자정 넘김이면 적용 기간의 시작일(저녁~새벽의 ‘저녁’ 날짜)을 씁니다.
 */
export function pickPlanDateKeyForPriorityBlock(
  startKey: string,
  endKey: string,
  priorityStart: string,
  priorityEnd: string,
): string {
  const { lo } = sortedPlanDateRange(startKey, endKey);
  if (isOvernightHhmmRange(priorityStart, priorityEnd)) {
    return lo;
  }
  return pickPlanDateKeyForBlock(startKey, endKey);
}
