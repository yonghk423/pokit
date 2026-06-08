import { DEFAULT_BUILTIN_CUSTOM_FLOWS } from './defaultPriorityCatalog';
import { SEED_CATEGORY_POOL } from './devMockSeed/seedCatalogConstants';
import {
  type HistoryDailyStatRow,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from './historyStorage';
import { flushLocalStorageClientWrites } from './localStorageClient';

export const HISTORY_SEED_DAYS = 85;

const SEED_CATEGORIES = SEED_CATEGORY_POOL;

type DayIntensity = 'light' | 'normal' | 'heavy';

/** 최근 7일 — 도넛·핵심 목표 UI 데모용 고정 부스트 (10그룹 골고루) */
const RECENT_WEEK_BOOSTS: ReadonlyArray<Record<string, number>> = [
  {
    water: 2, reading: 1, meditation: 1,
    'customFlow:builtin_mind_gratitude': 1, 'customFlow:builtin_hobby_draw': 1,
    'customFlow:builtin_family_friends': 1,
  },
  {
    stretching: 1, planning: 2,
    'customFlow:builtin_hobby_guitar': 1, 'customFlow:builtin_family_call': 1,
    'customFlow:builtin_hobby_photo': 1, 'customFlow:builtin_mind_music': 1,
  },
  {
    water: 1, medicine: 1, reading: 2,
    'customFlow:builtin_hobby_cooking': 1, 'customFlow:builtin_mind_nap': 1, journal: 1,
  },
  {
    study: 2, 'customFlow:builtin_hobby_hiking': 1, 'customFlow:builtin_family_parents': 1,
    straightenBack: 1, deepwork: 1,
  },
  {
    water: 2, planning: 1, writing: 1,
    'customFlow:builtin_mind_pledge': 1, 'customFlow:builtin_family_community': 1,
  },
  {
    stretching: 1, fasting: 1, neckPosture: 1,
    'customFlow:builtin_family_partner': 1, 'customFlow:builtin_mind_detox': 1,
  },
  {
    reading: 1, study: 1, water: 1,
    'customFlow:builtin_hobby_draw': 1, 'customFlow:builtin_family_call': 1,
    'customFlow:builtin_mind_gratitude': 1,
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

/** 쉼 없이 매일 활동 — 히트맵·스트릭 데모용 */
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

  /** 커스텀 플로우가 주간 데이터에 꾸준히 섞이도록 자주 추가 */
  if (unitFloat(`${dateKey}:custom`) > 0.35) {
    const flow =
      DEFAULT_BUILTIN_CUSTOM_FLOWS[
        deterministicInt(`${dateKey}:customPick`, 0, DEFAULT_BUILTIN_CUSTOM_FLOWS.length - 1)
      ];
    if (flow) {
      const extra = deterministicInt(`${dateKey}:${flow.id}:extra`, 1, 2);
      categoryCompletions[flow.id] = (categoryCompletions[flow.id] ?? 0) + extra;
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

/** 오늘 기준 HISTORY_SEED_DAYS — 매일 1행, dateKey마다 항상 같은 패턴 */
export function generateHistorySeedRows(anchorDate: Date = new Date()): HistoryDailyStatRow[] {
  const anchorDateKey = formatDateKey(anchorDate);
  const rows: HistoryDailyStatRow[] = [];

  for (let i = HISTORY_SEED_DAYS - 1; i >= 0; i -= 1) {
    const d = addDaysToDate(anchorDate, -i);
    const dateKey = formatDateKey(d);
    const base = generateRow(dateKey, pickIntensity(dateKey, d.getDay()));
    rows.push(applyRecentWeekBoost(base, dateKey, anchorDateKey));
  }

  return rows;
}

export async function seedHistoryData(): Promise<number> {
  const rows = generateHistorySeedRows();
  saveHistoryDailyStats(rows);
  saveHistoryMeta({ lastUpdatedAt: new Date().toISOString(), schemaVersion: 1 });
  await flushLocalStorageClientWrites();
  return rows.length;
}
