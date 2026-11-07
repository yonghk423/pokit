import type { AppFontId } from './appFontIds';

/**
 * 콘콘체 0.95를 기준으로 실제 한글 윤곽 높이를 맞춘다.
 * 번들 폰트의 BoundsPen으로 '오늘의주인공나의하루동글또박손글씨'를 측정한
 * 중앙값 / unitsPerEm: 콘콘 0.8159, 멜로디 0.7100, 빛나는별 0.7070, 숑숑 0.7190.
 * 보정 = 0.95 × 콘콘 높이 / 해당 글꼴 높이. 미리보기와 본문에 함께 적용한다.
 */
export const APP_FONT_OPTICAL_SCALE: Record<AppFontId, number> = {
  hiMelody: 1.09,
  /** 동글동글 또박또박 손글씨 */
  corncorn: 0.95,
  /** 가는 기울임 손글씨 */
  cafe24ShiningStar: 1.10,
  cafe24Syongsyong: 1.08,
};

export function resolveAppFontOpticalScale(fontId: AppFontId): number {
  return APP_FONT_OPTICAL_SCALE[fontId] ?? 1;
}

/** 글씨체별 최소 lineHeight / fontSize — 이보다 좁으면 iOS가 글자 위아래를 잘라낸다. */
const APP_FONT_MIN_LINE_HEIGHT_RATIO: Partial<Record<AppFontId, number>> = {
  corncorn: 1.2,
};

export function resolveAppFontMinLineHeight(fontId: AppFontId, fontSize: number): number {
  const ratio = APP_FONT_MIN_LINE_HEIGHT_RATIO[fontId];
  return ratio ? Math.ceil(fontSize * ratio) : 0;
}
