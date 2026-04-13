import { getLocalMinutesOfDayNow, parseHHmmToMinutes } from '@entities/day-plan';

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

/** 새 플로우 설정에서 임시로 숨길 카테고리 */
export const PICKER_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'meditation' && c.key !== 'yoga');

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
