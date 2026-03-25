import type { DayPlanBlock } from '@entities/day-plan/model/types';

/** 로컬 기준 오늘 자정부터의 “현재” 분 (0 ~ 1439, 초는 버림) */
export function getLocalMinutesOfDayNow(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function blockDurationSec(block: DayPlanBlock): number {
  return Math.max(0, (block.endMinutes - block.startMinutes) * 60);
}

export function formatMinuteOfDayKo(minutes: number): string {
  if (minutes >= 24 * 60) {
    return '24:00';
  }
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const isAm = h24 < 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const prefix = isAm ? '오전' : '오후';
  return `${prefix} ${h12}:${String(min).padStart(2, '0')}`;
}

export function formatBlockTimeRange(block: DayPlanBlock): string {
  return `${formatMinuteOfDayKo(block.startMinutes)} — ${formatMinuteOfDayKo(block.endMinutes)}`;
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
): DayPlanBlock | null {
  const found = blocks.find(
    (b) =>
      b.id !== excludeBlockId &&
      dayPlanTimeRangesOverlap(startMinutes, endMinutes, b.startMinutes, b.endMinutes),
  );
  return found ?? null;
}

/** 표시용: 일정 블록들의 총 분 길이 */
export function totalPlannedMinutes(blocks: DayPlanBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, b.endMinutes - b.startMinutes), 0);
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
