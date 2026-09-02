import {
  addDaysToLocalDateKey,
  formatMinutesToHHmm,
  getInitialOtherDataConfig,
  getLocalDateKey,
  getOtherCategoryResolvedDisplayLabel,
  isCustomFlowCategoryKey,
  isOvernightPriorityWindow,
  normalizeOtherDetailConfig,
  parseHHmmToMinutes,
  getPriorityCatalogPickerLabel,
  PRIORITY_CATALOG_PICKER_LABELS,
  resolveCategoryCatalogIcon,
  resolveCustomFlowCategoryLabelKo,
  resolvePriorityRoutineCategoryKey,
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

import { RetroFlatColors } from '@shared/config/retroFlat';
import { t } from '@shared/lib/i18n';

export const PRIMARY = RetroFlatColors.light.primary;

export const CATEGORIES: { key: string; label: string; icon: string }[] = [
  // ─── 건강 루틴 ───
  { key: 'healthIntake', label: getPriorityCatalogPickerLabel('healthIntake'), icon: 'pills.fill' },
  { key: 'fasting', label: getPriorityCatalogPickerLabel('fasting'), icon: 'person.fill' },

  // ─── 생산성을 높이는 도구 ───
  { key: 'reading', label: getPriorityCatalogPickerLabel('reading'), icon: 'book.closed.fill' },

  // ─── 레거시 호환 ───
  { key: 'other', label: getPriorityCatalogPickerLabel('other'), icon: 'person.fill' },
];

/** 담기·우선순위에서 고를 수 있는 카테고리(전체) */
export const PICKER_CATEGORIES = [...CATEGORIES];

export type PickerCategoryItem = (typeof PICKER_CATEGORIES)[number];

/** 제거됐지만 저장된 우선순위·고정 루틴에 남을 수 있는 키 — 행 표시용 */
const LEGACY_PICKER_BY_KEY: Record<string, PickerCategoryItem> = {
  work: {
    key: 'work',
    label: getPriorityCatalogPickerLabel('work'),
    icon: 'square.and.pencil',
  } as unknown as PickerCategoryItem,
  water: {
    key: 'water',
    label: t('category.water'),
    icon: 'drop.fill',
  } as unknown as PickerCategoryItem,
  review: {
    key: 'review',
    label: t('category.review'),
    icon: 'chart.bar.doc.horizontal',
  } as unknown as PickerCategoryItem,
};

export function getPickerCategoryItem(key: string): PickerCategoryItem | undefined {
  const categoryKey = resolvePriorityRoutineCategoryKey(key);
  if (isCustomFlowCategoryKey(categoryKey)) {
    return {
      key,
      label: getPickerCategoryLabel(categoryKey),
      icon: resolveCategoryCatalogIcon(categoryKey),
    } as PickerCategoryItem;
  }
  const base =
    PICKER_CATEGORIES.find((c) => c.key === categoryKey) ??
    LEGACY_PICKER_BY_KEY[categoryKey];
  if (!base) return undefined;
  return {
    ...base,
    key,
    icon: resolveCategoryCatalogIcon(categoryKey),
  } as PickerCategoryItem;
}

/** 모든 카테고리에서 사용자 지정 이름을 우선 사용한다. */
export function getPickerCategoryLabel(
  key: string,
  otherDetailConfig: unknown | null | undefined = undefined,
): string {
  const categoryKey = resolvePriorityRoutineCategoryKey(key);
  if (isCustomFlowCategoryKey(categoryKey)) {
    const raw =
      otherDetailConfig !== undefined
        ? otherDetailConfig
        : loadGoalDetailCategoryConfig(categoryKey);
    const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
    const d = cfg.displayName.trim();
    return d.length > 0 ? d : resolveCustomFlowCategoryLabelKo(categoryKey);
  }
  if (categoryKey === 'other') {
    const raw =
      otherDetailConfig !== undefined ? otherDetailConfig : loadGoalDetailCategoryConfig('other');
    return getOtherCategoryResolvedDisplayLabel(raw);
  }
  const raw =
    otherDetailConfig !== undefined
      ? otherDetailConfig
      : loadGoalDetailCategoryConfig(categoryKey);
  if (raw && typeof raw === 'object') {
    const dn = ((raw as Record<string, unknown>).displayName ?? '') as string;
    const trimmed = typeof dn === 'string' ? dn.trim() : '';
    if (trimmed.length > 0) return trimmed;
  }
  return getPickerCategoryItem(categoryKey)?.label ?? t('category.userFallback');
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
    return lo === todayKey ? t('tabs.dayPlan') : formatDateKeyDisplayKo(lo);
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
 * 종료가 UI상 다음 날짜인지.
 * 저장값 `24:00`(당일 끝)은 화면에서 다음 날짜 `AM 00:00`이므로 true.
 */
export function endsOnNextCalendarDay(start: string, end: string): boolean {
  const pe = parseHHmmToMinutes(end.trim());
  if (pe === 24 * 60) return true;
  return isOvernightPriorityWindow(start, end);
}

type MeridiemKo = '오전' | '오후';

function from12hPartsToTotal(h12: number, min: number, ap: MeridiemKo): number {
  const m = Math.max(0, Math.min(59, min));
  let h24: number;
  if (h12 === 12) {
    h24 = ap === '오전' ? 0 : 12;
  } else {
    h24 = ap === '오후' ? h12 + 12 : h12;
  }
  return h24 * 60 + m;
}

/**
 * 종료 시계 — 오전 12:xx는 자정(00:xx)과 정오(12:xx)가 겹친다.
 * 시작 시각·다음날 여부에 맞는 24h 분 값을 고른다.
 */
export function resolveEndMinutesFrom12h(
  h12: number,
  min: number,
  ap: MeridiemKo,
  startHhmm: string,
  preferMidnightForNoon = false,
): number {
  if (ap === '오후') {
    return from12hPartsToTotal(h12, min, '오후');
  }
  if (h12 !== 12) {
    return from12hPartsToTotal(h12, min, '오전');
  }

  const start = startHhmm.trim();
  const ps = parseHHmmToMinutes(start);
  if (ps === null) {
    return from12hPartsToTotal(h12, min, '오전');
  }

  const midnight = min;
  const noon = 12 * 60 + min;
  const midnightHhmm = formatMinutesToHHmm(midnight);
  const noonHhmm = formatMinutesToHHmm(noon);
  const midOver = isOvernightPriorityWindow(start, midnightHhmm);
  const noonOver = isOvernightPriorityWindow(start, noonHhmm);

  if (midOver && !noonOver) return midnight;
  if (!midOver && noonOver) return noon;
  if (midOver && noonOver) {
    return preferMidnightForNoon ? midnight : noon;
  }
  return noon > ps ? noon : midnight;
}

export function formatEndHhmmFrom12hParts(
  h12: number,
  min: number,
  ap: MeridiemKo,
  startHhmm: string,
  preferMidnightForNoon = false,
): string {
  return formatMinutesToHHmm(
    resolveEndMinutesFrom12h(h12, min, ap, startHhmm, preferMidnightForNoon),
  );
}

/** 종료 시계 AM/PM 토글 — 오후 12:xx도 저녁 시작 구간에서는 다음날로 해석 */
export function toggleEndMeridiemHhmm(
  startHhmm: string,
  h12: number,
  min: number,
  ap: MeridiemKo,
): string {
  const start = startHhmm.trim();
  const nextAp: MeridiemKo = ap === '오전' ? '오후' : '오전';

  if (h12 === 12) {
    const midnightHhmm = formatMinutesToHHmm(min);
    const noonHhmm = formatMinutesToHHmm(12 * 60 + min);
    const midOver = isOvernightPriorityWindow(start, midnightHhmm);
    const noonOver = isOvernightPriorityWindow(start, noonHhmm);

    if (nextAp === '오후' && noonOver) {
      return noonHhmm;
    }
    if (nextAp === '오전' && midOver) {
      return midnightHhmm;
    }
    if (nextAp === '오전' && noonOver) {
      return noonHhmm;
    }
  }

  return formatEndHhmmFrom12hParts(h12, min, nextAp, start, nextAp === '오전');
}

/**
 * 달력 다중일일 때 시작 시계 아래 날짜 — 구간 첫날.
 */
export function priorityClockCaptionDateKeyStart(rangeLo: string): string {
  return rangeLo;
}

/**
 * 달력 다중일일 때 종료 시계 아래 날짜.
 * overnight이면 종료 시각은 **시작일 다음 날**(구간이 아직 하루일 때) 또는
 * 이미 다중일로 잡힌 구간의 **마지막 날**(auto overnight / 명시 다중일)에 둔다.
 * `rangeHi`가 이미 종료일이면 하루를 더하지 않는다.
 */
export function priorityClockCaptionDateKeyEnd(
  rangeLo: string,
  rangeHi: string,
  priorityStart: string,
  priorityEnd: string,
): string {
  const ps = parseHHmmToMinutes(priorityStart.trim());
  const pe = parseHHmmToMinutes(priorityEnd.trim());
  if (ps === null || pe === null) return rangeHi;
  if (pe === 24 * 60 && pe > ps) return addDaysToLocalDateKey(rangeHi, 1);
  if (pe < ps) {
    return rangeLo === rangeHi ? addDaysToLocalDateKey(rangeHi, 1) : rangeHi;
  }
  return rangeHi;
}

