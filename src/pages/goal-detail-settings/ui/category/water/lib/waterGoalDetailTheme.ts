/**
 * 목표 상세 설정 — 수분섭취 카테고리 몰입 UI (시안 액센트 + 화이트 배경)
 * 시스템 라이트/다크와 무관하게 동일 톤으로 고정합니다.
 */
export const WATER_GOAL_DETAIL_THEME = {
  screenBg: '#ffffff',
  headerBg: '#ffffff',
  summaryTint: 'rgba(34, 211, 238, 0.12)',
  onSurface: '#18181b',
  onSurfaceVariant: '#52525b',
  outline: 'rgba(0, 0, 0, 0.08)',
  surfaceContainerLow: 'rgba(0, 0, 0, 0.03)',
  surfaceContainerHigh: 'rgba(0, 0, 0, 0.06)',
  surfaceContainerHighest: '#e4e4e7',
  /** 잠금화면 미리보기 위젯 카드 */
  glassPreview: '#ffffff',
  glassPreviewBorder: 'rgba(0, 0, 0, 0.08)',
  /** 잠금화면 목업 배경 (밝은 블루 틴트) */
  lockDeep: '#e8f4fc',
  primary: '#22d3ee',
  primarySoft: 'rgba(34, 211, 238, 0.14)',
  progressFill: '#22d3ee',
  trackRing: 'rgba(0, 0, 0, 0.1)',
  ctaBg: '#22d3ee',
  ctaText: '#0f172a',
  placeholder: 'rgba(82, 82, 91, 0.55)',
} as const;
