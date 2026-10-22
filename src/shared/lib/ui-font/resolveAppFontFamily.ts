import type { TextStyle } from 'react-native';

import type { AppFontId, AppFontWeight } from './appFontIds';

const HI_MELODY = 'HiMelody_400Regular';
/** useFonts 키와 동일 — 그리운 김정원 Regular */
const KIM_JUNG_WON = 'GriunKimjungwon_400Regular';
/** useFonts 키와 동일 — 온글잎 콘콘체 Regular */
const CORNCORN = 'OwnglyphCorncorn_400Regular';

/** 선택 폰트 + weight → fontFamily */
export function resolveAppFontFamily(
  fontId: AppFontId,
  _weight: AppFontWeight = '400',
): string | undefined {
  if (fontId === 'kimJungWon') return KIM_JUNG_WON;
  if (fontId === 'corncorn') return CORNCORN;
  return HI_MELODY;
}

export function appFontStyle(
  fontId: AppFontId,
  weight: AppFontWeight = '400',
): TextStyle {
  const fontFamily = resolveAppFontFamily(fontId, weight);
  return fontFamily ? { fontFamily } : {};
}
