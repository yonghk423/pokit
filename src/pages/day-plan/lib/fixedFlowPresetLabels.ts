export function getFixedFlowPresetScheduleLabel(
  applyRule: 'daily' | 'weekend' | string,
): string | null {
  if (applyRule === 'daily') return '매일';
  if (applyRule === 'weekend') return '주말';
  return null;
}

export function getFixedFlowPresetScheduleHint(applyRule: 'daily' | 'weekend' | string): string {
  if (applyRule === 'daily') {
    return '구간·항목을 먼저 설정한 뒤, 적용을 켜면 오늘 탭에 반영돼요.';
  }
  if (applyRule === 'weekend') {
    return '적용을 켜두면 토·일에 자동으로 오늘 탭에 반영돼요.';
  }
  return '';
}
