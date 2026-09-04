import type { AppFontId } from '@shared/lib/storage';

export type { AppFontId };
export type AppFontWeight = '400' | '500' | '600' | '700' | '800';

/** 시티팝 기본 — 동글 (ko/en/ja 공통) */
export const DEFAULT_APP_FONT_ID: AppFontId = 'dongle';

/** 설정에 노출하는 선택지 */
export const APP_FONT_IDS: readonly AppFontId[] = [
  'dongle',
  'gaegu',
  'songMyung',
  'gothicA1',
  'hiMelody',
  'hanken',
] as const;

export function isAppFontId(value: unknown): value is AppFontId {
  return (
    value === 'dongle' ||
    value === 'gaegu' ||
    value === 'songMyung' ||
    value === 'gothicA1' ||
    value === 'hiMelody' ||
    value === 'hanken'
  );
}

/** Regular 페이스만 있는 폰트 (가짜 bold 합성 방지) */
export function isSingleFaceAppFont(fontId: AppFontId): boolean {
  return fontId === 'songMyung' || fontId === 'hiMelody';
}
