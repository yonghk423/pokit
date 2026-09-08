import type { AppFontId } from './appFontIds';

/**
 * 글씨체별 광학 크기 — Hi Melody(「포킷 · 오늘도 반짝」) 체감 크기를 1.
 * 같은 fontSize여도 페이스 메트릭이 달라 보이는 차이를 보정한다.
 */
export const APP_FONT_OPTICAL_SCALE: Record<AppFontId, number> = {
  hiMelody: 1,
  /** 산세리프 · 시티팝 — 동일 pt에서 크게 보임 */
  hanken: 0.88,
  gothicA1: 0.9,
  /** 동글 · 개구 — 동일 pt에서 작아 보여 키움 */
  dongle: 1.32,
  gaegu: 1.24,
  /** 명조 */
  songMyung: 0.9,
};

export function resolveAppFontOpticalScale(fontId: AppFontId): number {
  return APP_FONT_OPTICAL_SCALE[fontId] ?? 1;
}
