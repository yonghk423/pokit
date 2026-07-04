import { RetroFlatColors } from '@shared/config/retroFlat';

export type FlowHistoryPalette = {
  card: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  weekdayIdle: string;
  fab: string;
  fabIcon: string;
};

export function buildFlowHistoryPalette(isDark: boolean): FlowHistoryPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    card: c.bg,
    border: c.border,
    ink: c.text,
    muted: c.textMuted,
    accent: c.primary,
    accentSoft: c.primaryContainer,
    weekdayIdle: c.accentMuted,
    fab: c.primary,
    fabIcon: c.primaryOn,
  };
}
