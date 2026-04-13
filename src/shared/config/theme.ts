/**
 * Theme colors and fonts for light/dark mode (iOS).
 * 브랜드 primary: 모노크롬 기준 검정(#000) — UI 레퍼런스와 동일 톤.
 */

/** 앱 기본 강조색 (Primary) — 순수 검정 */
export const PrimaryColor = {
  rgb: 'rgb(0, 0, 0)',
  rgba: (alpha: number) => `rgba(0, 0, 0, ${alpha})`,
} as const;

const tintColorLight = '#000000';
const tintColorDark = '#fff';

export const Colors = {
  /** 라이트/다크 공통 primary (탭, CTA, 강조 요소) */
  primary: 'rgba(0, 0, 0, 0.95)',
  primarySolid: 'rgb(0, 0, 0)',
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
