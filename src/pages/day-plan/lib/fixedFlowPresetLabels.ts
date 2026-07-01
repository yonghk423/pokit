export function getFixedFlowPresetScheduleLabel(
  applyRule: 'daily' | 'weekend' | string,
): string | null {
  if (applyRule === 'daily') return '매일';
  if (applyRule === 'weekend') return '주말';
  return null;
}

export function getFixedFlowPresetScheduleHint(applyRule: 'daily' | 'weekend' | string): string {
  if (applyRule === 'daily') return '매일 오늘 탭에 자동으로 추가돼요.';
  if (applyRule === 'weekend') return '토·일 오늘 탭에 자동으로 추가돼요.';
  return '';
}
