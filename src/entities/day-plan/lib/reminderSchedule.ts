import { formatMinutesToHHmm } from './dayPlanTimeMath';
import { parseHHmmToMinutes } from './parseTime';

export type ReminderScheduleItem = {
  time: string;
  label: string;
};

export type ReminderSchedulePreset = {
  id: string;
  title: string;
  items: ReminderScheduleItem[];
};

/** 자주 쓰는 알림 묶음 — 설정에서 한 번에 채우기 */
export const REMINDER_SCHEDULE_PRESETS: readonly ReminderSchedulePreset[] = [
  {
    id: 'medicine',
    title: '약·영양제',
    items: [
      { time: '09:00', label: '아침 영양제' },
      { time: '18:00', label: '저녁 영양제' },
    ],
  },
  {
    id: 'water',
    title: '물 마시기',
    items: [
      { time: '10:00', label: '물 한 잔' },
      { time: '14:00', label: '물 한 잔' },
      { time: '18:00', label: '물 한 잔' },
    ],
  },
  {
    id: 'meals',
    title: '식사 알림',
    items: [
      { time: '08:00', label: '아침 식사' },
      { time: '12:30', label: '점심 식사' },
      { time: '19:00', label: '저녁 식사' },
    ],
  },
  {
    id: 'study',
    title: '공부 알림',
    items: [
      { time: '09:00', label: '오전 공부' },
      { time: '15:00', label: '오후 복습' },
    ],
  },
] as const;

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

export function normalizeReminderTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = HHMM_RE.exec(trimmed);
  if (!match) return null;
  const hh = Math.min(23, Math.max(0, parseInt(match[1]!, 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2]!, 10)));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function normalizeReminderLabel(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 40);
}

export function resolveReminderItemTitle(item: ReminderScheduleItem): string {
  const label = normalizeReminderLabel(item.label);
  return label.length > 0 ? label : item.time;
}

export function sortReminderScheduleItems(items: ReminderScheduleItem[]): ReminderScheduleItem[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * 알림 추가 기본 시각 — 가장 늦은 기존 알림 + `stepMinutes`(기본 60분).
 * 같은 시각이 있으면 같은 간격으로 비어 있는 시각을 찾는다.
 */
export function suggestNextReminderTime(
  items: readonly ReminderScheduleItem[],
  stepMinutes = 60,
): string {
  const step =
    Number.isFinite(stepMinutes) && stepMinutes > 0 ? Math.floor(stepMinutes) : 60;
  const occupied = new Set<string>();
  for (const item of items) {
    const time = normalizeReminderTime(item.time);
    if (time) occupied.add(time);
  }

  const sorted = sortReminderScheduleItems(
    items
      .map((item) => {
        const time = normalizeReminderTime(item.time);
        return time ? { time, label: item.label } : null;
      })
      .filter((item): item is ReminderScheduleItem => item != null),
  );

  if (sorted.length === 0) return '09:00';

  const lastMin = parseHHmmToMinutes(sorted[sorted.length - 1]!.time) ?? 9 * 60;
  const day = 24 * 60;
  let candidate = (lastMin + step) % day;
  const maxTries = Math.max(1, Math.floor(day / step));
  for (let i = 0; i < maxTries; i += 1) {
    const hhmm = formatMinutesToHHmm(candidate);
    if (!occupied.has(hhmm)) return hhmm;
    candidate = (candidate + step) % day;
  }
  return formatMinutesToHHmm((lastMin + step) % day);
}

export function normalizeReminderScheduleItems(
  rawItems: unknown,
  legacyTimes: string[],
  maxItems: number,
): ReminderScheduleItem[] {
  const labelByTime = new Map<string, string>();

  if (Array.isArray(rawItems)) {
    for (const row of rawItems) {
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      const time = normalizeReminderTime(record.time);
      if (!time) continue;
      labelByTime.set(time, normalizeReminderLabel(record.label));
    }
  }

  const times =
    labelByTime.size > 0
      ? [...labelByTime.keys()]
      : legacyTimes.map((time) => normalizeReminderTime(time)).filter((time): time is string => Boolean(time));

  const uniqueTimes = [...new Set(times)].slice(0, maxItems);
  if (uniqueTimes.length === 0) return [{ time: '09:00', label: '' }];

  return sortReminderScheduleItems(
    uniqueTimes.map((time) => ({
      time,
      label: labelByTime.get(time) ?? '',
    })),
  );
}

export function findReminderScheduleItem(
  items: ReminderScheduleItem[],
  time: string,
): ReminderScheduleItem | undefined {
  return items.find((item) => item.time === time);
}

export function isReminderPresetActive(
  items: ReminderScheduleItem[],
  preset: ReminderSchedulePreset,
): boolean {
  if (items.length !== preset.items.length) return false;
  const sorted = sortReminderScheduleItems(items);
  const presetSorted = sortReminderScheduleItems(preset.items);
  return sorted.every(
    (item, index) =>
      item.time === presetSorted[index]?.time && item.label === presetSorted[index]?.label,
  );
}

export function mergeReminderScheduleItems(
  primary: ReminderScheduleItem[],
  secondary: ReminderScheduleItem[],
): ReminderScheduleItem[] {
  const map = new Map<string, ReminderScheduleItem>();
  for (const item of [...primary, ...secondary]) {
    const existing = map.get(item.time);
    if (!existing) {
      map.set(item.time, item);
      continue;
    }
    map.set(item.time, {
      time: item.time,
      label: existing.label.length >= item.label.length ? existing.label : item.label,
    });
  }
  return sortReminderScheduleItems([...map.values()]);
}
