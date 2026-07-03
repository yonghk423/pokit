import { RetroFlatColors } from '@shared/config/retroFlat';

export type DayPlanPalette = {
  bg: string;
  headerBg: string;
  border: string;
  onSurface: string;
  onVariant: string;
  outline: string;
  containerLowest: string;
  containerLow: string;
  containerHigh: string;
  shadow: string;
  trackOff: string;
  catBorderIdle: string;
};

export function palette(isDark: boolean): DayPlanPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    headerBg: c.bg,
    border: c.border,
    onSurface: c.text,
    onVariant: c.textMuted,
    outline: c.borderMuted,
    containerLowest: c.surface,
    containerLow: c.surfaceAlt,
    containerHigh: c.surfacePink,
    shadow: 'transparent',
    trackOff: c.accentMuted,
    catBorderIdle: c.borderMuted,
  };
}
