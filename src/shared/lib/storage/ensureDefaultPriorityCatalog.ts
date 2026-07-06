import {
  type CustomCatalogGroup,
  listCustomCatalogGroups,
  removeCustomCatalogGroup,
} from './customCatalogGroupStorage';
import {
  appendCustomFlowCatalogEntry,
  listCustomFlowCatalogEntries,
  removeCustomFlowCatalogId,
  updateCustomFlowCatalogGroup,
} from './customFlowCatalogStorage';
import {
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_GOOD_POSTURE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  DEFAULT_BUILTIN_CUSTOM_GROUPS,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_HEALTH_GROUP_KEY,
  isRemovedBuiltinCustomFlowId,
  isRemovedBuiltinCustomGroupKey,
  LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
} from './defaultPriorityCatalog';
import { updateStandardCatalogGroup } from './catalogItemGroupStorage';
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
import { getInitialWaterDataConfig } from '@entities/day-plan/lib/goalCategorySessionConfig';
import { normalizeCustomFlowIcon } from '../customFlowAppearanceCatalog';

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

function purgeLegacyBundledDailyLifeFlow(): void {
  purgeCustomFlowIds([LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID]);
}

function purgeLegacyBundledDailyLifeFromFixedFlowSets(): void {
  const state = loadFixedFlowSetsState();
  let changed = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => item.categoryKey !== LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID);
    if (items.length !== set.items.length) changed = true;
    return { ...set, items };
  });
  if (!changed) return;
  saveFixedFlowSetsState({ ...state, sets });
}

function migrateDailyLifeFixedFlowSetItems(): void {
  const state = loadFixedFlowSetsState();
  const dailyLifeSet = state.sets.find((set) => set.id === 'set_daily_life');
  if (!dailyLifeSet) return;

  const hasLegacy = dailyLifeSet.items.some(
    (item) => item.categoryKey === LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
  );
  const currentKeys = dailyLifeSet.items.map((item) => item.categoryKey);
  const hasAllDailyFlows = BUILTIN_DAILY_LIFE_FLOW_IDS.every((id) => currentKeys.includes(id));
  if (!hasLegacy && hasAllDailyFlows) return;

  const sets = state.sets.map((set) => {
    if (set.id !== 'set_daily_life') return set;
    return {
      ...set,
      name: '일상 루틴',
      items: BUILTIN_DAILY_LIFE_FLOW_IDS.map((categoryKey) => ({ categoryKey, enabled: true })),
    };
  });
  saveFixedFlowSetsState({ ...state, sets });
}

function migrateLegacyBundledDailyLifeInDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const order = draft.priorityCategoryOrder;
  const legacyIndex = order.indexOf(LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID);
  if (legacyIndex < 0) return;
  const nextOrder = [...order];
  nextOrder.splice(legacyIndex, 1, ...BUILTIN_DAILY_LIFE_FLOW_IDS);
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function purgeLegacyBundledDailyLifeFromDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = draft.priorityCategoryOrder.filter(
    (key) => key !== LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
  );
  if (nextOrder.length === draft.priorityCategoryOrder.length) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function purgeRemovedBuiltinFromDayPlanDraft(): void {
  const draft = loadDayPlanDraft();
  if (!draft) return;
  const nextOrder = draft.priorityCategoryOrder.filter((key) => !isRemovedBuiltinCustomFlowId(key));
  if (nextOrder.length === draft.priorityCategoryOrder.length) return;
  saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
}

function unifyHealthCatalogGroups(): void {
  for (const entry of listCustomFlowCatalogEntries()) {
    if (entry.groupKey === BUILTIN_HEALTH_GROUP_KEY) {
      updateCustomFlowCatalogGroup(entry.id, 'health');
    }
  }
  updateStandardCatalogGroup('water', 'health');
  updateStandardCatalogGroup('fasting', 'health');
  removeCustomCatalogGroup(BUILTIN_HEALTH_GROUP_KEY);
}

function seedStandaloneWaterGoalDetail(): void {
  if (loadGoalDetailCategoryConfig('water') != null) return;
  saveGoalDetailCategoryConfig('water', getInitialWaterDataConfig());
  appendGoalDetailCommittedCategoryKeys(['water']);
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

function purgeIntermittentFastingFlow(): void {
  purgeCustomFlowIds([BUILTIN_INTERMITTENT_FASTING_FLOW_ID]);

  const state = loadFixedFlowSetsState();
  let fixedChanged = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => item.categoryKey !== BUILTIN_INTERMITTENT_FASTING_FLOW_ID);
    if (items.length !== set.items.length) fixedChanged = true;
    return { ...set, items };
  });
  if (fixedChanged) {
    saveFixedFlowSetsState({ ...state, sets });
  }

  const draft = loadDayPlanDraft();
  if (draft) {
    const nextOrder = draft.priorityCategoryOrder.filter(
      (key) => key !== BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
    );
    if (nextOrder.length !== draft.priorityCategoryOrder.length) {
      saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
    }
  }
}

