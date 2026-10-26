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
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_GOOD_POSTURE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS,
  RETIRED_DEFAULT_CUSTOM_FLOW_IDS,
  DEFAULT_BUILTIN_CUSTOM_GROUPS,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_FOCUS_FLOW_ID,
  isRetiredDailyLifeFlowId,
  RETIRED_DAILY_LIFE_FLOW_IDS,
  BUILTIN_HEALTH_GROUP_KEY,
  isRemovedBuiltinCustomFlowId,
  isRemovedBuiltinCustomGroupKey,
  LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_LABEL,
} from './defaultPriorityCatalog';
import { updateStandardCatalogGroup } from './catalogItemGroupStorage';
import { loadDayPlan, saveDayPlan } from './dayPlanStorage';
import { loadDayPlanDraft, saveDayPlanDraft } from './dayPlanDraftStorage';
import {
  loadRoutineCatalogSelectionKeys,
  saveRoutineCatalogSelectionKeys,
} from './priorityCatalogFixedRoutinesStorage';
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
import { loadRoutineStartTimes, saveRoutineStartTimes } from './routineStartTimesStorage';
import {
  loadScheduledRoutinePlan,
  saveScheduledRoutinePlan,
} from './scheduledRoutinePlanStorage';
import { loadCategoryReminderRules, saveCategoryReminderRules } from './settingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import { loadHiddenStandardCatalogKeys, restoreStandardCatalogKey } from './hiddenStandardCatalogStorage';
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
  const hasRetiredDaily = currentKeys.some((key) => isRetiredDailyLifeFlowId(key));
  if (!hasLegacy && hasAllDailyFlows && !hasRetiredDaily) return;

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
  // The defaults may currently be empty, but widen the tuple so loop items
  // retain their catalog group type instead of narrowing to `never`.
  const defaultGroups: readonly CustomCatalogGroup[] = DEFAULT_BUILTIN_CUSTOM_GROUPS;
  const byKey = new Map(cur.map((g) => [g.key, g]));
  let changed = false;

  for (const group of defaultGroups) {
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

  const builtinKeys = new Set<string>(defaultGroups.map((g) => g.key));
  const merged: CustomCatalogGroup[] = defaultGroups.map((g) => ({
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

function purgeRetiredDailyLifeFlows(): void {
  purgeCustomFlowIds([...RETIRED_DAILY_LIFE_FLOW_IDS]);

  const state = loadFixedFlowSetsState();
  let fixedChanged = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => !isRetiredDailyLifeFlowId(item.categoryKey));
    if (items.length !== set.items.length) fixedChanged = true;
    return { ...set, items };
  });
  if (fixedChanged) {
    saveFixedFlowSetsState({ ...state, sets });
  }

  const draft = loadDayPlanDraft();
  if (draft) {
    const nextOrder = draft.priorityCategoryOrder.filter((key) => !isRetiredDailyLifeFlowId(key));
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

/** 「오늘의 주인공 빠르게 둘러보기」와 그 그룹을 카탈로그·오늘 목록에서 뺀다. */
function purgePokitWeekTour(): void {
  purgeCustomFlowIds([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID]);
  removeCustomCatalogGroup(BUILTIN_TUTORIAL_GROUP_KEY);

  const selection = loadRoutineCatalogSelectionKeys().filter((key) => key !== BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
  if (selection.length !== loadRoutineCatalogSelectionKeys().length) {
    saveRoutineCatalogSelectionKeys(selection);
  }

  const state = loadFixedFlowSetsState();
  let fixedChanged = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => item.categoryKey !== BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
    if (items.length !== set.items.length) fixedChanged = true;
    return { ...set, items };
  });
  if (fixedChanged) saveFixedFlowSetsState({ ...state, sets });

  const draft = loadDayPlanDraft();
  if (!draft) return;
  const strip = (keys: string[] | undefined) =>
    (keys ?? []).filter((key) => key !== BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
  const priorityCategoryOrder = strip(draft.priorityCategoryOrder);
  const prioritySectionsCategoryOrder = strip(draft.prioritySectionsCategoryOrder);
  const completedFocusCategoryKeys = strip(draft.completedFocusCategoryKeys);
  if (
    priorityCategoryOrder.length === draft.priorityCategoryOrder.length &&
    prioritySectionsCategoryOrder.length === (draft.prioritySectionsCategoryOrder ?? []).length &&
    completedFocusCategoryKeys.length === (draft.completedFocusCategoryKeys ?? []).length
  ) {
    return;
  }
  saveDayPlanDraft({
    ...draft,
    priorityCategoryOrder,
    prioritySectionsCategoryOrder,
    completedFocusCategoryKeys,
  });
}

function purgeFocusFlow(): void {
  purgeCustomFlowIds([BUILTIN_FOCUS_FLOW_ID]);

  const state = loadFixedFlowSetsState();
  let fixedChanged = false;
  const sets = state.sets.map((set) => {
    const items = set.items.filter((item) => item.categoryKey !== BUILTIN_FOCUS_FLOW_ID);
    if (items.length !== set.items.length) fixedChanged = true;
    return { ...set, items };
  });
  if (fixedChanged) {
    saveFixedFlowSetsState({ ...state, sets });
  }

  const draft = loadDayPlanDraft();
  if (draft) {
    const nextOrder = draft.priorityCategoryOrder.filter((key) => key !== BUILTIN_FOCUS_FLOW_ID);
    if (nextOrder.length !== draft.priorityCategoryOrder.length) {
      saveDayPlanDraft({ ...draft, priorityCategoryOrder: nextOrder });
    }
  }
}

function isReminderTemplateConfig(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.templateKey === 'reminder') return true;
  return Array.isArray(o.reminderItems) || Array.isArray(o.reminderTimes);
}

/** 시간 알림 템플릿 — 신규·기존 루틴·알림·담기에서 모두 제거 */
function purgeReminderTemplateCustomFlows(): void {
  const reminderIds = [
    ...new Set([
      ...listGoalDetailCategoryConfigKeys().filter((key) =>
        isReminderTemplateConfig(loadGoalDetailCategoryConfig(key)),
      ),
      ...listCustomFlowCatalogEntries()
        .map((entry) => entry.id)
        .filter((id) => isReminderTemplateConfig(loadGoalDetailCategoryConfig(id))),
    ]),
  ];

  if (reminderIds.length > 0) {
    const idSet = new Set(reminderIds);
    purgeCustomFlowIds(reminderIds);

    const selection = loadRoutineCatalogSelectionKeys().filter((key) => !idSet.has(key));
    if (selection.length !== loadRoutineCatalogSelectionKeys().length) {
      saveRoutineCatalogSelectionKeys(selection);
    }

    const state = loadFixedFlowSetsState();
    let fixedChanged = false;
    const sets = state.sets.map((set) => {
      const items = set.items.filter((item) => !idSet.has(item.categoryKey));
      if (items.length !== set.items.length) fixedChanged = true;
      return { ...set, items };
    });
    if (fixedChanged) saveFixedFlowSetsState({ ...state, sets });

    const draft = loadDayPlanDraft();
    if (draft) {
      const strip = (keys: string[] | undefined) => (keys ?? []).filter((key) => !idSet.has(key));
      const priorityCategoryOrder = strip(draft.priorityCategoryOrder);
      const prioritySectionsCategoryOrder = strip(draft.prioritySectionsCategoryOrder);
      const completedFocusCategoryKeys = strip(draft.completedFocusCategoryKeys);
      if (
        priorityCategoryOrder.length !== draft.priorityCategoryOrder.length ||
        prioritySectionsCategoryOrder.length !== (draft.prioritySectionsCategoryOrder ?? []).length ||
        completedFocusCategoryKeys.length !== (draft.completedFocusCategoryKeys ?? []).length
      ) {
        saveDayPlanDraft({
          ...draft,
          priorityCategoryOrder,
          prioritySectionsCategoryOrder,
          completedFocusCategoryKeys,
        });
      }
    }

    const plan = loadDayPlan<{ id?: string; categoryKey?: string }>();
    if (plan?.blocks?.length) {
      const nextBlocks = plan.blocks.filter((block) => {
        const key = typeof block.categoryKey === 'string' ? block.categoryKey.trim() : '';
        return !key || !idSet.has(key);
      });
      if (nextBlocks.length !== plan.blocks.length) {
        const removedIds = new Set(
          plan.blocks
            .filter((block) => {
              const key = typeof block.categoryKey === 'string' ? block.categoryKey.trim() : '';
              return key && idSet.has(key);
            })
            .map((block) => block.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        );
        saveDayPlan({
          ...plan,
          blocks: nextBlocks,
          completedBlockIds: (plan.completedBlockIds ?? []).filter((id) => !removedIds.has(id)),
          skippedBlockIds: (plan.skippedBlockIds ?? []).filter((id) => !removedIds.has(id)),
        });
      }
    }

    const startTimes = loadRoutineStartTimes();
    let startChanged = false;
    const byCategoryKey = { ...startTimes.byCategoryKey };
    for (const id of reminderIds) {
      if (id in byCategoryKey) {
        delete byCategoryKey[id];
        startChanged = true;
      }
    }
    if (startChanged) saveRoutineStartTimes({ byCategoryKey });

    const scheduled = loadScheduledRoutinePlan();
    let scheduledChanged = false;
    const assignmentsByDate = { ...scheduled.assignmentsByDate };
    for (const [dateKey, row] of Object.entries(assignmentsByDate)) {
      const nextKeys = row.categoryKeys.filter((key) => !idSet.has(key));
      if (nextKeys.length === row.categoryKeys.length) continue;
      scheduledChanged = true;
      if (nextKeys.length === 0) delete assignmentsByDate[dateKey];
      else assignmentsByDate[dateKey] = { categoryKeys: nextKeys };
    }
    if (scheduledChanged) saveScheduledRoutinePlan({ assignmentsByDate });
  }

  // OS 알림 규칙도 전부 끔 (템플릿 잔여 규칙 포함)
  const rules = loadCategoryReminderRules();
  if (Object.keys(rules).length > 0) saveCategoryReminderRules({});
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

/** 운동하기 → 주말 러닝 (주말 고정 루틴과 명칭 맞춤) */
const LEGACY_EXERCISE_DISPLAY_NAMES = new Set(['운동하기', 'Exercise', '運動']);
const LEGACY_EXERCISE_CHECKLIST_TEXTS = new Set(['운동하기', 'Exercise', '運動']);

function migrateExerciseDisplayNameToWeekendRun(): void {
  const flowDef = [...DEFAULT_BUILTIN_CUSTOM_FLOWS, ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS].find((flow) => flow.id === BUILTIN_DAILY_EXERCISE_FLOW_ID);
  if (!flowDef) return;
  const cfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_EXERCISE_FLOW_ID);
  if (!cfg || typeof cfg !== 'object') return;
  const row = cfg as Record<string, unknown>;
  const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
  const checklist = Array.isArray(row.checklist)
    ? (row.checklist as Array<{ id?: unknown; text?: unknown; done?: unknown }>)
    : [];
  const shouldRenameTitle = LEGACY_EXERCISE_DISPLAY_NAMES.has(displayName);
  const nextChecklist = checklist.map((item, index) => {
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!LEGACY_EXERCISE_CHECKLIST_TEXTS.has(text)) return item;
    const label = flowDef.checklistLabels?.[index] ?? flowDef.checklistLabels?.[0] ?? flowDef.displayName;
    return { ...item, text: label };
  });
  const checklistChanged = nextChecklist.some((item, index) => item !== checklist[index]);
  if (!shouldRenameTitle && !checklistChanged) return;
  saveGoalDetailCategoryConfig(BUILTIN_DAILY_EXERCISE_FLOW_ID, {
    ...row,
    ...(shouldRenameTitle
      ? { displayName: flowDef.displayName, summary: flowDef.summary ?? row.summary }
      : {}),
    ...(checklistChanged ? { checklist: nextChecklist } : {}),
  });
}

function migrateDailyWashIcon(): void {
  const flowId = 'customFlow:preset_daily_wash';
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
  if (icon != null && icon !== 'person.fill' && icon !== 'scalemass.fill') return;
  saveGoalDetailCategoryConfig('fasting', {
    ...(cfg as Record<string, unknown>),
    icon: 'figure.stand',
  });
}

function migrateHabitPresetFlowsToChecklist(): void {
  const presetFlowIds = [...BUILTIN_DAILY_LIFE_FLOW_IDS, BUILTIN_STRETCHING_FLOW_ID];
  for (const flowId of presetFlowIds) {
    const flowDef = [...DEFAULT_BUILTIN_CUSTOM_FLOWS, ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS].find((flow) => flow.id === flowId);
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
  const hiddenIds = new Set(loadHiddenStandardCatalogKeys());

  for (const flow of DEFAULT_BUILTIN_CUSTOM_FLOWS) {
    if (hiddenIds.has(flow.id)) continue;
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
    appendGoalDetailCommittedCategoryKeys(
      DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => f.id).filter((id) => !hiddenIds.has(id)),
    );
  }
}

/** 기본 담기 카탈로그 정리 — 레거시 시드·빌트인 customFlow 제거, 신규 기본값 병합 */
export function ensureDefaultPriorityCatalog(): void {
  for (const key of ['healthIntake', 'reading', 'fasting']) restoreStandardCatalogKey(key);
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
  migrateExerciseDisplayNameToWeekendRun();
  migrateHabitPresetFlowsToChecklist();
  purgeIntermittentFastingFlow();
  purgeGoodPostureFlow();
  purgeFocusFlow();
  purgeRetiredDailyLifeFlows();
  purgeReminderTemplateCustomFlows();
  // Retire catalog entries only: keep existing plans, progress and user detail settings.
  for (const id of RETIRED_DEFAULT_CUSTOM_FLOW_IDS) removeCustomFlowCatalogId(id);
  mergeDefaultCustomFlows();
  migrateTutorialGroupLabel();
  purgePokitWeekTour();
}
