import { SEED_CATEGORY_POOL } from './devMockSeed/seedCatalogConstants';
import {
  type HistoryDailyStatRow,
  loadHistoryDailyStats,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from './historyStorage';
import { flushLocalStorageClientWrites } from './localStorageClient';

export const HISTORY_SEED_DAYS = 85;

/** Dev Menu 목업 — 통계 UI 미리보기용 시나리오 */
export type HistorySeedProfile = 'strong' | 'mixed' | 'low';

export const HISTORY_SEED_PROFILE_LABEL_KO: Record<HistorySeedProfile, string> = {
  strong: '고달성',
  mixed: '혼합',
  low: '저달성',
};

const SEED_CATEGORIES = SEED_CATEGORY_POOL;

type DayIntensity = 'light' | 'normal' | 'heavy';
type DayOutcome = 'empty' | 'low' | 'medium' | 'high';

/** 최근 7일 — 주간 히스토리 카드가 꽉 차 보이도록 카테고리·횟수를 넉넉히 */
const RECENT_WEEK_BOOSTS: ReadonlyArray<Record<string, number>> = [
  {
    healthIntake: 2,
    reading: 2,
    fasting: 1,
    'customFlow:preset_daily_bed': 1,
    'customFlow:preset_daily_exercise': 1,
    'customFlow:preset_stretching': 1,
  },
  {
    reading: 2,
    work: 2,
    fasting: 1,
    healthIntake: 1,
    'customFlow:preset_daily_clean': 1,
    'customFlow:preset_daily_exercise': 1,
  },
  {
    healthIntake: 2,
    reading: 2,
    'customFlow:preset_daily_exercise': 2,
    'customFlow:preset_stretching': 1,
    fasting: 1,
  },
  {
    work: 2,
    fasting: 1,
    healthIntake: 2,
    reading: 1,
    'customFlow:preset_daily_bed': 1,
    'customFlow:preset_daily_laundry': 1,
  },
  {
    healthIntake: 2,
    'customFlow:preset_stretching': 2,
    reading: 2,
    'customFlow:preset_daily_exercise': 1,
    fasting: 1,
  },
  {
    fasting: 2,
    reading: 2,
    'customFlow:preset_daily_bed': 1,
    healthIntake: 1,
    work: 1,
    'customFlow:preset_daily_wash': 1,
  },
  {
    reading: 2,
    work: 1,
    healthIntake: 2,
    fasting: 1,
    'customFlow:preset_daily_bed': 1,
    'customFlow:preset_daily_exercise': 1,
    'customFlow:preset_stretching': 1,
  },
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDate(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function daysBetween(startKey: string, endKey: string): number {
  const parse = (k: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k.trim());
    if (!m) return 0;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0).getTime();
  };
  return Math.round((parse(endKey) - parse(startKey)) / 86400000);
}

/** dateKey 기준 고정 해시 — 재seed해도 같은 날짜는 같은 값 */
function hashSeed(label: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < label.length; i += 1) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 1_677_7619);
  }
  return h >>> 0;
}

function unitFloat(seed: string): number {
  return hashSeed(seed) / 0xffffffff;
}

function deterministicInt(seed: string, min: number, max: number): number {
  if (max <= min) return min;
  return min + (hashSeed(seed) % (max - min + 1));
}

function pickDeterministicCategories(dateKey: string, count: number): Array<(typeof SEED_CATEGORIES)[number]> {
  const available = [...SEED_CATEGORIES];
  const picked: Array<(typeof SEED_CATEGORIES)[number]> = [];
  const take = Math.min(count, available.length);

  for (let i = 0; i < take; i += 1) {
    const idx = deterministicInt(`${dateKey}:cat:${i}`, 0, available.length - 1);
    picked.push(available[idx]);
    available.splice(idx, 1);
  }

  return picked;
}

/** 고달성 프로필 — 쉼 없이 매일 활동 */
function pickIntensity(dateKey: string, dayOfWeek: number): DayIntensity {
  const rand = unitFloat(`${dateKey}:intensity`);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    if (rand < 0.35) return 'light';
    if (rand < 0.8) return 'normal';
    return 'heavy';
  }
  if (rand < 0.15) return 'light';
  if (rand < 0.55) return 'normal';
  return 'heavy';
}

function pickMixedOutcome(dateKey: string): DayOutcome {
  const r = unitFloat(`${dateKey}:outcome`);
  if (r < 0.12) return 'empty';
  if (r < 0.37) return 'low';
  if (r < 0.72) return 'medium';
  return 'high';
}

