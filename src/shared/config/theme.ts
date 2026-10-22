/**
 * Theme colors and fonts — City Pop Minimalist / Flat Brutalism Lite.
 */

import { CityPopTypography, RetroFlatColors, cityPopFont } from './retroFlat';

/** 앱 기본 강조색 (Primary) — 민트 그린 */
export const PrimaryColor = {
  rgb: 'rgb(53, 102, 104)',
  rgba: (alpha: number) => `rgba(53, 102, 104, ${alpha})`,
} as const;

export const PokitIconPalette = {
  teal: '#356668',
  tealMuted: 'rgba(53, 102, 104, 0.55)',
  sage: '#A8DADC',
  sageMuted: 'rgba(168, 218, 220, 0.55)',
  cream: '#F5F2EB',
  creamSurface: '#FBF8FF',
} as const;

const tintColorLight = RetroFlatColors.light.primary;
const tintColorDark = RetroFlatColors.dark.primary;

export const Colors = {
  primary: RetroFlatColors.light.primary,
  primarySolid: RetroFlatColors.light.primary,
  light: {
    text: RetroFlatColors.light.text,
    background: RetroFlatColors.light.bg,
    tint: tintColorLight,
    icon: RetroFlatColors.light.icon,
    tabIconDefault: RetroFlatColors.light.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: RetroFlatColors.dark.text,
    background: RetroFlatColors.dark.bg,
    tint: tintColorDark,
    icon: RetroFlatColors.dark.icon,
    tabIconDefault: RetroFlatColors.dark.textMuted,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = {
  sans: 'HiMelody_400Regular',
  sansMedium: 'HiMelody_400Regular',
  sansSemiBold: 'HiMelody_400Regular',
  sansBold: 'HiMelody_400Regular',
  sansExtraBold: 'HiMelody_400Regular',
  serif: 'ui-serif',
  rounded: 'ui-rounded',
  mono: 'ui-monospace',
} as const;

export { CityPopTypography, cityPopFont };
