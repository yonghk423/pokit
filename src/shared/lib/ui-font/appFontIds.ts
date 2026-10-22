import type { AppFontId } from '@shared/lib/storage';

export type { AppFontId };
export type AppFontWeight = '400' | '500' | '600' | '700' | '800';

/** 앱 기본 글씨체 — 그리운 김정원 (붓펜 손글씨) */
export const DEFAULT_APP_FONT_ID: AppFontId = 'kimJungWon';

/** 설정에 노출하는 선택지 */
export const APP_FONT_IDS: readonly AppFontId[] = [
  'kimJungWon',
  'corncorn',
  'hiMelody',
] as const;

export function isAppFontId(value: unknown): value is AppFontId {
  return value === 'hiMelody' || value === 'kimJungWon' || value === 'corncorn';
}

/** Regular 페이스만 있는 폰트 (가짜 bold 합성 방지) */
export function isSingleFaceAppFont(fontId: AppFontId): boolean {
  return fontId === 'hiMelody' || fontId === 'kimJungWon' || fontId === 'corncorn';
}
