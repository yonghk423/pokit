/**
 * Theme colors and fonts for light/dark mode (iOS).
 * 브랜드 primary: rgb(249, 115, 22) — 앱 기본 강조색.
 */

/** 앱 기본 강조색 (Primary) — rgb(249, 115, 22) */
export const PrimaryColor = {
  rgb: 'rgb(249, 115, 22)',
  rgba: (alpha: number) => `rgba(249, 115, 22, ${alpha})`,
} as const;

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  /** 라이트/다크 공통 primary (탭, CTA, 강조 요소) */
  primary: 'rgba(249, 115, 22, 0.95)',
  primarySolid: 'rgb(249, 115, 22)',
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/** iOS system font design tokens */
export const Fonts = {
  sans: 'system-ui',
  serif: 'ui-serif',
  rounded: 'ui-rounded',
  mono: 'ui-monospace',
} as const;
