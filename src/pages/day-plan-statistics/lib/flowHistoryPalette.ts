import { RetroFlatColors } from '@shared/config/retroFlat';

export type FlowHistoryPalette = {
  pageBg: string;
  card: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  weekdayIdle: string;
  shadow: string;
  actionBg: string;
  fab: string;
  fabIcon: string;
};

export function buildFlowHistoryPalette(isDark: boolean): FlowHistoryPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    pageBg: c.bg,
    card: isDark ? c.surfaceAlt : '#FFFFFF',
    border: c.border,
    ink: c.text,
    muted: c.textMuted,
    accent: c.primary,
    accentSoft: c.primaryContainer,
    weekdayIdle: c.accentMuted,
    shadow: isDark ? c.solidShadow : c.text,
    actionBg: isDark ? c.surfaceAlt : '#FFFFFF',
    fab: c.primary,
    fabIcon: c.primaryOn,
  };
}
