import { GoalDetailSessionUi } from './goalDetailSessionUi';

/**
 * 카테고리 몰입(세션) UI — 목표 상세 설정과 동일한 라이트 에디토리얼 톤.
 * (수분: waterGoalDetailTheme 과 수치·액센트 정합)
 */
export const CategoryImmersionTheme = {
  reading: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.readingAccent,
    accentText: 'rgb(52, 211, 153)',
    brand: 'LOCKFLOW READING',
    aboutKicker: 'ABOUT BOOK FLOW',
  },
  water: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.14)',
    brand: 'LOCKFLOW WATER',
    aboutKicker: 'ABOUT HYDRATION',
  },
  work: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    brand: 'LOCKFLOW WORK',
    aboutKicker: 'ABOUT FOCUS',
  },
  fasting: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    outline: GoalDetailSessionUi.outline,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    brand: 'LOCKFLOW WEIGHT',
    aboutKicker: 'ABOUT WEIGHT',
  },
  medicine: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    brand: 'LOCKFLOW MEDICINE',
    aboutKicker: 'ABOUT MEDICATION',
  },
  meditation: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    title: '명상 세션',
  },
  yoga: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    title: '요가 세션',
  },
  other: {
    screenBg: GoalDetailSessionUi.screenBg,
    onSurface: GoalDetailSessionUi.onSurface,
    muted: GoalDetailSessionUi.muted,
    border: GoalDetailSessionUi.border,
    accent: GoalDetailSessionUi.primary,
    brand: 'LOCKFLOW OTHER',
    aboutKicker: 'ABOUT TOOLS',
  },
  editorial: {
    glassBg: GoalDetailSessionUi.screenBg,
    glassBgAlt: 'rgba(0, 0, 0, 0.03)',
    glassBorder: GoalDetailSessionUi.border,
    meta: GoalDetailSessionUi.muted,
    /** 카드 본문 전경 — 명칭은 하위 호환용 */
    onDark: GoalDetailSessionUi.onSurface,
  },
} as const;
