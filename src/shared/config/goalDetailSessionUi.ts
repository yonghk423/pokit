/**
 * 앱 내 실행(세션) 화면 — `GoalDetailSettingsPage` 라이트 셸과 동일 토큰.
 * (수분 카테고리만 시안 액센트 유지)
 */
export const GoalDetailSessionUi = {
  screenBg: '#ffffff',
  onSurface: '#18181b',
  muted: '#52525b',
  border: 'rgba(0, 0, 0, 0.08)',
  outline: '#a1a1aa',
  primary: 'rgb(0, 0, 0)',
  /** `ReadingSettings` — 읽을 분량 등 포인트 */
  readingAccent: 'rgb(16, 185, 129)',
  readingMetricBorder: '#d1d5db',
  /** 수분 CTA 위 전경 (WaterSettings / waterGoalDetailTheme 과 동일) */
  waterCtaOnAccent: '#0f172a',
} as const;
