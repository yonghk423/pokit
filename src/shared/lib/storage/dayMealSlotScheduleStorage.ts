import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayMealSlot = 'dawn' | 'morning' | 'lunch' | 'dinner' | 'night';

export const DAY_MEAL_SLOT_ORDER: readonly DayMealSlot[] = [
  'dawn',
  'morning',
  'lunch',
  'dinner',
  'night',
];

export type DayMealSlotSchedule = Record<DayMealSlot, string>;

export const DEFAULT_DAY_MEAL_SLOT_SCHEDULE: DayMealSlotSchedule = {
  dawn: '04:00',
  morning: '06:00',
  lunch: '12:30',
  dinner: '19:00',
  night: '21:00',
};

function parseHhmmToMinutes(raw: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeHhmm(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const mins = parseHhmmToMinutes(raw);
  if (mins === null) return fallback;
  return formatMinutesToHhmm(mins);
}

/** 새벽 → 아침 → … → 밤 순으로 시작 시각이 증가해야 함 */
export function isDayMealSlotScheduleValid(schedule: DayMealSlotSchedule): boolean {
  let prev = -1;
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const mins = parseHhmmToMinutes(schedule[slot]);
    if (mins === null) return false;
    if (mins <= prev) return false;
    prev = mins;
  }
  return true;
}

export function normalizeDayMealSlotSchedule(input: unknown): DayMealSlotSchedule {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const next: DayMealSlotSchedule = {
    dawn: normalizeHhmm(raw.dawn, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.dawn),
    morning: normalizeHhmm(raw.morning, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.morning),
    lunch: normalizeHhmm(raw.lunch, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.lunch),
    dinner: normalizeHhmm(raw.dinner, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.dinner),
    night: normalizeHhmm(raw.night, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.night),
  };
  if (!isDayMealSlotScheduleValid(next)) {
    return { ...DEFAULT_DAY_MEAL_SLOT_SCHEDULE };
  }
  return next;
}

export function loadDayMealSlotSchedule(): DayMealSlotSchedule {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.dayMealSlotSchedule);
  return normalizeDayMealSlotSchedule(raw);
}

export function saveDayMealSlotSchedule(next: DayMealSlotSchedule): DayMealSlotSchedule {
  const normalized = normalizeDayMealSlotSchedule(next);
  localStorageClient.setJson(StorageKeys.dayMealSlotSchedule, normalized);
  return normalized;
}

export function mealSlotStartMinutes(schedule: DayMealSlotSchedule, slot: DayMealSlot): number {
  return parseHhmmToMinutes(schedule[slot]) ?? parseHhmmToMinutes(DEFAULT_DAY_MEAL_SLOT_SCHEDULE[slot]) ?? 0;
}

/** 현재 시각(0–1439) 기준 활성 구간 — 사용자 시작 시각 기준 */
export function resolveCurrentMealSlotFromSchedule(
  nowMin: number,
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
): DayMealSlot {
  const normalized = normalizeDayMealSlotSchedule(schedule);
  let current: DayMealSlot = 'night';
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const start = mealSlotStartMinutes(normalized, slot);
    if (nowMin >= start) current = slot;
  }
  return current;
}

export function getMealSlotStartHhmm(
  schedule: DayMealSlotSchedule,
  slot: DayMealSlot,
): string {
  return normalizeDayMealSlotSchedule(schedule)[slot];
}