function purgeGoodPostureFlow(): void {
  purgeCustomFlowIds([BUILTIN_GOOD_POSTURE_FLOW_ID]);

  const state = loadFixedFlowSetsState();
  let fixedChanged = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => item.categoryKey !== BUILTIN_GOOD_POSTURE_FLOW_ID);
    if (items.length !== set.items.length) fixedChanged = true;
    return { ...set, items };
  });
  if (fixedChanged) {
    saveFixedFlowSetsState({ ...state, sets });
  }

  const draft = loadDayPlanDraft();
  if (draft) {
    const nextOrder = draft.priorityCategoryOrder.filter(
      (key) => key !== BUILTIN_GOOD_POSTURE_FLOW_ID,
    );
    if (nextOrder.length !== draft.priorityCategoryOrder.length) {
      saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
    }
  }
}

function buildBuiltinChecklist(flowId: string, labels: readonly string[]) {
  return labels.map((text, index) => ({
    id: `${flowId}_item_${index}`,
    text,
    done: false,
  }));
}

function migrateAbstainDisplayName(): void {
  const cfg = loadGoalDetailCategoryConfig(BUILTIN_ABSTAIN_FLOW_ID);
  if (!cfg) return;
  const displayName =
    typeof (cfg as { displayName?: unknown }).displayName === 'string'
      ? (cfg as { displayName: string }).displayName.trim()
      : '';
  if (displayName !== '기본 금지 루틴') return;
  saveGoalDetailCategoryConfig(BUILTIN_ABSTAIN_FLOW_ID, {
    ...(cfg as Record<string, unknown>),
    displayName: '금지',
  });
}

function migrateDailyWashIcon(): void {
  const flowId = BUILTIN_DAILY_LIFE_FLOW_IDS[3];
  const cfg = loadGoalDetailCategoryConfig(flowId);
  if (!cfg) return;
  const icon = normalizeCustomFlowIcon((cfg as { icon?: unknown }).icon);
  if (icon !== 'drop.fill') return;
  saveGoalDetailCategoryConfig(flowId, {
    ...(cfg as Record<string, unknown>),
    icon: 'hands.sparkles.fill',
  });
}

function migrateFastingBuiltinIcon(): void {
  const cfg = loadGoalDetailCategoryConfig('fasting');
  if (!cfg) return;
  const icon = normalizeCustomFlowIcon((cfg as { icon?: unknown }).icon);
  if (icon != null && icon !== 'figure.stand' && icon !== 'scalemass.fill') return;
  saveGoalDetailCategoryConfig('fasting', {
    ...(cfg as Record<string, unknown>),
    icon: 'person.fill',
  });
}

function mergeDefaultCustomFlows(): void {
  const curIds = new Set(listCustomFlowCatalogEntries().map((e) => e.id));

  for (const flow of DEFAULT_BUILTIN_CUSTOM_FLOWS) {
    if (!curIds.has(flow.id)) {
      appendCustomFlowCatalogEntry({ id: flow.id, groupKey: flow.groupKey });
    }
    if (loadGoalDetailCategoryConfig(flow.id) == null) {
      const baseConfig: Record<string, unknown> = {
        displayName: flow.displayName,
        summary: flow.summary ?? '',
        icon: flow.icon,
        accentColor: flow.color,
        ...(flow.templateKey ? { templateKey: flow.templateKey } : {}),
      };
      if (flow.checklistLabels != null) {
        baseConfig.checklist = buildBuiltinChecklist(flow.id, flow.checklistLabels);
      } else if (flow.templateKey === 'reminder') {
        baseConfig.reminderTimes = [...(flow.reminderTimes ?? ['09:00'])];
        baseConfig.completedTimes = [];
      } else if (flow.templateKey !== 'habit') {
        baseConfig.checklist = [];
      }
      saveGoalDetailCategoryConfig(flow.id, baseConfig);
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
  purgeLegacyBundledDailyLifeFlow();
  purgeRetiredStandardCatalogKeys();
  purgeLegacyDevSeedCustomGroups();
  purgeRemovedBuiltinCustomGroups();
  purgeRemovedBuiltinFromFixedFlowSets();
  purgeRemovedBuiltinFromDayPlanDraft();
  purgeLegacyBundledDailyLifeFromFixedFlowSets();
  migrateLegacyBundledDailyLifeInDayPlanDraft();
  purgeLegacyBundledDailyLifeFromDayPlanDraft();
  purgeRetiredStandardFromFixedFlowSets();
  purgeRetiredStandardFromDayPlanDraft();
  purgeRetiredHealthIntakeFromFixedFlowSets();
  purgeRetiredHealthIntakeFromDayPlanDraft();
  migrateDailyLifeFixedFlowSetItems();
  mergeDefaultCustomGroups();
  unifyHealthCatalogGroups();
  seedStandaloneWaterGoalDetail();
  migrateDailyWashIcon();
  migrateFastingBuiltinIcon();
  migrateAbstainDisplayName();
  purgeIntermittentFastingFlow();
  purgeGoodPostureFlow();
  mergeDefaultCustomFlows();
}
