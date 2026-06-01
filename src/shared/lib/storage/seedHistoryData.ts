import {
  type HistoryDailyStatRow,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from './historyStorage';
import { flushLocalStorageClientWrites } from './localStorageClient';

export const HISTORY_SEED_DAYS = 85;

const SEED_CATEGORIES = [
  'reading',
  'study',
  'stretching',
  'water',
  'planning',
  'fasting',
  'medicine',
] as const;

type DayIntensity = 'light' | 'normal' | 'heavy';

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
    if (rand < 0.45) return 'light';
    if (rand < 0.85) return 'normal';
    return 'heavy';
  }
  if (rand < 0.2) return 'light';
  if (rand < 0.65) return 'normal';
  return 'heavy';
}

function generateRow(dateKey: string, intensity: DayIntensity): HistoryDailyStatRow {
  const categoryCount =
    intensity === 'light'
      ? deterministicInt(`${dateKey}:catCount`, 1, 2)
      : intensity === 'normal'
        ? deterministicInt(`${dateKey}:catCount`, 2, 4)
        : deterministicInt(`${dateKey}:catCount`, 4, 6);
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

  const totalPlanned =
    totalCompleted +
    (intensity === 'light'
      ? deterministicInt(`${dateKey}:planned`, 1, 3)
      : deterministicInt(`${dateKey}:planned`, 0, 2));
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
  const rows: HistoryDailyStatRow[] = [];

  for (let i = HISTORY_SEED_DAYS - 1; i >= 0; i -= 1) {
    const d = addDaysToDate(anchorDate, -i);
    const dateKey = formatDateKey(d);
    rows.push(generateRow(dateKey, pickIntensity(dateKey, d.getDay())));
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
