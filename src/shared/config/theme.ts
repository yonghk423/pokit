/**
 * Theme colors and fonts for light/dark mode (iOS).
 * 브랜드 primary: 모노크롬 기준 검정(#000) — UI 레퍼런스와 동일 톤.
 */

/** 앱 기본 강조색 (Primary) — 순수 검정 */
export const PrimaryColor = {
  rgb: 'rgb(0, 0, 0)',
  rgba: (alpha: number) => `rgba(0, 0, 0, ${alpha})`,
} as const;

/**
 * 앱 아이콘(노트·연필) 톤 — 히스토리 UI 강조(링·차트·태그 등)용.
 * 카테고리 아이콘 색은 `activeIconColorByCategory`를 그대로 씁니다.
 */
export const PokitIconPalette = {
  teal: '#4A6670',
  tealMuted: 'rgba(74, 102, 112, 0.55)',
  sage: '#9DB09D',
  sageMuted: 'rgba(157, 176, 157, 0.45)',
  cream: '#F2EDE4',
  creamSurface: 'rgba(242, 237, 228, 0.72)',
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
