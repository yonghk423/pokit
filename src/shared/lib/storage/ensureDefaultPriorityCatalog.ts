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
} from './defaultPriorityCatalog';
import {
  appendGoalDetailCommittedCategoryKeys,
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const LEGACY_DEV_SEED_FLOW_ID = /^customFlow:seed/i;
const LEGACY_DEV_SEED_GROUP_KEY = /^customGroup:seed/i;

function isLegacyDevSeedCustomFlowId(id: string): boolean {
  return LEGACY_DEV_SEED_FLOW_ID.test(id);
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
  if (legacyIds.length === 0) return;

  for (const id of legacyIds) {
    removeCustomFlowCatalogId(id);
  }

  const root =
    localStorageClient.getJson<{ byCategory?: Record<string, unknown>; committedCategoryKeys?: string[] }>(
      StorageKeys.goalDetailSettings,
    ) ?? {};
  const byCategory = { ...(root.byCategory ?? {}) };
  const legacySet = new Set(legacyIds);
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

function purgeLegacyDevSeedCustomGroups(): void {
  const cur = listCustomCatalogGroups();
  const next = cur.filter((group) => !LEGACY_DEV_SEED_GROUP_KEY.test(group.key));
  if (next.length === cur.length) return;
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups: next });
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

  appendGoalDetailCommittedCategoryKeys(DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => f.id));
}

/** 기본 담기 카탈로그(3개 그룹·15개 플로우)가 없으면 병합해 둔다. */
export function ensureDefaultPriorityCatalog(): void {
  purgeLegacyDevSeedCustomFlows();
  purgeLegacyDevSeedCustomGroups();
  mergeDefaultCustomGroups();
  mergeDefaultCustomFlows();
}
