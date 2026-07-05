import {
  getLocalDateKey,
  localDateToDateKey,
  parseLocalDateKeyToDate,
} from './localDateKey';

export const WORK_STUDY_WEEKDAY_LABELS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

export type WorkStudyWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WorkStudyDdayEvent = {
  id: string;
  title: string;
  dateKey: string;
};

export type WorkStudyTimetableSlot = {
  id: string;
  weekday: WorkStudyWeekday;
  startHhmm: string;
  endHhmm: string;
  subject: string;
  place: string;
};

export function weekdayFromDate(d: Date): WorkStudyWeekday {
  return ((d.getDay() + 6) % 7) as WorkStudyWeekday;
}

export function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

export function addMonths(monthStart: Date, deltaMonths: number): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + deltaMonths, 1, 12, 0, 0, 0);
}

/** 월요일 시작 6주 그리드 */
export function buildMonthCalendarGrid(monthStart: Date): Date[] {
  const firstWeekdayMondayZero = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekdayMondayZero);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/** anchor 날짜가 포함된 주(월~일) 7일 */
export function buildWeekCalendarRow(anchor: Date): Date[] {
  const mondayOffset = (anchor.getDay() + 6) % 7;
  const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - mondayOffset, 12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function formatMonthTitleKo(monthStart: Date): string {
  return `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`;
}

export function formatDateKeyDisplayKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${mo}월 ${d}일`;
}

export function normalizeStudyDateKey(raw: unknown, fallback = getLocalDateKey()): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

export function normalizeStudyWeekday(raw: unknown): WorkStudyWeekday {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0 && n <= 6) return n as WorkStudyWeekday;
  return 0;
}

function clampStudyTitle(raw: unknown, max: number): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeHhmm(raw: unknown, fallback: string): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return fallback;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function normalizeWorkStudyDdayEvents(raw: unknown): WorkStudyDdayEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkStudyDdayEvent[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = clampStudyTitle(o.title, 80);
    if (!title) continue;
    out.push({
      id: typeof o.id === 'string' ? o.id : `dd-${Math.random().toString(36).slice(2, 8)}`,
      title,
      dateKey: normalizeStudyDateKey(o.dateKey),
    });
    if (out.length >= 24) break;
  }
  return sortDdayEvents(out);
}

export function normalizeWorkStudyTimetableSlots(raw: unknown): WorkStudyTimetableSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkStudyTimetableSlot[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const subject = clampStudyTitle(o.subject, 80);
    if (!subject) continue;
    const startHhmm = normalizeHhmm(o.startHhmm, '09:00');
    let endHhmm = normalizeHhmm(o.endHhmm, '10:00');
    if (endHhmm <= startHhmm) endHhmm = normalizeHhmm('10:00', '10:00');
    out.push({
      id: typeof o.id === 'string' ? o.id : `tt-${Math.random().toString(36).slice(2, 8)}`,
      weekday: normalizeStudyWeekday(o.weekday),
      startHhmm,
      endHhmm,
      subject,
      place: clampStudyTitle(o.place, 60),
    });
    if (out.length >= 42) break;
  }
  return sortTimetableSlots(out);
}

export function daysBetweenLocalDateKeys(fromKey: string, toKey: string): number {
  const a = parseLocalDateKeyToDate(fromKey);
  const b = parseLocalDateKeyToDate(toKey);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

/** 오늘 기준 D-Day 라벨 — 미래 D-N, 당일 D-Day, 지난 D+N */
export function formatStudyDdayLabel(targetDateKey: string, todayKey = getLocalDateKey()): string {
  const diff = daysBetweenLocalDateKeys(todayKey, targetDateKey);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function sortDdayEvents(events: WorkStudyDdayEvent[], todayKey = getLocalDateKey()): WorkStudyDdayEvent[] {
  return [...events].sort((a, b) => {
    const da = daysBetweenLocalDateKeys(todayKey, a.dateKey);
    const db = daysBetweenLocalDateKeys(todayKey, b.dateKey);
    if (da !== db) return da - db;
    return a.dateKey.localeCompare(b.dateKey);
  });
}

export function sortTimetableSlots(slots: WorkStudyTimetableSlot[]): WorkStudyTimetableSlot[] {
  return [...slots].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.startHhmm.localeCompare(b.startHhmm);
  });
}

export function nearestUpcomingDdayEvent(
  events: WorkStudyDdayEvent[],
  todayKey = getLocalDateKey(),
): WorkStudyDdayEvent | null {
  const sorted = sortDdayEvents(events, todayKey);
  return sorted.find((e) => daysBetweenLocalDateKeys(todayKey, e.dateKey) >= 0) ?? sorted[0] ?? null;
}

export function dateKeyFromDate(d: Date): string {
  return localDateToDateKey(d);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTimetableSlotLine(slot: WorkStudyTimetableSlot): string {
  const day = WORK_STUDY_WEEKDAY_LABELS_KO[slot.weekday];
  const place = slot.place.trim();
  return place.length > 0
    ? `${day} ${slot.startHhmm}–${slot.endHhmm} ${slot.subject} (${place})`
    : `${day} ${slot.startHhmm}–${slot.endHhmm} ${slot.subject}`;
}
