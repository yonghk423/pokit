/** 커스텀 루틴 템플릿별 dataConfig (checklist 제외 — OtherDetailDataConfig 사용) */

import {
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from '@shared/lib/customFlowAppearanceCatalog';

import {
  normalizeMeasurementDetailConfig,
  normalizeOtherDetailConfig,
  type MeasurementDetailDataConfig,
} from './goalCategorySessionConfig';
import { normalizeRoutineDisplayName } from './routineDisplayName';
import { normalizeRoutineSummary } from './routineSummary';

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

function appearanceFields(o: Record<string, unknown>) {
  const icon = normalizeCustomFlowIcon(o.icon);
  const accentColor = normalizeCustomFlowAccentColor(o.accentColor);
  return {
    ...(icon ? { icon } : {}),
    ...(accentColor ? { accentColor } : {}),
  };
}

function normalizeHhmmList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
      if (!m) return null;
      const hh = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
      const mm = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    })
    .filter((t): t is string => t != null)
    .slice(0, max);
}

export type CustomFlowTemplateKey =
  | 'checklist'
  | 'measurement'
  | 'habit'
  | 'counter'
  | 'focus'
  | 'journal'
  | 'reminder';

export const CUSTOM_FLOW_TEMPLATE_KEYS: readonly CustomFlowTemplateKey[] = [
  'checklist',
  'measurement',
  'habit',
  'counter',
  'focus',
  'journal',
  'reminder',
] as const;

const TEMPLATE_KEY_SET = new Set<string>(CUSTOM_FLOW_TEMPLATE_KEYS);

export function isCustomFlowTemplateKey(v: unknown): v is CustomFlowTemplateKey {
  return typeof v === 'string' && TEMPLATE_KEY_SET.has(v);
}

// --- habit ---
export type HabitDetailDataConfig = {
  templateKey: 'habit';
  displayName: string;
  summary: string;
  doneToday: boolean;
  streakDays: number;
  lastDoneDateKey: string;
  /** 최근 7일 중 완료한 날짜 — 주간 달력 표시용 */
  recentDoneDateKeys: string[];
  icon?: string;
  accentColor?: string;
};

export function normalizeHabitDetailConfig(raw: unknown): HabitDetailDataConfig {
  const o = asObj(raw);
  const streakRaw = Number(o.streakDays);
  const streakDays = Number.isFinite(streakRaw) ? Math.max(0, Math.min(9999, Math.round(streakRaw))) : 0;
  const recentDoneDateKeys = Array.isArray(o.recentDoneDateKeys)
    ? (o.recentDoneDateKeys as unknown[])
        .filter((k): k is string => typeof k === 'string' && k.length >= 10)
        .slice(0, 7)
    : [];
  return {
    templateKey: 'habit',
    displayName: normalizeRoutineDisplayName(o.displayName),
    summary: normalizeRoutineSummary(o.summary),
    doneToday: typeof o.doneToday === 'boolean' ? o.doneToday : false,
    streakDays,
    lastDoneDateKey: clampStr(o.lastDoneDateKey, 10),
    recentDoneDateKeys,
    ...appearanceFields(o),
  };
}

export function getInitialHabitDataConfig(): HabitDetailDataConfig {
  return normalizeHabitDetailConfig({ templateKey: 'habit', displayName: '', summary: '' });
}

// --- counter ---
export type CounterDetailDataConfig = {
  templateKey: 'counter';
  displayName: string;
  summary: string;
  activityLabel: string;
  unitLabel: string;
  goalCount: number;
  currentCount: number;
  dailyReset: boolean;
  countDateKey: string;
  icon?: string;
  accentColor?: string;
};

export function normalizeCounterDetailConfig(raw: unknown): CounterDetailDataConfig {
  const o = asObj(raw);
  const goalRaw = Number(o.goalCount);
  const goalCount = Number.isFinite(goalRaw) ? Math.max(1, Math.min(9999, Math.round(goalRaw))) : 8;
  const currentRaw = Number(o.currentCount);
  const currentCount = Number.isFinite(currentRaw)
    ? Math.max(0, Math.min(9999, Math.round(currentRaw)))
    : 0;
  return {
    templateKey: 'counter',
    displayName: normalizeRoutineDisplayName(o.displayName),
    summary: normalizeRoutineSummary(o.summary),
    activityLabel: clampStr(o.activityLabel, 40),
    unitLabel: clampStr(o.unitLabel, 12) || '회',
    goalCount,
    currentCount,
    dailyReset: typeof o.dailyReset === 'boolean' ? o.dailyReset : true,
    countDateKey: clampStr(o.countDateKey, 10),
    ...appearanceFields(o),
  };
}

