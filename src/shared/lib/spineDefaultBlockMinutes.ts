/** 타임라인 갭·루틴 추가 시 기본 블록 길이(분) */
export const DEFAULT_SPINE_GAP_BLOCK_MINUTES = 60;

export const SPINE_GAP_BLOCK_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export type SpineGapBlockMinuteOption = (typeof SPINE_GAP_BLOCK_MINUTE_OPTIONS)[number];

export function normalizeSpineDefaultBlockMinutes(
  value: unknown,
  fallback = DEFAULT_SPINE_GAP_BLOCK_MINUTES,
): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return (SPINE_GAP_BLOCK_MINUTE_OPTIONS as readonly number[]).includes(n)
    ? n
    : fallback;
}
