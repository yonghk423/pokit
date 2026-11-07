import type { TextStyle } from 'react-native';

import type { AppFontId, AppFontWeight } from './appFontIds';

const HI_MELODY = 'HiMelody_400Regular';
/** useFonts 키와 동일 — 온글잎 콘콘체 Regular */
const CORNCORN = 'OwnglyphCorncorn_400Regular';
/** Cafe24 Shiningstar PostScript family name */
const CAFE24_SHINING_STAR = 'Cafe24Shiningstar';
const CAFE24_SYONGSYONG = 'Cafe24Syongsyong';

/** 선택 폰트 + weight → fontFamily */
export function resolveAppFontFamily(
  fontId: AppFontId,
  _weight: AppFontWeight = '400',
): string | undefined {
  if (fontId === 'corncorn') return CORNCORN;
  if (fontId === 'cafe24ShiningStar') return CAFE24_SHINING_STAR;
  if (fontId === 'cafe24Syongsyong') return CAFE24_SYONGSYONG;
  return HI_MELODY;
}

export function appFontStyle(
  fontId: AppFontId,
  weight: AppFontWeight = '400',
): TextStyle {
  const fontFamily = resolveAppFontFamily(fontId, weight);
  return fontFamily ? { fontFamily } : {};
}
