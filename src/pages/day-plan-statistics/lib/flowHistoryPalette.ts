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
  /** 히스토리 탭 — 포스트잇 면색은 화이트 고정 (루틴 탭 옐로우와 구분) */
  const face = isDark ? c.surfaceAlt : '#FFFFFF';
  return {
    pageBg: c.bg,
    card: face,
    border: c.border,
    ink: c.text,
    muted: c.textMuted,
    accent: c.primary,
    accentSoft: c.primaryContainer,
    weekdayIdle: face,
    /** 나만의 루틴 세트 카드와 같은 옅은 솔리드 음영 */
    shadow: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    actionBg: face,
    fab: c.primary,
    fabIcon: c.primaryOn,
  };
}
