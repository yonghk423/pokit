import { parseHHmmToMinutes } from '@shared/lib/time/parseHhmmToMinutes';

import { getAppLocale } from '../model/localeStore';
import type { AppLocale } from '../model/locale';
import { t, type I18nKey } from '../model/translate';

function resolveLocale(locale?: AppLocale): AppLocale {
  return locale ?? getAppLocale();
}

export function formatMinuteOfDay(minutes: number, locale?: AppLocale): string {
  if (minutes >= 24 * 60) {
    return 'AM 00:00';
  }
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const isAm = h24 < 12;
  const h12 = h24 === 0 ? 0 : h24 % 12 === 0 ? 12 : h24 % 12;
  const prefix = isAm ? 'AM' : 'PM';
  const hour = h12 === 0 ? '00' : String(h12);
  return `${prefix} ${hour}:${String(min).padStart(2, '0')}`;
}

export function formatHhmmClock(hhmm: string, locale?: AppLocale): string {
  void locale;
  const trimmed = hhmm.trim();
  if (trimmed === '24:00') return 'AM 00:00';
  const m = parseHHmmToMinutes(trimmed);
  if (m === null) return hhmm;
  return formatMinuteOfDay(m, locale);
}

/** `YYYY-MM-DD` → locale-aware short date */
export function formatDateKeyDisplay(dateKey: string, locale?: AppLocale): string {
  const loc = resolveLocale(locale);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (loc === 'ko') {
    return `${mo}월 ${d}일`;
  }
  if (loc === 'ja') {
    return `${mo}月${d}日`;
  }
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateKeyCompact(dateKey: string, locale?: AppLocale): string {
  return formatDateKeyDisplay(dateKey, locale);
}

/** `YYYY-MM-DD` → stacked month / day labels (onboarding time row) */
export function splitDateKeyCompact(
  dateKey: string,
  locale?: AppLocale,
): { month: string; day: string } | null {
  const loc = resolveLocale(locale);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (loc === 'ko') {
    return { month: `${mo}월`, day: `${d}일` };
  }
  if (loc === 'ja') {
    return { month: `${mo}月`, day: `${d}日` };
  }
  const date = new Date(y, mo - 1, d);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(d),
  };
}

export function formatTimelineHeaderDate(dateKey: string, locale?: AppLocale): string {
  const loc = resolveLocale(locale);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return formatDateKeyDisplay(dateKey, loc);
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const date = new Date(y, mo - 1, d);
  if (loc === 'ko') {
    const long = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${long[date.getDay()]}, ${mo}월 ${d}일`;
  }
  if (loc === 'ja') {
    const long = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    return `${long[date.getDay()]}、${mo}月${d}日`;
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatWeekdayShort(date: Date, locale?: AppLocale): string {
  const loc = resolveLocale(locale);
  if (loc === 'ko') {
    return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] ?? '';
  }
  if (loc === 'ja') {
    return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()] ?? '';
  }
  return date.toLocaleDateString('en-US', { weekday: 'short' }).replace('.', '');
}

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function formatWeekdayLabel(index: WeekdayIndex, locale?: AppLocale): string {
  const loc = resolveLocale(locale);
  if (loc === 'ko') {
    return ({ 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' } as const)[index];
  }
  if (loc === 'ja') {
    return ({ 0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土' } as const)[index];
  }
  const base = new Date(2024, 0, 7 + index);
  return base.toLocaleDateString('en-US', { weekday: 'short' }).replace('.', '');
}

export type DayMealSlot = 'dawn' | 'morning' | 'lunch' | 'dinner' | 'night';

const MEAL_SLOT_KEYS: Record<
  DayMealSlot,
  'mealSlot.dawn' | 'mealSlot.morning' | 'mealSlot.lunch' | 'mealSlot.dinner' | 'mealSlot.night'
> = {
  dawn: 'mealSlot.dawn',
  morning: 'mealSlot.morning',
  lunch: 'mealSlot.lunch',
  dinner: 'mealSlot.dinner',
  night: 'mealSlot.night',
};

export function formatMealSlotLabel(slot: DayMealSlot, locale?: AppLocale): string {
  const key = MEAL_SLOT_KEYS[slot] as I18nKey;
  return t(key, resolveLocale(locale));
}

export function formatDurationMinutes(min: number, locale?: AppLocale): string {
  const loc = resolveLocale(locale);
  const m = Math.max(0, Math.round(min));
  if (m === 0) return t('common.minutesUnit', loc, { count: 0 });
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    const rest = m % 60;
    if (rest === 0) return t('common.hoursUnit', loc, { count: hours });
    return t('common.hoursMinutesUnit', loc, { hours, minutes: rest });
  }
  return t('common.minutesUnit', loc, { count: m });
}