function pickDayOutcome(
  dateKey: string,
  profile: HistorySeedProfile,
  daysFromAnchor: number,
): DayOutcome {
  if (profile === 'strong') {
    return 'high';
  }

  if (profile === 'low') {
    if (daysFromAnchor <= 13) {
      const r = unitFloat(`${dateKey}:low-recent`);
      if (r < 0.55) return 'empty';
      if (r < 0.9) return 'low';
      return 'medium';
    }
    if (daysFromAnchor <= 30) {
      const r = unitFloat(`${dateKey}:low-mid`);
      if (r < 0.2) return 'empty';
      if (r < 0.7) return 'low';
      return 'medium';
    }
    return pickMixedOutcome(dateKey);
  }

  return pickMixedOutcome(dateKey);
}

function mergeCategoryCompletions(
  base: Record<string, number>,
  extra: Record<string, number>,
): Record<string, number> {
  const out = { ...base };
  for (const [key, raw] of Object.entries(extra)) {
    const count = Math.max(0, Math.floor(Number(raw) || 0));
    if (count <= 0) continue;
    out[key] = (out[key] ?? 0) + count;
  }
  return out;
}

function applyRecentWeekBoost(
  row: HistoryDailyStatRow,
  dateKey: string,
  anchorDateKey: string,
): HistoryDailyStatRow {
  const daysFromAnchor = daysBetween(dateKey, anchorDateKey);
  if (daysFromAnchor < 0 || daysFromAnchor > 6) return row;

  const boostIndex = 6 - daysFromAnchor;
  const boost = RECENT_WEEK_BOOSTS[boostIndex];
  if (!boost) return row;

  const categoryCompletions = mergeCategoryCompletions(row.categoryCompletions ?? {}, boost);
  const completedFlowCount = Object.values(categoryCompletions).reduce((s, n) => s + n, 0);
  const totalPlanned = Math.max(completedFlowCount, row.completedFlowCount + deterministicInt(`${dateKey}:planned`, 0, 2));
  const completionRate = totalPlanned > 0 ? Math.round((completedFlowCount / totalPlanned) * 100) / 100 : 1;

  return {
    ...row,
    categoryCompletions,
    completedFlowCount,
    sessionCount: completedFlowCount,
    completionRate,
  };
}

function buildEmptyRow(dateKey: string): HistoryDailyStatRow {
  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: 0,
    sessionCount: 0,
    completionRate: 0,
    categoryMinutes: {},
    categoryCompletions: {},
  };
}

function buildCompletionRow(
  dateKey: string,
  categoryCount: number,
  countPerCategory: { min: number; max: number },
  plannedExtra: { min: number; max: number },
): HistoryDailyStatRow {
  const categories = pickDeterministicCategories(dateKey, categoryCount);
  const categoryCompletions: Record<string, number> = {};
  let totalCompleted = 0;

  for (const cat of categories) {
    const count = deterministicInt(`${dateKey}:${cat}:count`, countPerCategory.min, countPerCategory.max);
    categoryCompletions[cat] = count;
    totalCompleted += count;
  }

  const totalPlanned = totalCompleted + deterministicInt(`${dateKey}:planned`, plannedExtra.min, plannedExtra.max);
  const completionRate =
    totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) / 100 : 0;

  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: totalCompleted,
    sessionCount: totalCompleted,
    completionRate,
    categoryMinutes: {},
    categoryCompletions,
  };
}

function generateRow(dateKey: string, intensity: DayIntensity): HistoryDailyStatRow {
  const categoryCount =
    intensity === 'light'
      ? deterministicInt(`${dateKey}:catCount`, 3, 4)
      : intensity === 'normal'
        ? deterministicInt(`${dateKey}:catCount`, 4, 7)
        : deterministicInt(`${dateKey}:catCount`, 6, 10);
  const categories = pickDeterministicCategories(dateKey, categoryCount);

  const categoryCompletions: Record<string, number> = {};
  let totalCompleted = 0;
  for (const cat of categories) {
    const count =
      intensity === 'light'
        ? 1
        : intensity === 'normal'
          ? deterministicInt(`${dateKey}:${cat}:count`, 1, 2)
          : deterministicInt(`${dateKey}:${cat}:count`, 1, 3);
    categoryCompletions[cat] = count;
    totalCompleted += count;
  }

  /** 커스텀 플로우는 사용자 생성분만 — dev seed에서는 표준 6개만 사용 */
  if (unitFloat(`${dateKey}:custom`) > 0.35 && SEED_CATEGORIES.length > categoryCount) {
    const extraCat =
      SEED_CATEGORIES[deterministicInt(`${dateKey}:customPick`, 0, SEED_CATEGORIES.length - 1)];
    if (extraCat && !(extraCat in categoryCompletions)) {
      const extra = deterministicInt(`${dateKey}:${extraCat}:extra`, 1, 2);
      categoryCompletions[extraCat] = extra;
      totalCompleted += extra;
    }
  }

  const totalPlanned =
    totalCompleted +
    (intensity === 'light'
      ? deterministicInt(`${dateKey}:planned`, 0, 2)
      : deterministicInt(`${dateKey}:planned`, 0, 1));
  const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) / 100 : 1;

  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: totalCompleted,
    sessionCount: totalCompleted,
    completionRate,
    categoryMinutes: {},
    categoryCompletions,
  };
}

