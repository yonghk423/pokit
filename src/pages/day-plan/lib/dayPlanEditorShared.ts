import {
  addDaysToLocalDateKey,
  defaultCustomFlowPickerLabel,
  getInitialOtherDataConfig,
  getLocalDateKey,
  getOtherCategoryResolvedDisplayLabel,
  isCustomFlowCategoryKey,
  normalizeOtherDetailConfig,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

export {
  defaultEditorBlockTimesFromNow,
  defaultPriorityWindowFromNow,
  formatMinutesToHHmm,
  MIN_BLOCK_DURATION_MINUTES,
  PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES,
  snapMinutes,
  TIME_SNAP_MINUTES,
} from '@entities/day-plan';
export type { PlanMode } from '@entities/day-plan';

export const PRIMARY = 'rgb(0, 0, 0)';

export const CATEGORIES = [
  { key: 'work', label: '작업', icon: 'bag.fill' as const },
  { key: 'reading', label: '독서', icon: 'book.fill' as const },
  { key: 'study', label: '공부·학습', icon: 'graduationcap.fill' as const },
  { key: 'stretching', label: '스트레칭하기', icon: 'figure.run' as const },
  { key: 'straightenBack', label: '허리펴기', icon: 'figure.yoga' as const },
  { key: 'neckPosture', label: '거북목 바르게하기', icon: 'tortoise.fill' as const },
  { key: 'planning', label: '하루·주간 정리', icon: 'calendar.badge.clock' as const },
  { key: 'writing', label: '글쓰기', icon: 'square.and.pencil' as const },
  { key: 'language', label: '언어 학습', icon: 'character.bubble' as const },
  { key: 'creative', label: '창작·아이디어', icon: 'paintpalette.fill' as const },
  { key: 'inbox', label: '메일·소통 정리', icon: 'tray.2.fill' as const },
  { key: 'fasting', label: '체중관리', icon: 'figure.stand' as const },
  { key: 'water', label: '수분섭취', icon: 'drop.fill' as const },
  { key: 'medicine', label: '약 복용', icon: 'cross.case.fill' as const },
  { key: 'other', label: '플로우 직접 설정', icon: 'person.fill' as const },
];

/** 담기·우선순위에서 고를 수 있는 카테고리(전체) */
export const PICKER_CATEGORIES = [...CATEGORIES];

export type PickerCategoryItem = (typeof PICKER_CATEGORIES)[number];

/** 제거됐지만 저장된 우선순위·고정 루틴에 남을 수 있는 키 — 행 표시용 */
const LEGACY_PICKER_BY_KEY: Record<string, PickerCategoryItem> = {
  review: {
    key: 'review',
    label: '회고·점검',
    icon: 'chart.bar.doc.horizontal',
  } as unknown as PickerCategoryItem,
};

export function getPickerCategoryItem(key: string): PickerCategoryItem | undefined {
  if (isCustomFlowCategoryKey(key)) {
    return {
      key,
      label: getPickerCategoryLabel(key),
      icon: 'person.fill',
    } as PickerCategoryItem;
  }
  return PICKER_CATEGORIES.find((c) => c.key === key) ?? LEGACY_PICKER_BY_KEY[key];
}

/** `other`·`customFlow:…`는 목표 상세 저장값 기준 표시명을 쓴다. */
export function getPickerCategoryLabel(
  key: string,
  otherDetailConfig: unknown | null | undefined = undefined,
): string {
  if (isCustomFlowCategoryKey(key)) {
    const raw =
      otherDetailConfig !== undefined ? otherDetailConfig : loadGoalDetailCategoryConfig(key);
    const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
    const d = cfg.displayName.trim();
    return d.length > 0 ? d : defaultCustomFlowPickerLabel(key);
  }
  if (key === 'other') {
    const raw =
      otherDetailConfig !== undefined ? otherDetailConfig : loadGoalDetailCategoryConfig('other');
    return getOtherCategoryResolvedDisplayLabel(raw);
  }
  return getPickerCategoryItem(key)?.label ?? '사용자';
}

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
    label: getPickerCategoryLabel(ck),
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

/** `YYYY-MM-DD` → 화면용 한글 날짜(연도 생략 — 앱 내 당해·근접 일정 위주) */
export function formatDateKeyDisplayKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${mo}월 ${d}일`;
}

/** 시계 박스 등 짧은 표기 — `4월 14일` */
export function formatDateKeyCompactKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${mo}월 ${d}일`;
}

function parseDateKeyYmd(dateKey: string): { y: string; mo: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  return { y: m[1], mo: parseInt(m[2], 10), d: parseInt(m[3], 10) };
}

/** 우선순위 플로 소개 문구 — 단일일·기간(연도 생략, 해가 다를 때만 연도 표기) */
export function planDayIntroFromRange(todayKey: string, startKey: string, endKey: string): string {
  const lo = startKey <= endKey ? startKey : endKey;
  const hi = startKey <= endKey ? endKey : startKey;
  if (lo === hi) {
    return lo === todayKey ? '오늘' : formatDateKeyDisplayKo(lo);
  }
  const a = parseDateKeyYmd(lo);
  const b = parseDateKeyYmd(hi);
  if (!a || !b) {
    return `${formatDateKeyDisplayKo(lo)} ~ ${formatDateKeyDisplayKo(hi)}`;
  }
  if (a.y !== b.y) {
    return `${a.y}년 ${a.mo}월 ${a.d}일 ~ ${b.y}년 ${b.mo}월 ${b.d}일`;
  }
  if (a.mo !== b.mo) {
    return `${a.mo}월 ${a.d}일 ~ ${b.mo}월 ${b.d}일`;
  }
  return `${a.mo}월 ${a.d}일 ~ ${b.d}일`;
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

/** @deprecated 이름 호환 — `isOvernightPriorityWindow`와 동일 */
export { isOvernightPriorityWindow as isOvernightHhmmRange } from '@entities/day-plan';

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

