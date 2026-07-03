import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/**
 * City Pop Minimalist — Flat Brutalism Lite design tokens.
 * 2px 검정 테두리, 0 radius, 파스텔 단색, 그림자·그라데이션 없음.
 */
export const RetroFlatColors = {
  light: {
    bg: '#F5F2EB',
    bgMint: '#A8DADC',
    surface: '#FBF8FF',
    surfaceAlt: '#F4F2FF',
    surfacePink: '#E8E2D8',
    surfaceContainer: '#EDECFF',
    primary: '#356668',
    primaryOn: '#FFFFFF',
    primaryContainer: '#A8DADC',
    tertiary: '#436086',
    tertiaryOn: '#FFFFFF',
    accent: '#C9A8A8',
    accentMuted: '#E0E0FC',
    text: '#181A2E',
    textMuted: '#404848',
    icon: '#436086',
    border: '#000000',
    borderMuted: '#707979',
    danger: '#BA1A1A',
    dangerBg: '#FFDAD6',
    solidShadow: '#356668',
  },
  dark: {
    bg: '#2D2F44',
    bgMint: '#306163',
    surface: '#2D2F44',
    surfaceAlt: '#3A3C52',
    surfacePink: '#4A463F',
    surfaceContainer: '#3A3C52',
    primary: '#9ECFD1',
    primaryOn: '#002021',
    primaryContainer: '#1A4E50',
    tertiary: '#ABC8F4',
    tertiaryOn: '#001C39',
    accent: '#C9A8A8',
    accentMuted: '#4A5560',
    text: '#F1EFFF',
    textMuted: '#C0C8C8',
    icon: '#9ECFD1',
    border: '#F1EFFF',
    borderMuted: '#707979',
    danger: '#FFB4AB',
    dangerBg: '#93000A',
    solidShadow: '#9ECFD1',
  },
} as const;

export const CityPopSpacing = {
  xs: 4,
  sm: 12,
  base: 8,
  md: 24,
  lg: 48,
  xl: 80,
  gutter: 16,
  marginMobile: 20,
} as const;

export const CityPopTypography = {
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.28,
  },
  headlineLgMobile: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 29,
    letterSpacing: -0.24,
  },
  bodyLg: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 29,
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  labelMd: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
  },
} as const;

export const RETRO_BORDER_WIDTH = 2;
export const RETRO_BORDER_COLOR = '#000000';
export const RETRO_RADIUS = 0;
export const SOLID_SHADOW_OFFSET = 4;

export const retroBorder: ViewStyle = {
  borderWidth: RETRO_BORDER_WIDTH,
  borderColor: RETRO_BORDER_COLOR,
};

export function retroBorderFor(isDark: boolean): ViewStyle {
  return {
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: isDark ? RetroFlatColors.dark.border : RetroFlatColors.light.border,
  };
}

/** 그림자·elevation 전부 제거 */
export const flatNoShadow: ViewStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

/** Brutalist solid shadow — 블러 없이 4px 오프셋 단색 블록 */
export function solidShadowBlock(color: string): ViewStyle {
  return {
    ...flatNoShadow,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: RETRO_BORDER_COLOR,
    transform: [{ translateX: SOLID_SHADOW_OFFSET }, { translateY: SOLID_SHADOW_OFFSET }],
    backgroundColor: color,
  };
}

export const retroFlatStyles = StyleSheet.create({
  card: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.surfaceAlt,
    ...flatNoShadow,
    overflow: 'hidden',
    padding: CityPopSpacing.md,
    gap: CityPopSpacing.sm,
  },
  cardAlt: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.bgMint,
    ...flatNoShadow,
    overflow: 'hidden',
    padding: CityPopSpacing.md,
  },
  buttonPrimary: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.primary,
    ...flatNoShadow,
    paddingHorizontal: CityPopSpacing.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPrimaryText: {
    color: RetroFlatColors.light.primaryOn,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  buttonSecondary: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.surface,
    ...flatNoShadow,
    paddingHorizontal: CityPopSpacing.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  input: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.surface,
    ...flatNoShadow,
    paddingHorizontal: CityPopSpacing.gutter,
    paddingVertical: 14,
    minHeight: 52,
  },
  section: {
    ...retroBorder,
    borderRadius: RETRO_RADIUS,
    backgroundColor: RetroFlatColors.light.surfaceAlt,
    ...flatNoShadow,
    overflow: 'hidden',
    gap: 0,
  },
  listRow: {
    borderBottomWidth: RETRO_BORDER_WIDTH,
    borderBottomColor: RETRO_BORDER_COLOR,
    paddingHorizontal: CityPopSpacing.gutter,
    paddingVertical: CityPopSpacing.sm,
    minHeight: 56,
  },
});

export function cityPopFont(weight: '400' | '500' | '600' | '700' | '800' = '400'): TextStyle {
  const map = {
    '400': 'HankenGrotesk_400Regular',
    '500': 'HankenGrotesk_500Medium',
    '600': 'HankenGrotesk_600SemiBold',
    '700': 'HankenGrotesk_700Bold',
    '800': 'HankenGrotesk_800ExtraBold',
  } as const;
  return { fontFamily: map[weight] };
}
