import type { AppFontId } from './appFontIds';

/**
 * 글씨체별 광학 크기 — Hi Melody(「포킷 · 오늘도 반짝」) 체감 크기를 1.
 * 같은 fontSize여도 페이스 메트릭이 달라 보이는 차이를 보정한다.
 */
export const APP_FONT_OPTICAL_SCALE: Record<AppFontId, number> = {
  hiMelody: 1,
  /** Hi Melody의 체감 크기에 맞춰 표시 크기를 보정 */
  hanken: 0.8,
  sebangGothic2: 0.84,
};

export function resolveAppFontOpticalScale(fontId: AppFontId): number {
  return APP_FONT_OPTICAL_SCALE[fontId] ?? 1;
}
