import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import type {
  CounterDetailDataConfig,
  CounterHistoryEntry,
  HabitDetailDataConfig,
  JournalDetailDataConfig,
  JournalEntry,
  MemoDetailDataConfig,
  MemoEntry,
  ReminderDetailDataConfig,
} from './customFlowTemplateConfigs';
import { MAX_CUSTOM_REMINDER_TIMES, normalizeReminderDetailConfig } from './customFlowTemplateConfigs';
import type {
  MeasurementDetailDataConfig,
  MeasurementHistoryEntry,
} from './goalCategorySessionConfig';
import {
  formatMeasurementDelta,
  measurementQuickDeltas,
  roundMeasurementValue,
} from './measurementUnits';
import { parseHHmmToMinutes } from './parseTime';
import {
  normalizeReminderLabel,
  normalizeReminderTime,
  sortReminderScheduleItems,
  type ReminderScheduleItem,
} from './reminderSchedule';
import { getLocalMinutesOfDayNow } from './dayPlanTime';

export function ensureCounterDayBoundary(
  cfg: CounterDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  if (!cfg.dailyReset) return syncCounterHistoryForToday(cfg, todayKey);
  if (cfg.countDateKey === todayKey) return syncCounterHistoryForToday(cfg, todayKey);
  const history =
    cfg.countDateKey.length >= 10 && cfg.currentCount > 0
      ? upsertCounterHistoryEntry(cfg.history, {
          dateKey: cfg.countDateKey,
          count: cfg.currentCount,
        })
      : cfg.history;
  return syncCounterHistoryForToday(
    { ...cfg, currentCount: 0, countDateKey: todayKey, history },
    todayKey,
  );
}

function upsertCounterHistoryEntry(
  history: CounterHistoryEntry[],
  entry: CounterHistoryEntry,
): CounterHistoryEntry[] {
  return [entry, ...history.filter((row) => row.dateKey !== entry.dateKey)].slice(0, 14);
}

function syncCounterHistoryForToday(
  cfg: CounterDetailDataConfig,
  todayKey: string,
): CounterDetailDataConfig {
  if (cfg.currentCount <= 0 || cfg.countDateKey !== todayKey) return cfg;
  return {
    ...cfg,
    history: upsertCounterHistoryEntry(cfg.history, {
      dateKey: todayKey,
      count: cfg.currentCount,
    }),
  };
}

export function applyCounterDelta(
  cfg: CounterDetailDataConfig,
  delta: number,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  const base = ensureCounterDayBoundary(cfg, todayKey);
  const next = Math.max(0, Math.min(base.goalCount, base.currentCount + delta));
  return syncCounterHistoryForToday(
    { ...base, currentCount: next, countDateKey: todayKey },
    todayKey,
  );
}

export function applyCounterFillRemaining(
  cfg: CounterDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  const base = ensureCounterDayBoundary(cfg, todayKey);
  return syncCounterHistoryForToday(
    { ...base, currentCount: base.goalCount, countDateKey: todayKey },
    todayKey,
  );
}

export function resetCounterCount(
  cfg: CounterDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  return syncCounterHistoryForToday(
    { ...ensureCounterDayBoundary(cfg, todayKey), currentCount: 0, countDateKey: todayKey },
    todayKey,
  );
}

export function applyHabitDoneToggle(
  cfg: HabitDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): HabitDetailDataConfig {
  if (cfg.doneToday) {
    const recentDoneDateKeys = cfg.recentDoneDateKeys.filter((k) => k !== todayKey);
    const streakDays =
      cfg.lastDoneDateKey === todayKey ? Math.max(0, cfg.streakDays - 1) : cfg.streakDays;
    return {
      ...cfg,
      doneToday: false,
      recentDoneDateKeys,
      streakDays,
      lastDoneDateKey: recentDoneDateKeys[recentDoneDateKeys.length - 1] ?? '',
    };
  }
  const yesterday = addDaysToLocalDateKey(todayKey, -1);
  const streakDays =
    cfg.lastDoneDateKey === yesterday
      ? cfg.streakDays + 1
      : cfg.lastDoneDateKey === todayKey
        ? cfg.streakDays
        : 1;
  const recentDoneDateKeys = [
    todayKey,
    ...cfg.recentDoneDateKeys.filter((k) => k !== todayKey),
  ].slice(0, 7);
  return {
    ...cfg,
    doneToday: true,
    lastDoneDateKey: todayKey,
    streakDays,
    recentDoneDateKeys,
  };
}

