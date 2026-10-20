/**
 * 하루 밸런스 종이 팔레트 — 잉크 회색과 앱 민트 포인트
 */
export const DayBalanceOcean = {
  sky: '#A8DADC',
  blueGreen: '#477C7E',
  deepSpace: '#252525',
  amber: '#477C7E',
  tiger: '#6D999A',
  /** 활동 구간은 민트 종이, 수면 구간은 진한 흑연 음영으로 */
  pastelRose: '#C2E4E3',
  /** 시작 카드와 트랙에만 얹는 얕은 민트 워시 */
  skyWash: '#EDF7F6',
  skyWashDark: 'rgba(158, 207, 209, 0.16)',
  /** 하루 마무리는 따뜻한 종이 회색 */
  amberWash: '#F0EEEA',
  amberWashDark: 'rgba(255, 255, 255, 0.16)',
} as const;

/**
 * 루틴 탭(PriorityCatalog / FixedRoutine)과 맞춘 솔리드 음영.
 * 불투명 deepSpace 대신 옅은 잉크 + offset 1.
 */
export const DAY_BALANCE_SOFT_SHADOW_OFFSET = 1;
export const DAY_BALANCE_SOFT_SHADOW_LIGHT = 'rgba(22, 35, 35, 0.22)';
export const DAY_BALANCE_SOFT_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';

export function dayBalanceSoftShadow(isDark: boolean): string {
  return isDark ? DAY_BALANCE_SOFT_SHADOW_DARK : DAY_BALANCE_SOFT_SHADOW_LIGHT;
}

/** 당일 / 다음 날 SmoothSegmentedControl */
export function dayBalanceSegmentPalette(isDark: boolean) {
  return {
    selectedFill: isDark ? '#306163' : DayBalanceOcean.sky,
    trackFill: isDark ? DayBalanceOcean.skyWashDark : '#FFFFFF',
    selectedInk: isDark ? '#FFFFFF' : DayBalanceOcean.deepSpace,
    unselectedInk: isDark ? DayBalanceOcean.sky : DayBalanceOcean.blueGreen,
    shadow: dayBalanceSoftShadow(isDark),
  };
}

export type DayBalanceTimeRole = 'start' | 'end';

/** 하루 시작 · 마무리 시각 pill / 날짜 캡션 */
export function dayBalanceTimeFieldPalette(isDark: boolean, role: DayBalanceTimeRole) {
  const isStart = role === 'start';
  /** 연한 필 위 날짜·시각은 블랙으로 대비 확보 */
  const onWashInk = isDark ? '#EEEEEE' : '#252525';
  return {
    label: isDark ? '#FFFFFF' : '#000000',
    hint: isDark ? '#CCCCCC' : '#666666',
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
    shadow: dayBalanceSoftShadow(isDark),
  };
}
