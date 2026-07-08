import { RetroFlatColors } from '@shared/config/retroFlat';

/** 목표 상세 설정 폼 공통 (라이트/다크) */
export function goalDetailSettingsPalette(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    surfaceLow: c.surfaceAlt,
    surfaceLowest: c.surface,
    onSurface: c.text,
    onVariant: c.textMuted,
    outline: c.borderMuted,
    outlineVariant: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };
}
