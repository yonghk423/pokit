import type { DayPlanBlock } from '@entities/day-plan/model/types';

import { parseHHmmToMinutes } from './parseTime';

/** 로컬 기준 오늘 자정부터의 “현재” 분 (0 ~ 1439, 초는 버림) */
export function getLocalMinutesOfDayNow(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** 겹침·길이 계산용 — 익일 종료 블록은 당일 자정 이후 분까지 합산 */
export function effectiveEndMinutesExclusive(block: DayPlanBlock): number {
  if (block.endsNextCalendarDay) {
    return 24 * 60 + block.endMinutes;
  }
  return block.endMinutes;
}

export function blockDurationSec(block: DayPlanBlock): number {
  if (block.endsNextCalendarDay) {
    return Math.max(0, (24 * 60 - block.startMinutes + block.endMinutes) * 60);
  }
  return Math.max(0, (block.endMinutes - block.startMinutes) * 60);
}

export function formatMinuteOfDayKo(minutes: number): string {
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

/**
 * 저장용 `HH:mm` → 화면용 한글 시각 (`formatMinuteOfDayKo`와 동일 규칙).
 * 저장값 `24:00`(당일 끝)은 `AM 00:00`으로 표시하며, 실제 종료 날짜는 호출 UI에서 함께 표시.
 */
export function formatHhmmClockKo(hhmm: string): string {
  const t = hhmm.trim();
  if (t === '24:00') return 'AM 00:00';
  const m = parseHHmmToMinutes(t);
  if (m === null) return hhmm;
  return formatMinuteOfDayKo(m);
}

export function formatBlockTimeRange(block: DayPlanBlock): string {
  return formatSpineScheduleRangeLabel({
    startMinutes: block.startMinutes,
    endMinutes: block.endMinutes,
    endsNextCalendarDay: block.endsNextCalendarDay === true,
    separator: ' — ',
  });
}

/**
 * 스파인·담기 행 시간 한 줄.
 * - 같은 날: `PM 7:00 – AM 10:00`
 * - 익일 종료 + endDayCaption: `PM 7:00 – 9.4 AM 10:00` / `PM 7:00 – 다음날 AM 10:00`
 */
export function formatSpineScheduleRangeLabel(input: {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
  /** 익일 종료일 캡션 (날짜 또는 「다음날」 등). 없으면 AM/PM만 붙임 */
  endDayCaption?: string | null;
  separator?: string;
}): string {
  const sep = input.separator ?? ' – ';
  const start = formatMinuteOfDayKo(input.startMinutes);
  const end = formatMinuteOfDayKo(input.endMinutes);
  if (input.endsNextCalendarDay) {
    const caption = input.endDayCaption?.trim();
    if (caption) return `${start}${sep}${caption} ${end}`;
  }
  return `${start}${sep}${end}`;
}

export function sortDayPlanBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

/**
 * 분 단위 구간 겹침 (서로 다른 블록이 같은 “슬롯”을 쓰는지).
 * 경계만 맞닿는 경우(한쪽 end === 다른 쪽 start)는 겹침이 아님.
 */
export function dayPlanTimeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/** 추가·수정하려는 구간과 겹치는 기존 블록이 있으면 반환 */
export function findOverlappingDayPlanBlock(
  blocks: DayPlanBlock[],
  startMinutes: number,
  endMinutes: number,
  excludeBlockId?: string,
  endsNextCalendarDay?: boolean,
): DayPlanBlock | null {
  const endEff = endsNextCalendarDay ? 24 * 60 + endMinutes : endMinutes;
  const found = blocks.find(
    (b) =>
      b.id !== excludeBlockId &&
      dayPlanTimeRangesOverlap(startMinutes, endEff, b.startMinutes, effectiveEndMinutesExclusive(b)),
  );
  return found ?? null;
}

/** 구간과 시간이 겹치는 모든 기존 블록 (교체 저장 시 일괄 제거용) */
export function findOverlappingDayPlanBlocks(
  blocks: DayPlanBlock[],
  startMinutes: number,
  endMinutes: number,
  excludeBlockId?: string,
  endsNextCalendarDay?: boolean,
): DayPlanBlock[] {
  const endEff = endsNextCalendarDay ? 24 * 60 + endMinutes : endMinutes;
  return blocks.filter(
    (b) =>
      b.id !== excludeBlockId &&
      dayPlanTimeRangesOverlap(startMinutes, endEff, b.startMinutes, effectiveEndMinutesExclusive(b)),
  );
}

/** 표시용: 일정 블록들의 총 분 길이 */
export function totalPlannedMinutes(blocks: DayPlanBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, blockDurationSec(b) / 60), 0);
}

/** 완료·건너뛰기에 포함되지 않은 블록 중 order 기준 첫 항목 */
export function getFirstPendingBlock(
  blocks: DayPlanBlock[],
  completedBlockIds: string[],
  skippedBlockIds: string[],
): DayPlanBlock | null {
  const done = new Set([...completedBlockIds, ...skippedBlockIds]);
  const sorted = sortDayPlanBlocks(blocks);
  return sorted.find((b) => !done.has(b.id)) ?? null;
}

/** 특정 id 다음에 오는 미처리 블록 (없으면 null) */
export function getNextPendingAfter(
  blocks: DayPlanBlock[],
  currentId: string,
  completedBlockIds: string[],
  skippedBlockIds: string[],
): DayPlanBlock | null {
  const done = new Set([...completedBlockIds, ...skippedBlockIds]);
  const sorted = sortDayPlanBlocks(blocks);
  const idx = sorted.findIndex((b) => b.id === currentId);
  if (idx === -1) return getFirstPendingBlock(blocks, completedBlockIds, skippedBlockIds);

  for (let i = idx + 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b && !done.has(b.id)) return b;
  }
  return null;
}
