import {
  addDaysToLocalDateKey,
  defaultCustomFlowPickerLabel,
  getInitialOtherDataConfig,
  getLocalDateKey,
  getOtherCategoryResolvedDisplayLabel,
  isCustomFlowCategoryKey,
  normalizeOtherDetailConfig,
  parseHHmmToMinutes,
  PRIORITY_CATALOG_PICKER_LABELS,
  resolveCategoryCatalogIcon,
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

export const CATEGORIES: { key: string; label: string; icon: string }[] = [
  // ─── 건강·몸 관리 ───
  { key: 'water', label: PRIORITY_CATALOG_PICKER_LABELS.water, icon: 'drop.fill' },
  { key: 'medicine', label: PRIORITY_CATALOG_PICKER_LABELS.medicine, icon: 'cross.case.fill' },
  { key: 'fasting', label: PRIORITY_CATALOG_PICKER_LABELS.fasting, icon: 'figure.stand' },
  { key: 'stretching', label: PRIORITY_CATALOG_PICKER_LABELS.stretching, icon: 'figure.run' },
  { key: 'straightenBack', label: PRIORITY_CATALOG_PICKER_LABELS.straightenBack, icon: 'figure.yoga' },
  { key: 'neckPosture', label: PRIORITY_CATALOG_PICKER_LABELS.neckPosture, icon: 'tortoise.fill' },
  { key: 'meditation', label: PRIORITY_CATALOG_PICKER_LABELS.meditation, icon: 'brain.head.profile' },
  { key: 'workout', label: PRIORITY_CATALOG_PICKER_LABELS.workout, icon: 'dumbbell.fill' },
  { key: 'walking', label: PRIORITY_CATALOG_PICKER_LABELS.walking, icon: 'figure.walk' },
  { key: 'yoga', label: PRIORITY_CATALOG_PICKER_LABELS.yoga, icon: 'figure.mind.and.body' },
  { key: 'sleep', label: PRIORITY_CATALOG_PICKER_LABELS.sleep, icon: 'moon.fill' },
  { key: 'breathing', label: PRIORITY_CATALOG_PICKER_LABELS.breathing, icon: 'wind' },
  { key: 'skincare', label: PRIORITY_CATALOG_PICKER_LABELS.skincare, icon: 'sparkles' },
  { key: 'vitamins', label: PRIORITY_CATALOG_PICKER_LABELS.vitamins, icon: 'pill.fill' },
  { key: 'posture', label: PRIORITY_CATALOG_PICKER_LABELS.posture, icon: 'figure.stand.line.dotted.figure.stand' },
  { key: 'eyerest', label: PRIORITY_CATALOG_PICKER_LABELS.eyerest, icon: 'eye' },

  // ─── 생산성을 높이는 도구 ───
  { key: 'reading', label: PRIORITY_CATALOG_PICKER_LABELS.reading, icon: 'book.fill' },
  { key: 'study', label: PRIORITY_CATALOG_PICKER_LABELS.study, icon: 'graduationcap.fill' },
  { key: 'planning', label: PRIORITY_CATALOG_PICKER_LABELS.planning, icon: 'calendar.badge.clock' },
  { key: 'writing', label: PRIORITY_CATALOG_PICKER_LABELS.writing, icon: 'square.and.pencil' },
  { key: 'language', label: PRIORITY_CATALOG_PICKER_LABELS.language, icon: 'character.bubble' },
  { key: 'creative', label: PRIORITY_CATALOG_PICKER_LABELS.creative, icon: 'paintpalette.fill' },
  { key: 'inbox', label: PRIORITY_CATALOG_PICKER_LABELS.inbox, icon: 'tray.2.fill' },
  { key: 'deepwork', label: PRIORITY_CATALOG_PICKER_LABELS.deepwork, icon: 'brain' },
  { key: 'journal', label: PRIORITY_CATALOG_PICKER_LABELS.journal, icon: 'book.closed.fill' },
  { key: 'pomodoro', label: PRIORITY_CATALOG_PICKER_LABELS.pomodoro, icon: 'timer' },
  { key: 'review', label: PRIORITY_CATALOG_PICKER_LABELS.review, icon: 'arrow.counterclockwise' },
  { key: 'news', label: PRIORITY_CATALOG_PICKER_LABELS.news, icon: 'newspaper.fill' },
  { key: 'organize', label: PRIORITY_CATALOG_PICKER_LABELS.organize, icon: 'tray.and.arrow.down.fill' },
  { key: 'podcast', label: PRIORITY_CATALOG_PICKER_LABELS.podcast, icon: 'headphones' },
  { key: 'work', label: PRIORITY_CATALOG_PICKER_LABELS.work, icon: 'bag.fill' },
  { key: 'coding', label: PRIORITY_CATALOG_PICKER_LABELS.coding, icon: 'chevron.left.forwardslash.chevron.right' },

  // ─── 레거시 호환 ───
  { key: 'other', label: PRIORITY_CATALOG_PICKER_LABELS.other, icon: 'person.fill' },
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
      icon: resolveCategoryCatalogIcon(key),
    } as PickerCategoryItem;
  }
  const base = PICKER_CATEGORIES.find((c) => c.key === key) ?? LEGACY_PICKER_BY_KEY[key];
  if (!base) return undefined;
  return {
    ...base,
    icon: resolveCategoryCatalogIcon(key),
  } as PickerCategoryItem;
}

/** 모든 카테고리에서 사용자 지정 이름을 우선 사용한다. */
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
  const raw =
    otherDetailConfig !== undefined ? otherDetailConfig : loadGoalDetailCategoryConfig(key);
  if (raw && typeof raw === 'object') {
    const dn = ((raw as Record<string, unknown>).displayName ?? '') as string;
    const trimmed = typeof dn === 'string' ? dn.trim() : '';
    if (trimmed.length > 0) return trimmed;
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

