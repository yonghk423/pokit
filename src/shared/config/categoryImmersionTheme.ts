import { getGoalDetailSessionUi, GoalDetailSessionUi, type GoalDetailSessionUiTokens } from './goalDetailSessionUi';

function build(ui: GoalDetailSessionUiTokens) {
  return {
    reading: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.readingAccent,
      accentText: 'rgb(52, 211, 153)',
      brand: 'LOCKFLOW READING',
      aboutKicker: 'ABOUT BOOK FLOW',
    },
    water: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: '#22d3ee',
      accentSoft: 'rgba(34, 211, 238, 0.14)',
      brand: 'LOCKFLOW WATER',
      aboutKicker: 'ABOUT HYDRATION',
    },
    work: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.primary,
      brand: 'LOCKFLOW WORK',
      aboutKicker: 'ABOUT FOCUS',
    },
    fasting: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      outline: ui.outline,
      border: ui.border,
      accent: ui.primary,
      brand: 'LOCKFLOW WEIGHT',
      aboutKicker: 'ABOUT WEIGHT',
    },
    medicine: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.primary,
      brand: 'LOCKFLOW MEDICINE',
      aboutKicker: 'ABOUT MEDICATION',
    },
    meditation: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.primary,
      title: '명상 세션',
    },
    yoga: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.primary,
      title: '요가 세션',
    },
    other: {
      screenBg: ui.screenBg,
      onSurface: ui.onSurface,
      muted: ui.muted,
      border: ui.border,
      accent: ui.primary,
      brand: 'LOCKFLOW OTHER',
      aboutKicker: 'ABOUT TOOLS',
    },
    editorial: {
      glassBg: ui.cardBg,
      glassBgAlt: ui.screenBg === '#ffffff' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
      glassBorder: ui.border,
      meta: ui.muted,
      onDark: ui.onSurface,
    },
  } as const;
}

export function getCategoryImmersionTheme(isDark: boolean) {
  return build(getGoalDetailSessionUi(isDark));
}

/** @deprecated getCategoryImmersionTheme(isDark) 를 사용하세요 */
export const CategoryImmersionTheme = build(GoalDetailSessionUi);
