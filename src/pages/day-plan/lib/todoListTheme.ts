import type { TodoPriority } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';

import type { DayPlanPalette } from './dayPlanPalette';

export const TODO_PRIORITY_META: Record<
  TodoPriority,
  { label: string; dot: string }
> = {
  high: { label: '높음', dot: '#D94F4F' },
  medium: { label: '보통', dot: '#C9A227' },
  low: { label: '낮음', dot: '#4A9B5F' },
};

/** 표·셀 테두리 — brutalist 2px 대신 얇은 outline 톤 */
export const TODO_TABLE_BORDER_WIDTH = 1;

/** 모바일 한 화면 — 시간·상태 열 고정 폭 */
export const TODO_LAYOUT = {
  timeWidth: 58,
  statusWidth: 28,
  priorityWidth: 38,
  gap: 8,
} as const;

export type TodoListUiColors = {
  ink: string;
  muted: string;
  line: string;
  danger: string;
  dangerBg: string;
  primary: string;
  primaryOn: string;
  done: string;
  placeholder: string;
  btnBg: string;
  btnBorder: string;
  tableBorder: string;
  cellBg: string;
};

export function todoListUiColors(c: DayPlanPalette, isDark: boolean): TodoListUiColors {
  const rc = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    ink: c.onSurface,
    muted: c.onVariant,
    line: isDark ? 'rgba(255,255,255,0.2)' : c.catBorderIdle,
    danger: rc.danger,
    dangerBg: rc.dangerBg,
    primary: rc.primary,
    primaryOn: rc.primaryOn,
    done: isDark ? '#7DD99A' : '#1A6B38',
    placeholder: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(24,26,46,0.35)',
    btnBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    btnBorder: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
    tableBorder: isDark ? 'rgba(255,255,255,0.22)' : c.catBorderIdle,
    cellBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
  };
}
