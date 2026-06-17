export type HistoryCalendarDensityLevel = 0 | 1 | 2 | 3;

/** 달력 셀 완료 농도 — 0: 없음, 1: 3개 이하, 2: 5~9개, 3: 10개 이상 */
export function completionDensityLevel(completedFlowCount: number): HistoryCalendarDensityLevel {
  const n = Math.max(0, Math.floor(Number(completedFlowCount) || 0));
  if (n >= 10) return 3;
  if (n >= 5) return 2;
  if (n >= 1) return 1;
  return 0;
}

export type HistoryCalendarDensityLegendItem = {
  level: Exclude<HistoryCalendarDensityLevel, 0>;
  label: string;
  color: string;
};

export function buildHistoryCalendarDensityLegend(isDark: boolean): HistoryCalendarDensityLegendItem[] {
  const colors = getHistoryCalendarDensityColors(isDark);
  return [
    { level: 1, label: '3개 이하', color: colors[1] },
    { level: 2, label: '5개 이상', color: colors[2] },
    { level: 3, label: '10개 이상', color: colors[3] },
  ];
}

/** index 0 unused — level 1~3 유채색 */
export function getHistoryCalendarDensityColors(isDark: boolean): Record<HistoryCalendarDensityLevel, string | undefined> {
  if (isDark) {
    return {
      0: undefined,
      1: 'rgba(250, 204, 21, 0.52)',
      2: 'rgba(56, 189, 248, 0.55)',
      3: 'rgba(244, 114, 182, 0.58)',
    };
  }
  return {
    0: undefined,
    1: '#FDE68A',
    2: '#7DD3FC',
    3: '#D8B4FE',
  };
}

export function calendarDensityDayTextColor(
  level: HistoryCalendarDensityLevel,
  selected: boolean,
  isDark: boolean,
  ink: string,
): string {
  if (selected) return isDark ? '#18181b' : '#ffffff';
  if (level >= 2) return isDark ? '#fafafa' : '#1e293b';
  if (level === 1) return isDark ? '#fef9c3' : '#78350f';
  return ink;
}

export function calendarDensityCellBackground(
  level: HistoryCalendarDensityLevel,
  selected: boolean,
  isDark: boolean,
  colors: Record<HistoryCalendarDensityLevel, string | undefined>,
  selectedFill: string,
): string | undefined {
  if (selected) return selectedFill;
  if (level === 0) return undefined;
  return colors[level];
}
