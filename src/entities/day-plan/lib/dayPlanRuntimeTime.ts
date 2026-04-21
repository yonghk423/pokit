import type { DayPlanBlock } from '@entities/day-plan/model/types';

import { addDaysToLocalDateKey } from './localDateKey';

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

/** 블록 종료 시각(익일 종료 포함)의 epoch ms */
export function blockEndWallTimeMs(
  dateKey: string,
  block: Pick<DayPlanBlock, 'endMinutes' | 'endsNextCalendarDay'>,
): number | null {
  if (block.endsNextCalendarDay) {
    const nextKey = addDaysToLocalDateKey(dateKey, 1);
    return minuteOffsetToDateMs(nextKey, block.endMinutes);
  }
  return minuteOffsetToDateMs(dateKey, block.endMinutes);
}

/** 해당 날짜의 블록 기준으로 종료 시각이 이미 지났는지 (종료 시각 ≤ 지금) */
export function isBlockEndInPastForDateKey(
  dateKey: string,
  block: Pick<DayPlanBlock, 'endMinutes' | 'endsNextCalendarDay'>,
  nowMs: number = Date.now(),
): boolean {
  const endMs = blockEndWallTimeMs(dateKey, block);
  if (endMs == null) return true;
  return endMs <= nowMs;
}

export function resolveCategoryKeyFromLabel(label: string): string | null {
  const t = label.trim();
  if (t === '러닝') return 'other';
  if (t === '업무' || t === '작업') return 'work';
  if (t === '독서') return 'reading';
  if (t === '공부' || t === '공부·학습') return 'study';
  if (t === '스트레칭하기' || t === '스트레칭') return 'stretching';
  if (t === '허리펴기') return 'straightenBack';
  if (t === '거북목 바르게하기') return 'neckPosture';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '하루·주간 정리' || t === '하루 정리' || t === '주간 정리') return 'planning';
  if (t === '글쓰기') return 'writing';
  if (t === '일기') return 'journal';
  if (t === '언어 학습') return 'language';
  if (t === '회고·점검' || t === '회고') return 'other';
  if (t === '창작·아이디어' || t === '창작') return 'creative';
  if (t === '메일·소통 정리' || t === '메일 정리') return 'inbox';
  if (t === '휴식' || t === '사용자' || t === '맞춤 플로우' || t === '플로우') return 'other';
  if (t === '단식' || t === '체중관리') return 'fasting';
  if (t === '수분' || t === '수분섭취') return 'water';
  if (t === '약 복용') return 'medicine';
  if (t === '피트티스') return 'other';
  return null;
}

export type DayPlanRuntimeTiming = {
  startAtMs: number;
  endAtMs: number;
  categoryKey: string | null;
};

export function toRuntimeTiming(dateKey: string, block: DayPlanBlock): DayPlanRuntimeTiming | null {
  const startAtMs = minuteOffsetToDateMs(dateKey, block.startMinutes);
  const endAtMs = blockEndWallTimeMs(dateKey, block);
  if (startAtMs == null || endAtMs == null) return null;
  if (endAtMs <= startAtMs) return null;
  return {
    startAtMs,
    endAtMs,
    categoryKey: resolveCategoryKeyFromLabel(block.category),
  };
}