export function getInitialCounterDataConfig(): CounterDetailDataConfig {
  return normalizeCounterDetailConfig({
    templateKey: 'counter',
    displayName: '',
    summary: '',
    activityLabel: '',
    unitLabel: '회',
    goalCount: 8,
    currentCount: 0,
  });
}

// --- focus ---
export type FocusDetailDataConfig = {
  templateKey: 'focus';
  displayName: string;
  summary: string;
  planMin: number;
  doneMin: number;
  focusMemo: string;
  icon?: string;
  accentColor?: string;
};

export function normalizeFocusDetailConfig(raw: unknown): FocusDetailDataConfig {
  const o = asObj(raw);
  const planMin = Math.max(5, Math.min(720, Number(o.planMin) || 25));
  const doneRaw = Number(o.doneMin);
  const doneMin = Math.max(0, Math.min(planMin, Number.isFinite(doneRaw) ? doneRaw : 0));
  return {
    templateKey: 'focus',
    displayName: normalizeRoutineDisplayName(o.displayName),
    summary: normalizeRoutineSummary(o.summary),
    planMin,
    doneMin,
    focusMemo: clampStr(o.focusMemo, 200),
    ...appearanceFields(o),
  };
}

export function getInitialFocusDataConfig(): FocusDetailDataConfig {
  return normalizeFocusDetailConfig({
    templateKey: 'focus',
    displayName: '',
    summary: '',
    planMin: 25,
    doneMin: 0,
    focusMemo: '',
  });
}

// --- journal ---
export type JournalEntry = {
  dateKey: string;
  text: string;
  mood?: string;
};

export type JournalDetailDataConfig = {
  templateKey: 'journal';
  displayName: string;
  summary: string;
  prompt: string;
  lastEntry: string;
  moodToday: string;
  recentEntries: JournalEntry[];
  icon?: string;
  accentColor?: string;
};

export function normalizeJournalDetailConfig(raw: unknown): JournalDetailDataConfig {
  const o = asObj(raw);
  const lastEntry = clampStr(o.lastEntry, 500);
  const recentEntries = Array.isArray(o.recentEntries)
    ? (o.recentEntries as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const e = entry as Record<string, unknown>;
          const dateKey = clampStr(e.dateKey, 10);
          const text = clampStr(e.text, 500);
          if (text.length === 0) return null;
          const mood = clampStr(e.mood, 12);
          return {
            dateKey: dateKey.length >= 10 ? dateKey : '',
            text,
            ...(mood.length > 0 ? { mood } : {}),
          };
        })
        .filter((e): e is JournalEntry => e != null)
        .slice(0, 14)
    : [];
  return {
    templateKey: 'journal',
    displayName: normalizeRoutineDisplayName(o.displayName),
    summary: normalizeRoutineSummary(o.summary),
    prompt: clampStr(o.prompt, 80),
    lastEntry,
    moodToday: clampStr(o.moodToday, 12),
    recentEntries:
      recentEntries.length > 0
        ? recentEntries
        : lastEntry.length > 0
          ? [{ dateKey: '', text: lastEntry }]
          : [],
    ...appearanceFields(o),
  };
}

export function getInitialJournalDataConfig(): JournalDetailDataConfig {
  return normalizeJournalDetailConfig({
    templateKey: 'journal',
    displayName: '',
    summary: '',
    prompt: '',
    lastEntry: '',
  });
}

// --- reminder ---
export type ReminderDetailDataConfig = {
  templateKey: 'reminder';
  displayName: string;
  summary: string;
  reminderTimes: string[];
  completedTimes: string[];
  /** @deprecated legacy — normalize maps to completedTimes */
  completedToday?: boolean;
  icon?: string;
  accentColor?: string;
};

export const MAX_CUSTOM_REMINDER_TIMES = 5;

export function normalizeReminderDetailConfig(raw: unknown): ReminderDetailDataConfig {
  const o = asObj(raw);
  const times = normalizeHhmmList(o.reminderTimes, MAX_CUSTOM_REMINDER_TIMES);
  let completedTimes = normalizeHhmmList(o.completedTimes, MAX_CUSTOM_REMINDER_TIMES);
  if (completedTimes.length === 0 && o.completedToday === true && times.length > 0) {
    completedTimes = [...times];
  }
  return {
    templateKey: 'reminder',
    displayName: normalizeRoutineDisplayName(o.displayName),
    summary: normalizeRoutineSummary(o.summary),
    reminderTimes: times.length > 0 ? times : ['09:00'],
    completedTimes,
    ...appearanceFields(o),
  };
}

