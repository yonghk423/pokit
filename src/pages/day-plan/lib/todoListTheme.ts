import type { TodoPriority } from '@entities/day-plan';
import { ITEM_PRIORITY_META } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';

import type { DayPlanPalette } from './dayPlanPalette';

export const TODO_PRIORITY_META = ITEM_PRIORITY_META;

export const TODO_TABLE_BORDER_WIDTH = 1;

export const TODO_LAYOUT = {
  checkboxSize: 22,
  rowMinHeight: 46,
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
  cardBg: string;
  checkFill: string;
  addBtnBg: string;
  tagBg: string;
  tagText: string;
};

export function todoListUiColors(c: DayPlanPalette, isDark: boolean): TodoListUiColors {
  const rc = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    ink: c.onSurface,
    muted: c.onVariant,
    line: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(24,26,46,0.12)',
    danger: rc.danger,
    dangerBg: rc.dangerBg,
    primary: rc.primary,
    primaryOn: rc.primaryOn,
    done: isDark ? '#7DD99A' : '#64748B',
    placeholder: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(24,26,46,0.32)',
    btnBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
    btnBorder: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.85)',
    tableBorder: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.85)',
    cellBg: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#F3F0EA',
    checkFill: isDark ? '#FAFAFA' : '#0F172A',
    addBtnBg: isDark ? '#356668' : '#B8E0DC',
    tagBg: isDark ? '#1E293B' : '#0F172A',
    tagText: '#FAFAFA',
  };
}
