/** 목표 상세 설정 폼 공통 (라이트/다크) */
export function goalDetailSettingsPalette(isDark: boolean) {
  if (isDark) {
    return {
      surfaceLow: '#ffffff',
      surfaceLowest: '#ffffff',
      onSurface: '#18181b',
      onVariant: '#52525b',
      outline: '#a1a1aa',
      outlineVariant: 'rgba(0,0,0,0.10)',
    };
  }
  return {
    surfaceLow: '#ffffff',
    surfaceLowest: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    outlineVariant: 'rgba(0,0,0,0.10)',
  };
}
