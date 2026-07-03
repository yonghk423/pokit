import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';

/** 스파인 타임라인 갭 블록 코칭 문구 */
export function formatSpineGapCoaching(durationMin: number, hasUpcomingBlock: boolean): string {
  const duration = formatDurationMinKo(durationMin);
  if (durationMin < 120) {
    return hasUpcomingBlock
      ? `${duration} 활용하기, 할일이 다가와요.`
      : `${duration} 집중할 시간이 있어요.`;
  }
  return `${duration} 동안 여유롭게 보내보아요!`;
}
