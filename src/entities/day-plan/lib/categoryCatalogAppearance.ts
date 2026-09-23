import { contrastingForeground } from '@shared/lib/colorMath';
import {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from '@shared/lib/customFlowAppearanceCatalog';
import {
  BUILTIN_STRETCHING_FLOW_ID,
  resolveCustomFlowCatalogColor,
  resolveCustomFlowCatalogIcon,
  type CustomFlowAccentColorOption,
  type CustomFlowIconOption,
} from '@shared/lib/storage';

import { useGoalDetailSettingsStore } from '../model/goalDetailSettingsStore';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { normalizeOtherDetailConfig } from './goalCategorySessionConfig';
import { HEALTH_INTAKE_CATEGORY_KEY, normalizeHealthIntakeDetailConfig } from './healthIntakeDetailConfig';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';

const HEALTH_INTAKE_LEGACY_ICONS = new Set(['drop.fill', 'cross.case.fill']);
const HEALTH_INTAKE_CATALOG_ICON = 'pills.fill';
/** 건강을 위한 섭취 — 알약 아이콘 타일 골드 앰버 */
const HEALTH_INTAKE_CATALOG_ACCENT = '#e9a23b';
const HEALTH_INTAKE_LEGACY_ACCENT_COLORS = new Set([
  '#0ea5e9',
  '#0891b2',
  '#22d3ee',
  '#38bdf8',
  '#8b5a2b',
  '#f59e0b',
]);
/** 체중 조절 — 건강 섭취(앰버)와 구분되는 틸 */
const FASTING_CATALOG_ACCENT = '#14b8a6';
/** 예전 기본값(건강 섭취와 같던 브라운) → 새 틸로 치환 */
const FASTING_LEGACY_ACCENT_COLORS = new Set(['#8b5a2b']);
const FASTING_CATALOG_ICON = 'figure.stand';
const FASTING_LEGACY_ICONS = new Set(['person.fill', 'scalemass.fill']);

const READING_CATEGORY_KEY = 'reading';
const READING_CATALOG_ICON = 'book.closed.fill';
const READING_LEGACY_ICONS = new Set(['book.fill']);

const WORK_CATEGORY_KEY = 'work';
const WORK_CATALOG_ICON = 'square.and.pencil';
const WORK_LEGACY_ICONS = new Set(['bag.fill']);

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

function resolveFastingCatalogAccentColor(color: string | undefined): string | undefined {
  if (color != null && FASTING_LEGACY_ACCENT_COLORS.has(color.toLowerCase())) {
    return FASTING_CATALOG_ACCENT;
  }
  return color;
}

function resolveFastingCatalogIcon(icon: string | undefined): string | undefined {
  if (icon != null && FASTING_LEGACY_ICONS.has(icon)) return FASTING_CATALOG_ICON;
  return icon;
}

function resolveReadingCatalogIcon(icon: string | undefined): string | undefined {
  if (icon != null && READING_LEGACY_ICONS.has(icon)) return READING_CATALOG_ICON;
  return icon;
}

function resolveWorkCatalogIcon(icon: string | undefined): string | undefined {
  if (icon != null && WORK_LEGACY_ICONS.has(icon)) return WORK_CATALOG_ICON;
  return icon;
}

/** 담기·카탈로그 기본 SF Symbol */
const BUILTIN_CATEGORY_ICONS: Record<string, string> = {
  healthIntake: HEALTH_INTAKE_CATALOG_ICON,
  water: 'drop.fill',
  medicine: 'pills.fill',
  fasting: FASTING_CATALOG_ICON,
  reading: READING_CATALOG_ICON,
  work: WORK_CATALOG_ICON,
  other: 'person.fill',
};

/** 담기·카탈로그 기본 강조색 */
const BUILTIN_CATEGORY_ACCENT_COLORS: Record<string, string> = {
  healthIntake: HEALTH_INTAKE_CATALOG_ACCENT,
  water: '#0ea5e9',
  medicine: '#8b5a2b',
  fasting: FASTING_CATALOG_ACCENT,
  reading: '#356668',
  work: '#1e3a8a',
  other: '#f97316',
};

function asConfigObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function readCategoryConfig(categoryKey: string): unknown | null {
  return useGoalDetailSettingsStore.getState().getCategoryConfig(categoryKey);
}

function readAppearanceFieldsFromRaw(raw: unknown): {
  icon?: CustomFlowIconOption;
  accentColor?: CustomFlowAccentColorOption;
} {
  const o = asConfigObj(raw);
  return {
    icon: normalizeCustomFlowIcon(o.icon) ?? undefined,
    accentColor: normalizeCustomFlowAccentColor(o.accentColor) ?? undefined,
  };
}

function resolveBuiltinCategoryIcon(categoryKey: string): CustomFlowIconOption {
  if (isCustomFlowCategoryKey(categoryKey)) {
    return (
      normalizeCustomFlowIcon(resolveCustomFlowCatalogIcon(categoryKey)) ?? DEFAULT_CUSTOM_FLOW_ICON
    );
  }
  return normalizeCustomFlowIcon(BUILTIN_CATEGORY_ICONS[categoryKey]) ?? DEFAULT_CUSTOM_FLOW_ICON;
}

function resolveBuiltinCategoryAccentColor(categoryKey: string): CustomFlowAccentColorOption {
  if (isCustomFlowCategoryKey(categoryKey)) {
    return (
      normalizeCustomFlowAccentColor(resolveCustomFlowCatalogColor(categoryKey)) ??
      DEFAULT_CUSTOM_FLOW_ACCENT_COLOR
    );
  }
  return (
    normalizeCustomFlowAccentColor(BUILTIN_CATEGORY_ACCENT_COLORS[categoryKey]) ??
    DEFAULT_CUSTOM_FLOW_ACCENT_COLOR
  );
}

function readStoredCategoryIcon(categoryKey: string): CustomFlowIconOption | undefined {
  const cfg = readCategoryConfig(categoryKey);
  return normalizeCustomFlowIcon((cfg as { icon?: unknown } | null)?.icon);
}

function readStoredCategoryAccentColor(categoryKey: string): CustomFlowAccentColorOption | undefined {
  const cfg = readCategoryConfig(categoryKey);
  return normalizeCustomFlowAccentColor((cfg as { accentColor?: unknown } | null)?.accentColor);
}

/** 목표 상세·담기·집중 UI — 저장값 → builtin/customFlow 기본값 */
export function resolveCategoryCatalogIcon(categoryKey: string): string {
  const resolvedCategoryKey = resolvePriorityRoutineCategoryKey(categoryKey);
  // customFlow는 accent와 동일하게 catalog(LocalStorage 저장값) 경로를 우선한다.
  // store-only 조회는 색은 최신·아이콘만 옛값으로 남는 비대칭을 만든다.
  if (isCustomFlowCategoryKey(resolvedCategoryKey)) {
    return resolveCustomFlowCatalogIcon(resolvedCategoryKey);
  }
  const stored = readStoredCategoryIcon(resolvedCategoryKey);
  if (stored) {
    if (resolvedCategoryKey === 'healthIntake') {
      return resolveHealthIntakeCatalogIcon(stored) ?? stored;
    }
    if (resolvedCategoryKey === 'fasting') {
      return resolveFastingCatalogIcon(stored) ?? stored;
    }
    if (resolvedCategoryKey === READING_CATEGORY_KEY) {
      return resolveReadingCatalogIcon(stored) ?? stored;
    }
    if (resolvedCategoryKey === WORK_CATEGORY_KEY) {
      return resolveWorkCatalogIcon(stored) ?? stored;
    }
    return stored;
  }
  return BUILTIN_CATEGORY_ICONS[resolvedCategoryKey] ?? DEFAULT_CUSTOM_FLOW_ICON;
}

export function resolveCategoryCatalogAccentColor(categoryKey: string): string {
  const resolvedCategoryKey = resolvePriorityRoutineCategoryKey(categoryKey);
  if (isCustomFlowCategoryKey(resolvedCategoryKey)) {
    return resolveCustomFlowCatalogColor(resolvedCategoryKey);
  }
  const stored = readStoredCategoryAccentColor(resolvedCategoryKey);
  if (stored) {
    if (resolvedCategoryKey === 'healthIntake') {
      return resolveHealthIntakeCatalogAccentColor(stored) ?? stored;
    }
    if (resolvedCategoryKey === 'fasting') {
      return resolveFastingCatalogAccentColor(stored) ?? stored;
    }
    return stored;
  }
  return (
    BUILTIN_CATEGORY_ACCENT_COLORS[resolvedCategoryKey] ??
    DEFAULT_CUSTOM_FLOW_ACCENT_COLOR
  );
}

/** 목표 상세 미리보기와 동일 — 칸은 강조색, 아이콘은 대비 전경 */
export function resolveCategoryCatalogIconTile(categoryKey: string): {
  boxBg: string;
  iconColor: string;
} {
  const boxBg = resolveCategoryCatalogAccentColor(categoryKey);
  return { boxBg, iconColor: contrastingForeground(boxBg) };
}

/** 목표 상세 아이콘·색상 편집 UI — 저장값·builtin을 그대로 반영(담기용 레거시 치환 없음) */
export function readEditableCategoryAppearance(
  categoryKey: string,
  raw: unknown,
): { icon: CustomFlowIconOption; accentColor: CustomFlowAccentColorOption } {
  const fromRaw = readAppearanceFieldsFromRaw(raw);
  const fromStored = readAppearanceFieldsFromRaw(readCategoryConfig(categoryKey));
  const fromLegacyWater =
    categoryKey === 'healthIntake'
      ? readAppearanceFieldsFromRaw(readCategoryConfig('water'))
      : {};

  const rawIcon =
    fromRaw.icon ??
    fromStored.icon ??
    fromLegacyWater.icon ??
    resolveBuiltinCategoryIcon(categoryKey);
  const icon =
    categoryKey === 'fasting' ? (resolveFastingCatalogIcon(rawIcon) ?? rawIcon) : rawIcon;
  const rawAccent =
    fromRaw.accentColor ??
    fromStored.accentColor ??
    fromLegacyWater.accentColor ??
    resolveBuiltinCategoryAccentColor(categoryKey);
  const accentColor =
    categoryKey === 'fasting'
      ? (resolveFastingCatalogAccentColor(rawAccent) ?? rawAccent)
      : categoryKey === 'healthIntake'
        ? (resolveHealthIntakeCatalogAccentColor(rawAccent) ?? rawAccent)
        : categoryKey === BUILTIN_STRETCHING_FLOW_ID &&
            (rawAccent == null || rawAccent.toLowerCase() === '#14b8a6')
          ? '#8b5cf6'
          : rawAccent;

  return { icon, accentColor };
}

/** 아이콘·색상만 갱신하고 카테고리별 설정 구조는 유지 */
export function mergeCategoryAppearanceIntoConfig(
  categoryKey: string,
  raw: unknown,
  appearance: { icon: CustomFlowIconOption; accentColor: CustomFlowAccentColorOption },
): unknown {
  const fromRaw = asConfigObj(raw);
  const fromStored =
    categoryKey === HEALTH_INTAKE_CATEGORY_KEY
      ? asConfigObj(readCategoryConfig(HEALTH_INTAKE_CATEGORY_KEY))
      : {};
  const base =
    categoryKey === HEALTH_INTAKE_CATEGORY_KEY ? { ...fromStored, ...fromRaw } : fromRaw;
  if (categoryKey === HEALTH_INTAKE_CATEGORY_KEY) {
    const storedName = readRoutineDisplayNameFromConfig(fromStored);
    const rawName = readRoutineDisplayNameFromConfig(fromRaw);
    if (storedName && !rawName) {
      base.displayName = storedName;
    }
  }
  const merged = {
    ...base,
    icon: appearance.icon,
    accentColor: appearance.accentColor,
  };
  if (categoryKey === 'other' || isCustomFlowCategoryKey(categoryKey)) {
    return normalizeOtherDetailConfig(merged);
  }
  if (categoryKey === 'healthIntake') {
    return normalizeHealthIntakeDetailConfig(merged);
  }
  return merged;
}
