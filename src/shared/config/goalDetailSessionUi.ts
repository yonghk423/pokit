/**
 * 앱 내 실행(세션) 화면 토큰 — 라이트 / 다크.
 */
export type GoalDetailSessionUiTokens = {
  screenBg: string;
  cardBg: string;
  onSurface: string;
  muted: string;
  border: string;
  outline: string;
  primary: string;
  primaryOnAccent: string;
  readingAccent: string;
  readingMetricBorder: string;
  waterCtaOnAccent: string;
};

const LIGHT: GoalDetailSessionUiTokens = {
  screenBg: '#ffffff',
  cardBg: '#ffffff',
  onSurface: '#18181b',
  muted: '#52525b',
  border: 'rgba(0, 0, 0, 0.08)',
  outline: '#a1a1aa',
  primary: 'rgb(0, 0, 0)',
  primaryOnAccent: '#ffffff',
  readingAccent: 'rgb(16, 185, 129)',
  readingMetricBorder: '#d1d5db',
  waterCtaOnAccent: '#0f172a',
};

const DARK: GoalDetailSessionUiTokens = {
  screenBg: '#09090b',
  cardBg: '#18181b',
  onSurface: '#fafafa',
  muted: '#a1a1aa',
  border: 'rgba(255, 255, 255, 0.08)',
  outline: '#71717a',
  primary: '#fafafa',
  primaryOnAccent: '#09090b',
  readingAccent: 'rgb(52, 211, 153)',
  readingMetricBorder: '#3f3f46',
  waterCtaOnAccent: '#0f172a',
};

export function getGoalDetailSessionUi(isDark: boolean): GoalDetailSessionUiTokens {
  return isDark ? DARK : LIGHT;
}

/** @deprecated getGoalDetailSessionUi(isDark) 를 사용하세요 */
export const GoalDetailSessionUi = LIGHT;
