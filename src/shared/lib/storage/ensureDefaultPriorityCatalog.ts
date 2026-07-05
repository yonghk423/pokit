import {
  type CustomCatalogGroup,
  listCustomCatalogGroups,
} from './customCatalogGroupStorage';
import {
  appendCustomFlowCatalogEntry,
  listCustomFlowCatalogEntries,
  removeCustomFlowCatalogId,
} from './customFlowCatalogStorage';
import {
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  DEFAULT_BUILTIN_CUSTOM_GROUPS,
  isRemovedBuiltinCustomFlowId,
  isRemovedBuiltinCustomGroupKey,
} from './defaultPriorityCatalog';
import { loadDayPlanDraft, saveDayPlanDraft } from './dayPlanDraftStorage';
import {
  appendGoalDetailCommittedCategoryKeys,
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';
import { loadFixedFlowSetsState, saveFixedFlowSetsState } from './fixedFlowSetsStorage';
import {
  migrateWaterMedicineToHealthIntake,
  purgeRetiredHealthIntakeFromDayPlanDraft,
  purgeRetiredHealthIntakeFromFixedFlowSets,
} from './migrateHealthIntakeCatalog';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

/** 제거된 표준 카탈로그 키 — 기존 저장 데이터 마이그레이션용 */
const RETIRED_STANDARD_CATALOG_KEYS = new Set<string>(['meditation']);

const LEGACY_DEV_SEED_FLOW_ID = /^customFlow:seed/i;
const LEGACY_DEV_SEED_GROUP_KEY = /^customGroup:seed/i;

function isLegacyDevSeedCustomFlowId(id: string): boolean {
  return LEGACY_DEV_SEED_FLOW_ID.test(id);
}

function purgeCustomFlowIds(ids: string[]): void {
  if (ids.length === 0) return;

  for (const id of ids) {
    removeCustomFlowCatalogId(id);
  }

  const root =
    localStorageClient.getJson<{ byCategory?: Record<string, unknown>; committedCategoryKeys?: string[] }>(
      StorageKeys.goalDetailSettings,
    ) ?? {};
  const byCategory = { ...(root.byCategory ?? {}) };
  const legacySet = new Set(ids);
  for (const id of legacySet) {
    delete byCategory[id];
  }
  const committedCategoryKeys = (root.committedCategoryKeys ?? []).filter((key) => !legacySet.has(key));
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    ...root,
    byCategory,
    committedCategoryKeys,
  });
}

/** 예전 Dev Menu catalog seed(`customFlow:seed…`) 잔여 데이터 제거 */
function purgeLegacyDevSeedCustomFlows(): void {
  const legacyIds = [
    ...new Set([
      ...listCustomFlowCatalogEntries()
        .map((entry) => entry.id)
        .filter(isLegacyDevSeedCustomFlowId),
      ...listGoalDetailCategoryConfigKeys().filter(isLegacyDevSeedCustomFlowId),
    ]),
  ];
  purgeCustomFlowIds(legacyIds);
}

/** 상세설정 없이 시드되던 빌트인 customFlow(`customFlow:builtin_*`) 제거 */
function purgeRemovedBuiltinCustomFlows(): void {
  const legacyIds = [
    ...new Set([
      ...listCustomFlowCatalogEntries()
        .map((entry) => entry.id)
        .filter(isRemovedBuiltinCustomFlowId),
      ...listGoalDetailCategoryConfigKeys().filter(isRemovedBuiltinCustomFlowId),
    ]),
  ];
  purgeCustomFlowIds(legacyIds);
}

function isRetiredStandardCatalogKey(key: string): boolean {
  return RETIRED_STANDARD_CATALOG_KEYS.has(key);
}

function purgeRetiredStandardCatalogKeys(): void {
  for (const key of RETIRED_STANDARD_CATALOG_KEYS) {
    removeGoalDetailCategoryConfig(key);
  }
}

