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

const HEALTH_INTAKE_LEGACY_ICONS = new Set(['drop.fill', 'cross.case.fill']);
const HEALTH_INTAKE_CATALOG_ICON = 'pills.fill';
const HEALTH_INTAKE_CATALOG_ACCENT = '#8b5a2b';
const HEALTH_INTAKE_LEGACY_ACCENT_COLORS = new Set(['#0ea5e9', '#0891b2', '#22d3ee', '#38bdf8']);

function resolveHealthIntakeCatalogIcon(icon: string | undefined): string | undefined {
  if (icon != null && HEALTH_INTAKE_LEGACY_ICONS.has(icon)) return HEALTH_INTAKE_CATALOG_ICON;
  return icon;
}

function resolveHealthIntakeCatalogAccentColor(color: string | undefined): string | undefined {
  if (color != null && HEALTH_INTAKE_LEGACY_ACCENT_COLORS.has(color.toLowerCase())) {
    return HEALTH_INTAKE_CATALOG_ACCENT;
  }
  return color;
}

/** 담기·카탈로그 기본 SF Symbol */
const BUILTIN_CATEGORY_ICONS: Record<string, string> = {
  healthIntake: HEALTH_INTAKE_CATALOG_ICON,
  fasting: 'figure.stand',
  reading: 'book.fill',
  work: 'bag.fill',
  other: 'person.fill',
};

/** 담기·카탈로그 기본 강조색 */
const BUILTIN_CATEGORY_ACCENT_COLORS: Record<string, string> = {
  healthIntake: HEALTH_INTAKE_CATALOG_ACCENT,
  fasting: '#8b5a2b',
  reading: '#356668',
  work: '#1e3a8a',
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
  if (stored) {
    if (categoryKey === 'healthIntake') {
      return resolveHealthIntakeCatalogIcon(stored) ?? stored;
    }
    return stored;
  }
  if (isCustomFlowCategoryKey(categoryKey)) return resolveCustomFlowCatalogIcon(categoryKey);
  return BUILTIN_CATEGORY_ICONS[categoryKey] ?? DEFAULT_CUSTOM_FLOW_ICON;
}

export function resolveCategoryCatalogAccentColor(categoryKey: string): string {
  const stored = readStoredCategoryAccentColor(categoryKey);
  if (stored) {
    if (categoryKey === 'healthIntake') {
      return resolveHealthIntakeCatalogAccentColor(stored) ?? stored;
    }
    return stored;
  }
  if (isCustomFlowCategoryKey(categoryKey)) return resolveCustomFlowCatalogColor(categoryKey);
  return BUILTIN_CATEGORY_ACCENT_COLORS[categoryKey] ?? DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;
}

export function readEditableCategoryAppearance(
  categoryKey: string,
  cfg: OtherDetailDataConfig,
): { icon: CustomFlowIconOption; accentColor: CustomFlowAccentColorOption } {
  const resolvedIcon =
    normalizeCustomFlowIcon(cfg.icon) ??
    normalizeCustomFlowIcon(resolveCategoryCatalogIcon(categoryKey)) ??
    DEFAULT_CUSTOM_FLOW_ICON;
  const icon =
    categoryKey === 'healthIntake'
      ? ((normalizeCustomFlowIcon(resolveHealthIntakeCatalogIcon(resolvedIcon)) ??
          normalizeCustomFlowIcon(HEALTH_INTAKE_CATALOG_ICON)) ??
        DEFAULT_CUSTOM_FLOW_ICON)
      : resolvedIcon;

  const resolvedAccent =
    normalizeCustomFlowAccentColor(cfg.accentColor) ??
    normalizeCustomFlowAccentColor(resolveCategoryCatalogAccentColor(categoryKey)) ??
    DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;
  const accentColor =
    categoryKey === 'healthIntake'
      ? (normalizeCustomFlowAccentColor(resolveHealthIntakeCatalogAccentColor(resolvedAccent)) ??
        normalizeCustomFlowAccentColor(HEALTH_INTAKE_CATALOG_ACCENT) ??
        DEFAULT_CUSTOM_FLOW_ACCENT_COLOR)
      : resolvedAccent;

  return { icon, accentColor };
}
