import type { TextStyle } from 'react-native';

import type { AppFontId, AppFontWeight } from './appFontIds';

const HANKEN: Record<AppFontWeight, string> = {
  '400': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold',
  '800': 'HankenGrotesk_800ExtraBold',
};

const SEBANG_GOTHIC_2: Record<AppFontWeight, string> = {
  '400': 'SebangGothic2_Regular',
  '500': 'SebangGothic2_Regular',
  '600': 'SebangGothic2_Bold',
  '700': 'SebangGothic2_Bold',
  '800': 'SebangGothic2_Bold',
};

const HI_MELODY = 'HiMelody_400Regular';

/** 선택 폰트 + weight → fontFamily */
export function resolveAppFontFamily(
  fontId: AppFontId,
  weight: AppFontWeight = '400',
): string | undefined {
  if (fontId === 'sebangGothic2') return SEBANG_GOTHIC_2[weight];
  if (fontId === 'hiMelody') return HI_MELODY;
  return HANKEN[weight];
}

export function appFontStyle(
  fontId: AppFontId,
  weight: AppFontWeight = '400',
): TextStyle {
  const fontFamily = resolveAppFontFamily(fontId, weight);
  return fontFamily ? { fontFamily } : {};
}