export function buildHabitWeekDots(
  recentDoneDateKeys: string[],
  todayKey: string = getLocalDateKey(),
): boolean[] {
  const doneSet = new Set(recentDoneDateKeys);
  const dots: boolean[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    dots.push(doneSet.has(addDaysToLocalDateKey(todayKey, -i)));
  }
  return dots;
}

export { formatMeasurementDelta, measurementQuickDeltas } from './measurementUnits';

export function applyMeasurementSave(
  cfg: MeasurementDetailDataConfig,
  nextValue: number,
  todayKey: string = getLocalDateKey(),
): MeasurementDetailDataConfig {
  const value = roundMeasurementValue(nextValue, cfg.unit);
  const previousValue =
    cfg.currentValue > 0 && cfg.currentValue !== value ? cfg.currentValue : cfg.previousValue;
  const historyEntry: MeasurementHistoryEntry = { dateKey: todayKey, value };
  const history = [
    historyEntry,
    ...cfg.history.filter((h) => h.dateKey !== todayKey),
  ].slice(0, 14);
  return {
    ...cfg,
    previousValue,
    currentValue: value,
    history,
    lastRecordedDateKey: todayKey,
  };
}

export function measurementRecordedToday(
  cfg: MeasurementDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): boolean {
  return cfg.frequency === 'once' && cfg.lastRecordedDateKey === todayKey && cfg.currentValue > 0;
}

export function applyJournalSave(
  cfg: JournalDetailDataConfig,
  entry: string,
  mood: string,
  todayKey: string = getLocalDateKey(),
): JournalDetailDataConfig {
  const trimmed = entry.trim();
  if (trimmed.length === 0) return cfg;
  const journalEntry: JournalEntry = {
    dateKey: todayKey,
    text: trimmed,
    ...(mood.trim().length > 0 ? { mood: mood.trim() } : {}),
  };
  const recentEntries = [
    journalEntry,
    ...cfg.recentEntries.filter((e) => e.dateKey !== todayKey || e.text !== trimmed),
  ].slice(0, 14);
  return {
    ...cfg,
    lastEntry: trimmed,
    moodToday: mood.trim(),
    recentEntries,
  };
}

export function applyMemoSave(
  cfg: MemoDetailDataConfig,
  entry: string,
  todayKey: string = getLocalDateKey(),
): MemoDetailDataConfig {
  const trimmed = entry.trim();
  if (trimmed.length === 0) return cfg;
  const memoEntry: MemoEntry = { dateKey: todayKey, text: trimmed };
  const recentEntries = [
    memoEntry,
    ...cfg.recentEntries.filter((e) => e.dateKey !== todayKey || e.text !== trimmed),
  ].slice(0, 14);
  return {
    ...cfg,
    lastEntry: trimmed,
    recentEntries,
  };
}

export const JOURNAL_MOOD_OPTIONS = ['최고', '좋음', '보통', '별로', '힘듦'] as const;

export function toggleReminderTimeDone(
  cfg: ReminderDetailDataConfig,
  time: string,
): ReminderDetailDataConfig {
  const done = cfg.completedTimes.includes(time);
  const completedTimes = done
    ? cfg.completedTimes.filter((t) => t !== time)
    : [...cfg.completedTimes, time].sort();
  return { ...cfg, completedTimes };
}

function withReminderItems(
  cfg: ReminderDetailDataConfig,
  items: ReminderScheduleItem[],
): ReminderDetailDataConfig {
  const times = new Set(items.map((item) => item.time));
  return normalizeReminderDetailConfig({
    ...cfg,
    reminderItems: items,
    completedTimes: cfg.completedTimes.filter((time) => times.has(time)),
  });
}