function purgeRetiredStandardFromFixedFlowSets(): void {
  const state = loadFixedFlowSetsState();
  let changed = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => !isRetiredStandardCatalogKey(item.categoryKey));
    if (items.length !== set.items.length) changed = true;
    return { ...set, items };
  });
  if (!changed) return;
  saveFixedFlowSetsState({ ...state, sets });
}

function purgeRetiredStandardFromDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = draft.priorityCategoryOrder.filter((key) => !isRetiredStandardCatalogKey(key));
  if (nextOrder.length === draft.priorityCategoryOrder.length) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function purgeLegacyDevSeedCustomGroups(): void {
  const cur = listCustomCatalogGroups();
  const next = cur.filter((group) => !LEGACY_DEV_SEED_GROUP_KEY.test(group.key));
  if (next.length === cur.length) return;
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups: next });
}

function purgeRemovedBuiltinCustomGroups(): void {
  const cur = listCustomCatalogGroups();
  const next = cur.filter((group) => !isRemovedBuiltinCustomGroupKey(group.key));
  if (next.length === cur.length) return;
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups: next });
}

function purgeRemovedBuiltinFromFixedFlowSets(): void {
  const state = loadFixedFlowSetsState();
  let changed = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => !isRemovedBuiltinCustomFlowId(item.categoryKey));
    if (items.length !== set.items.length) changed = true;
    return { ...set, items };
  });
  if (!changed) return;
  saveFixedFlowSetsState({ ...state, sets });
}

function purgeRemovedBuiltinFromDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = draft.priorityCategoryOrder.filter((key) => !isRemovedBuiltinCustomFlowId(key));
  if (nextOrder.length === draft.priorityCategoryOrder.length) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function mergeDefaultCustomGroups(): void {
  const cur = listCustomCatalogGroups();
  const byKey = new Map(cur.map((g) => [g.key, g]));
  let changed = false;

  for (const group of DEFAULT_BUILTIN_CUSTOM_GROUPS) {
    if (!byKey.has(group.key)) {
      byKey.set(group.key, { key: group.key, label: group.label });
      changed = true;
    }
  }
  if (!changed) return;

  const builtinKeys = new Set(DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => g.key));
  const merged: CustomCatalogGroup[] = DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => ({
    key: g.key,
    label: byKey.get(g.key)?.label ?? g.label,
  }));
  for (const group of cur) {
    if (!builtinKeys.has(group.key)) merged.push(group);
  }
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups: merged });
}

function mergeDefaultCustomFlows(): void {
  const curIds = new Set(listCustomFlowCatalogEntries().map((e) => e.id));

  for (const flow of DEFAULT_BUILTIN_CUSTOM_FLOWS) {
    if (!curIds.has(flow.id)) {
      appendCustomFlowCatalogEntry({ id: flow.id, groupKey: flow.groupKey });
    }
    if (loadGoalDetailCategoryConfig(flow.id) == null) {
      saveGoalDetailCategoryConfig(flow.id, {
        displayName: flow.displayName,
        checklist: [],
      });
    }
  }

  if (DEFAULT_BUILTIN_CUSTOM_FLOWS.length > 0) {
    appendGoalDetailCommittedCategoryKeys(DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => f.id));
  }
}

/** 기본 담기 카탈로그 정리 — 레거시 시드·빌트인 customFlow 제거, 신규 기본값 병합 */
export function ensureDefaultPriorityCatalog(): void {
  migrateWaterMedicineToHealthIntake();
  purgeLegacyDevSeedCustomFlows();
  purgeRemovedBuiltinCustomFlows();
  purgeRetiredStandardCatalogKeys();
  purgeLegacyDevSeedCustomGroups();
  purgeRemovedBuiltinCustomGroups();
  purgeRemovedBuiltinFromFixedFlowSets();
  purgeRemovedBuiltinFromDayPlanDraft();
  purgeRetiredStandardFromFixedFlowSets();
  purgeRetiredStandardFromDayPlanDraft();
  purgeRetiredHealthIntakeFromFixedFlowSets();
  purgeRetiredHealthIntakeFromDayPlanDraft();
  mergeDefaultCustomGroups();
  mergeDefaultCustomFlows();
}
