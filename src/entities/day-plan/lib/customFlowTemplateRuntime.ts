import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import type {
  CounterDetailDataConfig,
  HabitDetailDataConfig,
  JournalDetailDataConfig,
  JournalEntry,
  ReminderDetailDataConfig,
} from './customFlowTemplateConfigs';
import type {
  MeasurementDetailDataConfig,
  MeasurementHistoryEntry,
} from './goalCategorySessionConfig';
import { parseHHmmToMinutes } from './parseTime';
import { getLocalMinutesOfDayNow } from './dayPlanTime';

export function ensureCounterDayBoundary(
  cfg: CounterDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  if (!cfg.dailyReset) return cfg;
  if (cfg.countDateKey === todayKey) return cfg;
  return { ...cfg, currentCount: 0, countDateKey: todayKey };
}

export function applyCounterDelta(
  cfg: CounterDetailDataConfig,
  delta: number,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  const base = ensureCounterDayBoundary(cfg, todayKey);
  const next = Math.max(0, base.currentCount + delta);
  return { ...base, currentCount: next, countDateKey: todayKey };
}

export function resetCounterCount(
  cfg: CounterDetailDataConfig,
  todayKey: string = getLocalDateKey(),
): CounterDetailDataConfig {
  return { ...ensureCounterDayBoundary(cfg, todayKey), currentCount: 0, countDateKey: todayKey };
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

export function applyMeasurementSave(
  cfg: MeasurementDetailDataConfig,
  nextValue: number,
  todayKey: string = getLocalDateKey(),
): MeasurementDetailDataConfig {
  const previousValue =
    cfg.currentValue > 0 && cfg.currentValue !== nextValue ? cfg.currentValue : cfg.previousValue;
  const historyEntry: MeasurementHistoryEntry = { dateKey: todayKey, value: nextValue };
  const history = [
    historyEntry,
    ...cfg.history.filter((h) => h.dateKey !== todayKey),
  ].slice(0, 14);
  return {
    ...cfg,
    previousValue,
    currentValue: nextValue,
    history,
    lastRecordedDateKey: todayKey,
  };
}

export function formatMeasurementDelta(current: number, previous: number): string | null {
  if (previous <= 0 || current === previous) return null;
  const delta = current - previous;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1).replace(/\.0$/, '')}`;
}

export function measurementQuickDeltas(unit: string): number[] {
  switch (unit) {
    case 'kg':
      return [-0.5, -0.1, 0.1, 0.5];
    case 'mmHg':
      return [-5, -1, 1, 5];
    case 'hours':
      return [-1, -0.5, 0.5, 1];
    case 'percent':
      return [-5, -1, 1, 5];
    default:
      return [-5, -1, 1, 5];
  }
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
