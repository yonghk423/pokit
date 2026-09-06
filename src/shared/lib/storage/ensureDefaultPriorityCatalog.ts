import {
  type CustomCatalogGroup,
  listCustomCatalogGroups,
  removeCustomCatalogGroup,
  updateCustomCatalogGroup,
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
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  DEFAULT_BUILTIN_CUSTOM_GROUPS,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_FOCUS_FLOW_ID,
  BUILTIN_HEALTH_GROUP_KEY,
  isRemovedBuiltinCustomFlowId,
  isRemovedBuiltinCustomGroupKey,
  LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
  POKIT_WEEK_TOUR_CHECKLIST_LABELS,
  POKIT_WEEK_TOUR_DISPLAY_NAME,
  BUILTIN_TUTORIAL_GROUP_LABEL,
  POKIT_WEEK_TOUR_SUMMARY,
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

function mergeDefaultCustomGroups(): void {
  const cur = listCustomCatalogGroups();
  const byKey = new Map(cur.map((g) => [g.key, g]));
  let changed = false;

  for (const group of DEFAULT_BUILTIN_CUSTOM_GROUPS) {
    const existing = byKey.get(group.key);
    if (!existing) {
      byKey.set(group.key, { key: group.key, label: group.label });
      changed = true;
      continue;
    }
    // 튜토리얼 그룹 라벨은 제품 카피로 고정 동기화
    if (
      group.key === BUILTIN_TUTORIAL_GROUP_KEY &&
      existing.label !== BUILTIN_TUTORIAL_GROUP_LABEL
    ) {
      byKey.set(group.key, { ...existing, label: BUILTIN_TUTORIAL_GROUP_LABEL });
      changed = true;
    }
  }
  if (!changed) return;

  const builtinKeys = new Set(DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => g.key));
  const merged: CustomCatalogGroup[] = DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => ({
    key: g.key,
    label: byKey.get(g.key)?.label ?? g.label,
    subtitle: byKey.get(g.key)?.subtitle,
  }));
  for (const group of cur) {
    if (!builtinKeys.has(group.key)) merged.push(group);
  }
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups: merged });
}

/** 기존 「시작하기」그룹 라벨 → 「포킷 사용해보기」 */
function migrateTutorialGroupLabel(): void {
  const groups = listCustomCatalogGroups();
  const tutorial = groups.find((g) => g.key === BUILTIN_TUTORIAL_GROUP_KEY);
  if (!tutorial) return;
  if (tutorial.label === BUILTIN_TUTORIAL_GROUP_LABEL) return;
  updateCustomCatalogGroup(BUILTIN_TUTORIAL_GROUP_KEY, {
    label: BUILTIN_TUTORIAL_GROUP_LABEL,
    subtitle: tutorial.subtitle,
  });
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

/** 「포킷 일주일」일별 투어 → 하루 안에 끝내는 빠른 둘러보기로 갱신 */
function migratePokitWeekTourToQuickTour(): void {
  const cfg = loadGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
  if (!cfg || typeof cfg !== 'object') return;
  const displayName =
    typeof (cfg as { displayName?: unknown }).displayName === 'string'
      ? (cfg as { displayName: string }).displayName.trim()
      : '';
  const checklist = Array.isArray((cfg as { checklist?: unknown }).checklist)
    ? ((cfg as { checklist: Array<{ text?: unknown; done?: unknown }> }).checklist ?? [])
    : [];
  const looksLegacyWeek =
    displayName === '포킷 일주일 사용해보기' ||
    checklist.some((item) => typeof item.text === 'string' && /\d+\s*일차/.test(item.text));
  const alreadyQuick =
    displayName === POKIT_WEEK_TOUR_DISPLAY_NAME &&
    checklist.length === POKIT_WEEK_TOUR_CHECKLIST_LABELS.length &&
    checklist.every(
      (item, i) => typeof item.text === 'string' && item.text === POKIT_WEEK_TOUR_CHECKLIST_LABELS[i],
    );
  if (!looksLegacyWeek && alreadyQuick) return;

  const doneByIndex = checklist.map((item) => item?.done === true);
  const nextChecklist = buildBuiltinChecklist(
    BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    POKIT_WEEK_TOUR_CHECKLIST_LABELS,
  ).map((item, index) => ({
    ...item,
    done: Boolean(doneByIndex[index]),
  }));
  saveGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID, {
    ...(cfg as Record<string, unknown>),
    displayName: POKIT_WEEK_TOUR_DISPLAY_NAME,
    summary: POKIT_WEEK_TOUR_SUMMARY,
    templateKey: 'checklist',
    checklist: nextChecklist,
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

function migrateHabitPresetFlowsToChecklist(): void {
  const presetFlowIds = [...BUILTIN_DAILY_LIFE_FLOW_IDS, BUILTIN_STRETCHING_FLOW_ID, BUILTIN_FOCUS_FLOW_ID];
  for (const flowId of presetFlowIds) {
    const flowDef = DEFAULT_BUILTIN_CUSTOM_FLOWS.find((flow) => flow.id === flowId);
    const cfg = loadGoalDetailCategoryConfig(flowId);
    if (!cfg || typeof cfg !== 'object') continue;
    const row = cfg as Record<string, unknown>;
    if (row.templateKey !== 'habit') continue;

    const displayName =
      typeof row.displayName === 'string' && row.displayName.trim().length > 0
        ? row.displayName.trim()
        : flowDef?.displayName ?? '루틴';
    const checklistLabel = flowDef?.checklistLabels?.[0] ?? displayName;
    const doneToday = row.doneToday === true;

    const {
      doneToday: _doneToday,
      streakDays: _streakDays,
      lastDoneDateKey: _lastDoneDateKey,
      recentDoneDateKeys: _recentDoneDateKeys,
      ...rest
    } = row;

    saveGoalDetailCategoryConfig(flowId, {
      ...rest,
      templateKey: 'checklist',
      displayName,
      checklist: buildBuiltinChecklist(flowId, [checklistLabel]).map((item) => ({
        ...item,
        done: doneToday,
      })),
    });
  }
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
      } else {
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
  migrateDailyWashIcon();
  migrateFastingBuiltinIcon();
  migrateAbstainDisplayName();
  migrateHabitPresetFlowsToChecklist();
  purgeIntermittentFastingFlow();
  purgeGoodPostureFlow();
  mergeDefaultCustomFlows();
  migratePokitWeekTourToQuickTour();
  migrateTutorialGroupLabel();
}