export function updateReminderItemLabel(
  cfg: ReminderDetailDataConfig,
  time: string,
  label: string,
): ReminderDetailDataConfig {
  const items = cfg.reminderItems.map((item) =>
    item.time === time ? { ...item, label: normalizeReminderLabel(label) } : item,
  );
  return withReminderItems(cfg, items);
}

export function updateReminderItemTime(
  cfg: ReminderDetailDataConfig,
  oldTime: string,
  newTimeRaw: string,
): ReminderDetailDataConfig | null {
  const newTime = normalizeReminderTime(newTimeRaw);
  if (!newTime) return null;
  if (newTime === oldTime) return cfg;
  if (cfg.reminderItems.some((item) => item.time === newTime)) return null;

  const items = sortReminderScheduleItems(
    cfg.reminderItems.map((item) =>
      item.time === oldTime ? { ...item, time: newTime } : item,
    ),
  );
  const completedTimes = cfg.completedTimes.map((t) => (t === oldTime ? newTime : t));
  return withReminderItems({ ...cfg, completedTimes }, items);
}

export function addReminderScheduleItem(
  cfg: ReminderDetailDataConfig,
  timeRaw: string,
  labelRaw: string,
): ReminderDetailDataConfig | null {
  const time = normalizeReminderTime(timeRaw);
  if (!time) return null;
  if (cfg.reminderItems.some((item) => item.time === time)) return null;
  if (cfg.reminderItems.length >= MAX_CUSTOM_REMINDER_TIMES) return null;
  const items = sortReminderScheduleItems([
    ...cfg.reminderItems,
    { time, label: normalizeReminderLabel(labelRaw) },
  ]);
  return withReminderItems(cfg, items);
}

export function removeReminderScheduleItem(
  cfg: ReminderDetailDataConfig,
  time: string,
): ReminderDetailDataConfig {
  const items = cfg.reminderItems.filter((item) => item.time !== time);
  return normalizeReminderDetailConfig({
    ...cfg,
    reminderItems: items,
    completedTimes: cfg.completedTimes.filter((t) => t !== time),
  });
}

export function reminderProgress(cfg: ReminderDetailDataConfig): { done: number; total: number } {
  const total = cfg.reminderTimes.length;
  const done = cfg.reminderTimes.filter((t) => cfg.completedTimes.includes(t)).length;
  return { done, total };
}

export function resolveNextReminderTime(
  cfg: ReminderDetailDataConfig,
  nowMin: number = getLocalMinutesOfDayNow(),
): string | null {
  const pending = cfg.reminderTimes.filter((t) => !cfg.completedTimes.includes(t));
  if (pending.length === 0) return null;
  const sorted = [...pending].sort(
    (a, b) => (parseHHmmToMinutes(a) ?? 0) - (parseHHmmToMinutes(b) ?? 0),
  );
  const upcoming = sorted.find((t) => (parseHHmmToMinutes(t) ?? 0) >= nowMin);
  return upcoming ?? sorted[0] ?? null;
}

export function minutesUntilReminder(time: string, nowMin: number = getLocalMinutesOfDayNow()): number {
  const target = parseHHmmToMinutes(time);
  if (target == null) return 0;
  if (target >= nowMin) return target - nowMin;
  return 24 * 60 - nowMin + target;
}

/** 알림까지 남은 시간 — UI 표시용 */
export function formatReminderCountdown(minutes: number, time: string): string {
  if (minutes <= 0) return '지금';
  if (minutes <= 59) return `${minutes}분 후`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `약 ${h}시간 ${m}분 후` : `약 ${h}시간 후`;
  }
  return `내일 ${time}`;
}

export function focusElapsedMinFromSession(
  planMin: number,
  blockProgress: number,
  blockDurationSec: number,
): number {
  if (planMin <= 0) return 0;
  const elapsedSec = Math.round(blockDurationSec * blockProgress);
  return Math.min(planMin, Math.max(0, Math.round(elapsedSec / 60)));
}

export function formatValueCompact(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}