export function getInitialReminderDataConfig(): ReminderDetailDataConfig {
  return normalizeReminderDetailConfig({
    templateKey: 'reminder',
    displayName: '',
    summary: '',
    reminderTimes: ['09:00'],
    completedTimes: [],
  });
}

export type CustomFlowTemplateDetailConfig =
  | MeasurementDetailDataConfig
  | HabitDetailDataConfig
  | CounterDetailDataConfig
  | FocusDetailDataConfig
  | JournalDetailDataConfig
  | ReminderDetailDataConfig;

function pickDisplayName(block: string, cat: string, blockVal: string, catVal: string): string {
  return block.length > 0 ? blockVal : cat.length > 0 ? catVal : '';
}

function pickSummary(block: string, cat: string, blockVal: string, catVal: string): string {
  return block.length > 0 ? blockVal : cat.length > 0 ? catVal : '';
}

function pickAppearance<T extends { icon?: string; accentColor?: string }>(
  b: T | null,
  c: T | null,
): { icon?: string; accentColor?: string } {
  const icon = b?.icon ?? c?.icon;
  const accentColor = b?.accentColor ?? c?.accentColor;
  return {
    ...(icon ? { icon } : {}),
    ...(accentColor ? { accentColor } : {}),
  };
}

export function mergeCustomFlowGoalDetailData(
  blockRaw: unknown | null,
  categoryRaw: unknown | null,
  fallback: unknown,
): unknown {
  const templateKey = resolveCustomFlowTemplateKeyFromRaw(categoryRaw ?? blockRaw ?? fallback);

  switch (templateKey) {
    case 'measurement': {
      const b = blockRaw != null ? normalizeMeasurementDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeMeasurementDetailConfig(categoryRaw) : null;
      return normalizeMeasurementDetailConfig({
        templateKey: 'measurement',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        metricLabel: pickDisplayName(
          (b?.metricLabel ?? '').trim(),
          (c?.metricLabel ?? '').trim(),
          b?.metricLabel ?? '',
          c?.metricLabel ?? '',
        ),
        unit: b?.unit ?? c?.unit ?? 'none',
        useGoalValue: b?.useGoalValue ?? c?.useGoalValue ?? false,
        goalValue: Math.max(b?.goalValue ?? 0, c?.goalValue ?? 0),
        currentValue: Math.max(b?.currentValue ?? 0, c?.currentValue ?? 0),
        previousValue: Math.max(b?.previousValue ?? 0, c?.previousValue ?? 0),
        history: (b?.history?.length ?? 0) >= (c?.history?.length ?? 0) ? b?.history ?? [] : c?.history ?? [],
        lastRecordedDateKey: pickDisplayName(
          (b?.lastRecordedDateKey ?? '').trim(),
          (c?.lastRecordedDateKey ?? '').trim(),
          b?.lastRecordedDateKey ?? '',
          c?.lastRecordedDateKey ?? '',
        ),
        frequency: b?.frequency ?? c?.frequency ?? 'once',
        ...pickAppearance(b, c),
      });
    }
    case 'habit': {
      const b = blockRaw != null ? normalizeHabitDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeHabitDetailConfig(categoryRaw) : null;
      return normalizeHabitDetailConfig({
        templateKey: 'habit',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        doneToday: (b?.doneToday ?? false) || (c?.doneToday ?? false),
        streakDays: Math.max(b?.streakDays ?? 0, c?.streakDays ?? 0),
        lastDoneDateKey: pickDisplayName(
          (b?.lastDoneDateKey ?? '').trim(),
          (c?.lastDoneDateKey ?? '').trim(),
          b?.lastDoneDateKey ?? '',
          c?.lastDoneDateKey ?? '',
        ),
        recentDoneDateKeys:
          (b?.recentDoneDateKeys?.length ?? 0) >= (c?.recentDoneDateKeys?.length ?? 0)
            ? b?.recentDoneDateKeys ?? []
            : c?.recentDoneDateKeys ?? [],
        ...pickAppearance(b, c),
      });
    }
    case 'counter': {
      const b = blockRaw != null ? normalizeCounterDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeCounterDetailConfig(categoryRaw) : null;
      const goalCount = Math.max(b?.goalCount ?? 0, c?.goalCount ?? 0, 1);
      return normalizeCounterDetailConfig({
        templateKey: 'counter',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        activityLabel: pickDisplayName(
          (b?.activityLabel ?? '').trim(),
          (c?.activityLabel ?? '').trim(),
          b?.activityLabel ?? '',
          c?.activityLabel ?? '',
        ),
        unitLabel: (b?.unitLabel ?? '').trim() || (c?.unitLabel ?? '').trim() || '회',
        goalCount,
        currentCount: Math.max(b?.currentCount ?? 0, c?.currentCount ?? 0),
        dailyReset: b?.dailyReset ?? c?.dailyReset ?? true,
        countDateKey: pickDisplayName(
          (b?.countDateKey ?? '').trim(),
          (c?.countDateKey ?? '').trim(),
          b?.countDateKey ?? '',
          c?.countDateKey ?? '',
        ),
        ...pickAppearance(b, c),
      });
    }
    case 'focus': {
      const b = blockRaw != null ? normalizeFocusDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeFocusDetailConfig(categoryRaw) : null;
      const planMin = Math.max(b?.planMin ?? 0, c?.planMin ?? 0, 5);
      return normalizeFocusDetailConfig({
        templateKey: 'focus',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        planMin,
        doneMin: Math.max(b?.doneMin ?? 0, c?.doneMin ?? 0),
        focusMemo: pickSummary(
          (b?.focusMemo ?? '').trim(),
          (c?.focusMemo ?? '').trim(),
          b?.focusMemo ?? '',
          c?.focusMemo ?? '',
        ),
        ...pickAppearance(b, c),
      });
    }
    case 'journal': {
      const b = blockRaw != null ? normalizeJournalDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeJournalDetailConfig(categoryRaw) : null;
      return normalizeJournalDetailConfig({
        templateKey: 'journal',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        prompt: pickDisplayName(
          (b?.prompt ?? '').trim(),
          (c?.prompt ?? '').trim(),
          b?.prompt ?? '',
          c?.prompt ?? '',
        ),
        lastEntry: pickSummary(
          (b?.lastEntry ?? '').trim(),
          (c?.lastEntry ?? '').trim(),
          b?.lastEntry ?? '',
          c?.lastEntry ?? '',
        ),
        moodToday: pickDisplayName(
          (b?.moodToday ?? '').trim(),
          (c?.moodToday ?? '').trim(),
          b?.moodToday ?? '',
          c?.moodToday ?? '',
        ),
        recentEntries:
          (b?.recentEntries?.length ?? 0) >= (c?.recentEntries?.length ?? 0)
            ? b?.recentEntries ?? []
            : c?.recentEntries ?? [],
        ...pickAppearance(b, c),
      });
    }
    case 'reminder': {
      const b = blockRaw != null ? normalizeReminderDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeReminderDetailConfig(categoryRaw) : null;
      const bl = b?.reminderTimes ?? [];
      const cl = c?.reminderTimes ?? [];
      const reminderTimes = bl.length >= cl.length ? bl : cl.length > 0 ? cl : bl;
      return normalizeReminderDetailConfig({
        templateKey: 'reminder',
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        reminderTimes,
        completedTimes: [
          ...new Set([...(b?.completedTimes ?? []), ...(c?.completedTimes ?? [])]),
        ].sort(),
        ...pickAppearance(b, c),
      });
    }
    case 'checklist':
    default: {
      const b = blockRaw != null ? normalizeOtherDetailConfig(blockRaw) : null;
      const c = categoryRaw != null ? normalizeOtherDetailConfig(categoryRaw) : null;
      const bl = b?.checklist ?? [];
      const cl = c?.checklist ?? [];
      const checklist = bl.length >= cl.length ? bl : cl.length > 0 ? cl : bl;
      return normalizeOtherDetailConfig({
        displayName: pickDisplayName(
          (b?.displayName ?? '').trim(),
          (c?.displayName ?? '').trim(),
          b?.displayName ?? '',
          c?.displayName ?? '',
        ),
        summary: pickSummary(
          (b?.summary ?? '').trim(),
          (c?.summary ?? '').trim(),
          b?.summary ?? '',
          c?.summary ?? '',
        ),
        checklist,
        ...pickAppearance(b, c),
      });
    }
  }
}

export function resolveCustomFlowTemplateKeyFromRaw(raw: unknown): CustomFlowTemplateKey {
  if (raw && typeof raw === 'object') {
    const key = (raw as Record<string, unknown>).templateKey;
    if (isCustomFlowTemplateKey(key)) return key;
  }
  return 'checklist';
}
