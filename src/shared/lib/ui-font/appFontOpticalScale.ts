import type { AppFontId } from './appFontIds';

/**
 * 글씨체별 광학 크기 — Hi Melody(「포킷 · 오늘도 반짝」) 체감 크기를 1.
 * 같은 fontSize여도 페이스 메트릭이 달라 보이는 차이를 보정한다.
 */
export const APP_FONT_OPTICAL_SCALE: Record<AppFontId, number> = {
  hiMelody: 1,
  /** 붓펜 손글씨 — Hi Melody와 비슷한 체감으로 맞춤 */
  kimJungWon: 0.92,
  /** 동글동글 또박또박 손글씨 */
  corncorn: 0.95,
};

export function resolveAppFontOpticalScale(fontId: AppFontId): number {
  return APP_FONT_OPTICAL_SCALE[fontId] ?? 1;
}

/** 글씨체별 최소 lineHeight / fontSize — 이보다 좁으면 iOS가 글자 위아래를 잘라낸다. */
const APP_FONT_MIN_LINE_HEIGHT_RATIO: Partial<Record<AppFontId, number>> = {
  kimJungWon: 1.22,
  corncorn: 1.2,
};

export function resolveAppFontMinLineHeight(fontId: AppFontId, fontSize: number): number {
  const ratio = APP_FONT_MIN_LINE_HEIGHT_RATIO[fontId];
  return ratio ? Math.ceil(fontSize * ratio) : 0;
}
