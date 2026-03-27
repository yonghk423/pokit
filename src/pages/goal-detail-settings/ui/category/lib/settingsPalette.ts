/** 목표 상세 설정 폼 공통 (라이트/다크) */
export function goalDetailSettingsPalette(isDark: boolean) {
  if (isDark) {
    return {
      surfaceLow: '#18181b',
      surfaceLowest: '#0f0f12',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      outlineVariant: 'rgba(255,255,255,0.12)',
    };
  }
  return {
    surfaceLow: '#f4f4f5',
    surfaceLowest: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    outlineVariant: 'rgba(0,0,0,0.10)',
  };
}
