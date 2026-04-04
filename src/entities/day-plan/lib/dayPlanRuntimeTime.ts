import type { DayPlanBlock } from '@entities/day-plan/model/types';

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

export function minuteOffsetToDateMs(dateKey: string, minuteOffset: number): number | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const base = new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  return base.getTime() + minuteOffset * 60 * 1000;
}

export function resolveCategoryKeyFromLabel(label: string): string | null {
  const t = label.trim();
  if (t === '러닝') return 'run';
  if (t === '업무') return 'work';
  if (t === '독서') return 'reading';
  if (t === '공부') return 'study';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '휴식') return 'rest';
  if (t === '단식') return 'fasting';
  if (t === '수분') return 'water';
  if (t === '약 복용') return 'medicine';
  if (t === '스트레칭' || t === '피트티스') return 'stretch';
  return null;
}

export type DayPlanRuntimeTiming = {
  startAtMs: number;
  endAtMs: number;
  categoryKey: string | null;
};

export function toRuntimeTiming(dateKey: string, block: DayPlanBlock): DayPlanRuntimeTiming | null {
  const startAtMs = minuteOffsetToDateMs(dateKey, block.startMinutes);
  const endAtMs = minuteOffsetToDateMs(dateKey, block.endMinutes);
  if (startAtMs == null || endAtMs == null) return null;
  if (endAtMs <= startAtMs) return null;
  return {
    startAtMs,
    endAtMs,
    categoryKey: resolveCategoryKeyFromLabel(block.category),
  };
}
