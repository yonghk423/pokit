/**
 * 하루 밸런스 Ocean 팔레트
 * Sky · Blue Green · Deep Space · Amber Flame · Tiger Orange
 */
export const DayBalanceOcean = {
  sky: '#8ecae6',
  blueGreen: '#219ebc',
  deepSpace: '#023047',
  amber: '#ffb703',
  tiger: '#fb8500',
  /** 트랙·카드용 아주 옅은 하늘 */
  skyWash: '#EAF6FB',
  skyWashDark: 'rgba(142, 202, 230, 0.14)',
  /** 마무리(저녁)용 옅은 앰버 */
  amberWash: '#FFF6E0',
  amberWashDark: 'rgba(255, 183, 3, 0.16)',
} as const;

/** 당일 / 다음 날 SmoothSegmentedControl */
export function dayBalanceSegmentPalette(isDark: boolean) {
  return {
    selectedFill: isDark ? DayBalanceOcean.blueGreen : DayBalanceOcean.sky,
    trackFill: isDark ? DayBalanceOcean.skyWashDark : DayBalanceOcean.skyWash,
    selectedInk: isDark ? '#FFFFFF' : DayBalanceOcean.deepSpace,
    unselectedInk: isDark ? DayBalanceOcean.sky : DayBalanceOcean.blueGreen,
    shadow: DayBalanceOcean.deepSpace,
  };
}

export type DayBalanceTimeRole = 'start' | 'end';

/** 하루 시작 · 마무리 시각 pill / 날짜 캡션 */
export function dayBalanceTimeFieldPalette(isDark: boolean, role: DayBalanceTimeRole) {
  const isStart = role === 'start';
  /** 연한 필 위 날짜·시각은 블랙으로 대비 확보 */
  const onWashInk = isDark ? '#FFFFFF' : '#000000';
  return {
    label: isDark ? '#FFFFFF' : '#000000',
    hint: isDark ? DayBalanceOcean.sky : DayBalanceOcean.blueGreen,
    date: onWashInk,
    pillBg: isStart
      ? isDark
        ? DayBalanceOcean.skyWashDark
        : DayBalanceOcean.skyWash
      : isDark
        ? DayBalanceOcean.amberWashDark
        : DayBalanceOcean.amberWash,
    pillInk: onWashInk,
    border: DayBalanceOcean.deepSpace,
    shadow: DayBalanceOcean.deepSpace,
  };
}
