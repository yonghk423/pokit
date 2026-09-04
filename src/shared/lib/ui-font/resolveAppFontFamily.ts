import type { TextStyle } from 'react-native';

import type { AppFontId, AppFontWeight } from './appFontIds';

const HANKEN: Record<AppFontWeight, string> = {
  '400': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold',
  '800': 'HankenGrotesk_800ExtraBold',
};

const DONGLE: Record<AppFontWeight, string> = {
  '400': 'Dongle_400Regular',
  '500': 'Dongle_400Regular',
  '600': 'Dongle_700Bold',
  '700': 'Dongle_700Bold',
  '800': 'Dongle_700Bold',
};

const GAEGU: Record<AppFontWeight, string> = {
  '400': 'Gaegu_400Regular',
  '500': 'Gaegu_400Regular',
  '600': 'Gaegu_700Bold',
  '700': 'Gaegu_700Bold',
  '800': 'Gaegu_700Bold',
};

const GOTHIC_A1: Record<AppFontWeight, string> = {
  '400': 'GothicA1_400Regular',
  '500': 'GothicA1_500Medium',
  '600': 'GothicA1_600SemiBold',
  '700': 'GothicA1_700Bold',
  '800': 'GothicA1_800ExtraBold',
};

const SONG_MYUNG = 'SongMyung_400Regular';
const HI_MELODY = 'HiMelody_400Regular';

/** 선택 폰트 + weight → fontFamily */
export function resolveAppFontFamily(
  fontId: AppFontId,
  weight: AppFontWeight = '400',
): string | undefined {
  if (fontId === 'dongle') return DONGLE[weight];
  if (fontId === 'gaegu') return GAEGU[weight];
  if (fontId === 'songMyung') return SONG_MYUNG;
  if (fontId === 'gothicA1') return GOTHIC_A1[weight];
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
