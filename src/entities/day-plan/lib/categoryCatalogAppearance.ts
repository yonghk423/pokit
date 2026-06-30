import {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from '@shared/lib/customFlowAppearanceCatalog';
import {
  loadGoalDetailCategoryConfig,
  resolveCustomFlowCatalogColor,
  resolveCustomFlowCatalogIcon,
  type CustomFlowAccentColorOption,
  type CustomFlowIconOption,
} from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import type { OtherDetailDataConfig } from './goalCategorySessionConfig';

/** 담기·카탈로그 기본 SF Symbol */
const BUILTIN_CATEGORY_ICONS: Record<string, string> = {
  water: 'drop.fill',
  medicine: 'cross.case.fill',
  vitamins: 'pill.fill',
  fasting: 'figure.stand',
  stretching: 'figure.run',
  straightenBack: 'figure.yoga',
  neckPosture: 'tortoise.fill',
  posture: 'figure.stand.line.dotted.figure.stand',
  meditation: 'brain.head.profile',
  workout: 'dumbbell.fill',
  walking: 'figure.walk',
  yoga: 'figure.mind.and.body',
  sleep: 'moon.fill',
  breathing: 'wind',
  skincare: 'sparkles',
  eyerest: 'eye',
  reading: 'book.fill',
  study: 'graduationcap.fill',
  planning: 'calendar.badge.clock',
  writing: 'square.and.pencil',
  language: 'character.bubble',
  creative: 'paintpalette.fill',
  deepwork: 'brain',
  journal: 'book.closed.fill',
  pomodoro: 'timer',
  review: 'arrow.counterclockwise',
  news: 'newspaper.fill',
  organize: 'tray.and.arrow.down.fill',
  podcast: 'headphones',
  inbox: 'tray.2.fill',
  work: 'bag.fill',
  coding: 'chevron.left.forwardslash.chevron.right',
  other: 'person.fill',
};

/** 담기·카탈로그 기본 강조색 */
const BUILTIN_CATEGORY_ACCENT_COLORS: Record<string, string> = {
  water: '#7dd3fc',
  medicine: '#dc2626',
  fasting: '#8b5a2b',
  stretching: '#0d9488',
  straightenBack: '#6366f1',
  neckPosture: '#a855f7',
  meditation: '#9333ea',
  workout: '#e11d48',
  walking: '#16a34a',
  yoga: '#14b8a6',
  sleep: '#4f46e5',
  breathing: '#06b6d4',
  skincare: '#ec4899',
  vitamins: '#b91c1c',
  posture: '#6366f1',
  eyerest: '#0284c7',
  reading: '#22c55e',
  study: '#2563eb',
  planning: '#0891b2',
  writing: '#7c3aed',
  language: '#1d4ed8',
  creative: '#c026d3',
  inbox: '#64748b',
  deepwork: '#1e40af',
  journal: '#ca8a04',
  pomodoro: '#ea580c',
  review: '#0f766e',
  news: '#334155',
  organize: '#78716c',
  podcast: '#7c3aed',
  work: '#1e3a8a',
  coding: '#172554',
  other: '#f97316',
};

function readStoredCategoryIcon(categoryKey: string): CustomFlowIconOption | undefined {
  const cfg = loadGoalDetailCategoryConfig(categoryKey);
  return normalizeCustomFlowIcon((cfg as { icon?: unknown } | null)?.icon);
}

function readStoredCategoryAccentColor(categoryKey: string): CustomFlowAccentColorOption | undefined {
  const cfg = loadGoalDetailCategoryConfig(categoryKey);
  return normalizeCustomFlowAccentColor((cfg as { accentColor?: unknown } | null)?.accentColor);
}

/** 목표 상세·담기·집중 UI — 저장값 → builtin/customFlow 기본값 */
export function resolveCategoryCatalogIcon(categoryKey: string): string {
  const stored = readStoredCategoryIcon(categoryKey);
  if (stored) return stored;
  if (isCustomFlowCategoryKey(categoryKey)) return resolveCustomFlowCatalogIcon(categoryKey);
  return BUILTIN_CATEGORY_ICONS[categoryKey] ?? DEFAULT_CUSTOM_FLOW_ICON;
}

export function resolveCategoryCatalogAccentColor(categoryKey: string): string {
  const stored = readStoredCategoryAccentColor(categoryKey);
  if (stored) return stored;
  if (isCustomFlowCategoryKey(categoryKey)) return resolveCustomFlowCatalogColor(categoryKey);
  return BUILTIN_CATEGORY_ACCENT_COLORS[categoryKey] ?? DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;
}

export function readEditableCategoryAppearance(
  categoryKey: string,
  cfg: OtherDetailDataConfig,
): { icon: CustomFlowIconOption; accentColor: CustomFlowAccentColorOption } {
  const icon =
    normalizeCustomFlowIcon(cfg.icon) ??
    normalizeCustomFlowIcon(resolveCategoryCatalogIcon(categoryKey)) ??
    DEFAULT_CUSTOM_FLOW_ICON;

  const accentColor =
    normalizeCustomFlowAccentColor(cfg.accentColor) ??
    normalizeCustomFlowAccentColor(resolveCategoryCatalogAccentColor(categoryKey)) ??
    DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;

  return { icon, accentColor };
}