function generateRowForOutcome(dateKey: string, outcome: DayOutcome): HistoryDailyStatRow {
  if (outcome === 'empty') {
    return buildEmptyRow(dateKey);
  }
  if (outcome === 'low') {
    return buildCompletionRow(dateKey, deterministicInt(`${dateKey}:lowCats`, 1, 2), { min: 1, max: 1 }, { min: 3, max: 6 });
  }
  if (outcome === 'medium') {
    return buildCompletionRow(dateKey, deterministicInt(`${dateKey}:medCats`, 3, 4), { min: 1, max: 2 }, { min: 1, max: 3 });
  }
  const intensity = pickIntensity(dateKey, parseDateKeyForDow(dateKey));
  return generateRow(dateKey, intensity);
}

function parseDateKeyForDow(dateKey: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return 0;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0).getDay();
}

/** 오늘 기준 HISTORY_SEED_DAYS — dateKey마다 항상 같은 패턴 */
export function generateHistorySeedRows(
  anchorDate: Date = new Date(),
  profile: HistorySeedProfile = 'mixed',
): HistoryDailyStatRow[] {
  const anchorDateKey = formatDateKey(anchorDate);
  const rows: HistoryDailyStatRow[] = [];

  for (let i = HISTORY_SEED_DAYS - 1; i >= 0; i -= 1) {
    const d = addDaysToDate(anchorDate, -i);
    const dateKey = formatDateKey(d);
    const daysFromAnchor = daysBetween(dateKey, anchorDateKey);

    let row: HistoryDailyStatRow;
    if (profile === 'strong') {
      row = generateRow(dateKey, pickIntensity(dateKey, d.getDay()));
      row = applyRecentWeekBoost(row, dateKey, anchorDateKey);
    } else {
      const outcome = pickDayOutcome(dateKey, profile, daysFromAnchor);
      row = generateRowForOutcome(dateKey, outcome);
      if (profile === 'mixed' && outcome === 'high' && daysFromAnchor <= 6) {
        row = applyRecentWeekBoost(row, dateKey, anchorDateKey);
      }
    }
    rows.push(row);
  }

  return rows;
}

export async function seedHistoryData(profile: HistorySeedProfile = 'mixed'): Promise<number> {
  const rows = generateHistorySeedRows(new Date(), profile);
  saveHistoryDailyStats(rows);
  saveHistoryMeta({ lastUpdatedAt: new Date().toISOString(), schemaVersion: 1 });
  await flushLocalStorageClientWrites();
  return rows.length;
}

/** 스크린샷용 — 이번 달(오늘 이후 포함)을 고밀도로 채워 월간 히스토리가 꽉 차 보이게 한다. */
export async function fillCurrentMonthHistoryForScreenshotDemo(
  anchorDate: Date = new Date(),
): Promise<number> {
  const year = anchorDate.getFullYear();
  const monthIndex = anchorDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const existing = loadHistoryDailyStats();
  const byKey = new Map(existing.map((row) => [row.dateKey, row]));

  const coreCategories = [
    'healthIntake',
    'fasting',
    'reading',
    'work',
    'customFlow:preset_daily_bed',
    'customFlow:preset_daily_clean',
    'customFlow:preset_daily_laundry',
    'customFlow:preset_daily_exercise',
    'customFlow:preset_stretching',
  ] as const;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const categoryCompletions: Record<string, number> = {};
    let totalCompleted = 0;
    for (const cat of coreCategories) {
      // 약 90% 이상 채워 월간 그리드가 촘촘해 보이게
      if (unitFloat(`${dateKey}:${cat}:monthFill`) < 0.08) continue;
      const count = deterministicInt(`${dateKey}:${cat}:monthCount`, 1, 2);
      categoryCompletions[cat] = count;
      totalCompleted += count;
    }
    if (totalCompleted === 0) {
      categoryCompletions.healthIntake = 1;
      categoryCompletions.reading = 1;
      totalCompleted = 2;
    }
    byKey.set(dateKey, {
      dateKey,
      focusMinutes: 0,
      completedFlowCount: totalCompleted,
      sessionCount: totalCompleted,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions,
    });
  }

  const merged = Array.from(byKey.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  saveHistoryDailyStats(merged);
  saveHistoryMeta({ lastUpdatedAt: new Date().toISOString(), schemaVersion: 1 });
  await flushLocalStorageClientWrites();
  return daysInMonth;
}
