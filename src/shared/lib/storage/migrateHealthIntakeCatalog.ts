import {
  HEALTH_INTAKE_CATEGORY_KEY,
  LEGACY_MEDICINE_CATEGORY_KEY,
  LEGACY_WATER_CATEGORY_KEY,
  mergeLegacyHealthIntakeFromParts,
  normalizeCatalogKeysAfterHealthIntakeMerge,
  normalizeHealthIntakeDetailConfig,
} from '@entities/day-plan/lib/healthIntakeDetailConfig';
import { BUILTIN_WATER_SET_ID } from './defaultFixedFlowSets';
import { loadDayPlanDraft, saveDayPlanDraft } from './dayPlanDraftStorage';
import { loadFixedFlowSetsState, saveFixedFlowSetsState } from './fixedFlowSetsStorage';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export const RETIRED_HEALTH_INTAKE_LEGACY_KEYS = new Set<string>([
  LEGACY_MEDICINE_CATEGORY_KEY,
]);

export function isRetiredHealthIntakeLegacyKey(key: string): boolean {
  return RETIRED_HEALTH_INTAKE_LEGACY_KEYS.has(key);
}

function mergeHealthIntakeGoalDetailConfig(): void {
  const existing = loadGoalDetailCategoryConfig(HEALTH_INTAKE_CATEGORY_KEY);
  if (existing != null) {
    saveGoalDetailCategoryConfig(
      HEALTH_INTAKE_CATEGORY_KEY,
      normalizeHealthIntakeDetailConfig(existing),
    );
    return;
  }
  const medicineRaw = loadGoalDetailCategoryConfig(LEGACY_MEDICINE_CATEGORY_KEY);
  const waterRaw = loadGoalDetailCategoryConfig(LEGACY_WATER_CATEGORY_KEY);
  if (medicineRaw == null && waterRaw == null) {
    return;
  }
  if (medicineRaw != null && waterRaw != null) {
    saveGoalDetailCategoryConfig(
      HEALTH_INTAKE_CATEGORY_KEY,
      mergeLegacyHealthIntakeFromParts(waterRaw, medicineRaw),
    );
    return;
  }
  if (medicineRaw != null) {
    saveGoalDetailCategoryConfig(
      HEALTH_INTAKE_CATEGORY_KEY,
      mergeLegacyHealthIntakeFromParts(null, medicineRaw),
    );
  }
}

function migrateDayPlanDraftKeys(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = normalizeCatalogKeysAfterHealthIntakeMerge(draft.priorityCategoryOrder);
  if (JSON.stringify(nextOrder) === JSON.stringify(draft.priorityCategoryOrder)) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function migrateFixedFlowSetKeys(): void {
  const state = loadFixedFlowSetsState();
  let changed = false;
  const sets = state.sets.map((set) => {
    if (set.id === BUILTIN_WATER_SET_ID) return set;
    const merged = normalizeCatalogKeysAfterHealthIntakeMerge(
      set.items.map((item) => item.categoryKey),
    );
    const items = merged.map((categoryKey) => {
      const prev = set.items.find(
        (item) =>
          item.categoryKey === categoryKey ||
          (categoryKey === HEALTH_INTAKE_CATEGORY_KEY &&
            isRetiredHealthIntakeLegacyKey(item.categoryKey)),
      );
      return { categoryKey, enabled: prev?.enabled ?? true, mealSlot: prev?.mealSlot };
    });
    if (JSON.stringify(items) !== JSON.stringify(set.items)) changed = true;
    return { ...set, items };
  });
  if (!changed) return;
  saveFixedFlowSetsState({ ...state, sets });
}

function migrateStandardCatalogGroupOverrides(): void {
  const raw =
    localStorageClient.getJson<{ overrides?: Record<string, string> }>(
      StorageKeys.standardCatalogGroupOverrides,
    ) ?? {};
  const overrides = { ...(raw.overrides ?? {}) };
  let changed = false;
  for (const legacy of RETIRED_HEALTH_INTAKE_LEGACY_KEYS) {
    if (legacy in overrides) {
      overrides[HEALTH_INTAKE_CATEGORY_KEY] =
        overrides[HEALTH_INTAKE_CATEGORY_KEY] ?? overrides[legacy]!;
      delete overrides[legacy];
      changed = true;
    }
  }
  if (!changed) return;
  localStorageClient.setJson(StorageKeys.standardCatalogGroupOverrides, { overrides });
}

function purgeLegacyHealthIntakeConfigs(): void {
  for (const key of RETIRED_HEALTH_INTAKE_LEGACY_KEYS) {
    removeGoalDetailCategoryConfig(key);
  }
}

function ensureHealthIntakeCommitted(): void {
  appendGoalDetailCommittedCategoryKeys([HEALTH_INTAKE_CATEGORY_KEY]);
}

/** water·medicine → healthIntake 통합 마이그레이션 */
export function migrateWaterMedicineToHealthIntake(): void {
  mergeHealthIntakeGoalDetailConfig();
  migrateDayPlanDraftKeys();
  migrateFixedFlowSetKeys();
  migrateStandardCatalogGroupOverrides();
  ensureHealthIntakeCommitted();
  purgeLegacyHealthIntakeConfigs();
}

export function purgeRetiredHealthIntakeFromDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = draft.priorityCategoryOrder.filter((key) => !isRetiredHealthIntakeLegacyKey(key));
  if (nextOrder.length === draft.priorityCategoryOrder.length) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

export function purgeRetiredHealthIntakeFromFixedFlowSets(): void {
  const state = loadFixedFlowSetsState();
  let changed = false;
  const sets = state.sets.map((set) => {
    if (set.id === BUILTIN_WATER_SET_ID) return set;
    const items = set.items.filter((item) => !isRetiredHealthIntakeLegacyKey(item.categoryKey));
    if (items.length !== set.items.length) changed = true;
    return { ...set, items };
  });
  if (!changed) return;
  saveFixedFlowSetsState({ ...state, sets });
}
