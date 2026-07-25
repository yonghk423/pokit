import { create } from 'zustand';

import {
  BUILTIN_FIXED_FLOW_SET_IDS,
  createExampleCustomFlowSetItems,
  EXAMPLE_CUSTOM_FLOW_SET_NAME,
  getActiveFixedFlowSet,
  isBuiltinExampleCustomFlowSet,
  isBuiltinPresetScheduleSet,
  loadFixedFlowSetsState,
  normalizeDayMealSlot,
  buildFixedFlowItemMealSlotsFields,
  toggleFixedFlowItemMealSlots,
  saveFixedFlowSetsState,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
  type FixedRoutineActiveMealSlotsByLayoutMode,
  type FixedRoutineActiveSetIdsByLayoutMode,
  type FixedRoutineApplyLayoutMode,
} from '@shared/lib/storage';

import { isPriorityCatalogAllowedKey } from '../lib/priorityCatalogRegistry';
import { resolveTodayFixedRoutineKeys } from '../lib/resolveTodayFixedRoutineKeys';
import {
  registerFixedSyncTodayTabAccessor,
  syncTodayTabWithFixedRoutineApply,
} from '../lib/runSyncTodayTabWithFixedRoutineApply';
import { sanitizeFixedFlowSetItems } from '../lib/sanitizeFixedFlowSetItems';

function emptyActiveSetIdsByLayoutMode(): FixedRoutineActiveSetIdsByLayoutMode {
  return { bag: [], sections: [], spine: [] };
}

function emptyActiveMealSlotsByLayoutMode(): FixedRoutineActiveMealSlotsByLayoutMode {
  return { bag: {}, sections: {}, spine: {} };
}

function sanitizeActiveSetIds(ids: readonly string[], valid: Set<string>): string[] {
  return ids.filter((id) => valid.has(id));
}

function sanitizeActiveMealSlotsBySetId(
  slotsBySetId: Record<string, DayMealSlot[]> | undefined,
  valid: Set<string>,
): Record<string, DayMealSlot[]> {
  const activeMealSlotsBySetId: Record<string, DayMealSlot[]> = {};
  if (!slotsBySetId || typeof slotsBySetId !== 'object') return activeMealSlotsBySetId;
  for (const [setId, slots] of Object.entries(slotsBySetId)) {
    if (!valid.has(setId) || !Array.isArray(slots)) continue;
    const normalized = [...new Set(slots.map((slot) => normalizeDayMealSlot(slot)).filter(Boolean))];
    if (normalized.length > 0) activeMealSlotsBySetId[setId] = normalized;
  }
  return activeMealSlotsBySetId;
}

function sanitizeSetsState(state: {
  activeSetIds: string[];
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  activeSetIdsByLayoutMode?: FixedRoutineActiveSetIdsByLayoutMode;
  activeMealSlotsBySetIdByLayoutMode?: FixedRoutineActiveMealSlotsByLayoutMode;
  sets: FixedFlowSet[];
  fixedRoutineApplyLayoutMode?: FixedRoutineApplyLayoutMode;
}): {
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, DayMealSlot[]>;
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode;
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode;
  sets: FixedFlowSet[];
} {
  const sets = state.sets.map((s) => ({
    ...s,
    items: sanitizeFixedFlowSetItems(s.items),
  }));
  const valid = new Set(sets.map((s) => s.id));
  const mode = state.fixedRoutineApplyLayoutMode ?? 'bag';

  const activeSetIdsByLayoutMode = emptyActiveSetIdsByLayoutMode();
  const sourceByMode = state.activeSetIdsByLayoutMode ?? {
    bag: state.activeSetIds,
    sections: state.activeSetIds,
    spine: state.activeSetIds,
  };
  for (const key of ['bag', 'sections', 'spine'] as const) {
    activeSetIdsByLayoutMode[key] = sanitizeActiveSetIds(sourceByMode[key] ?? [], valid);
  }

  const activeMealSlotsBySetIdByLayoutMode = emptyActiveMealSlotsByLayoutMode();
  const sourceSlotsByMode = state.activeMealSlotsBySetIdByLayoutMode ?? {
    bag: state.activeMealSlotsBySetId ?? {},
    sections: state.activeMealSlotsBySetId ?? {},
    spine: state.activeMealSlotsBySetId ?? {},
  };
  for (const key of ['bag', 'sections', 'spine'] as const) {
    activeMealSlotsBySetIdByLayoutMode[key] = sanitizeActiveMealSlotsBySetId(
      sourceSlotsByMode[key],
      valid,
    );
  }

  return {
    activeSetIds: [...activeSetIdsByLayoutMode[mode]],
    activeMealSlotsBySetId: { ...activeMealSlotsBySetIdByLayoutMode[mode] },
    activeSetIdsByLayoutMode,
    activeMealSlotsBySetIdByLayoutMode,
    sets,
  };
}

function mirrorsForMode(
  mode: FixedRoutineApplyLayoutMode,
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode,
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode,
): { activeSetIds: string[]; activeMealSlotsBySetId: Record<string, DayMealSlot[]> } {
  return {
    activeSetIds: [...activeSetIdsByLayoutMode[mode]],
    activeMealSlotsBySetId: { ...activeMealSlotsBySetIdByLayoutMode[mode] },
  };
}

type FixedFlowSetsStoreState = {
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, DayMealSlot[]>;
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode;
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode;
  sets: FixedFlowSet[];
  scheduledMealSlotLayoutEnabled: boolean;
  dismissedExampleCustomFlowSetIds: string[];
  fixedRoutineApplyLayoutMode: FixedRoutineApplyLayoutMode;
  /** 현재 편집 모드 기준 오늘 적용 categoryKey */
  todayAppliedCategoryKeys: string[];
  todayAppliedRevision: number;
  isHydrated: boolean;

  hydrate: () => void;
  reloadFromStorage: () => void;
  refreshTodayAppliedCategoryKeys: (now?: Date) => void;
  addSet: (name?: string) => void;
  renameSet: (setId: string, nextName: string) => void;
  removeSet: (setId: string) => void;
  /** 지정 보기 모드(또는 현재 모드)에만 오늘 적용 토글 */
  toggleSetForToday: (setId: string, layoutMode?: FixedRoutineApplyLayoutMode) => void;
  toggleMealSlotForToday: (
    setId: string,
    slot: DayMealSlot,
    layoutMode?: FixedRoutineApplyLayoutMode,
  ) => void;
  setScheduledMealSlotLayoutEnabled: (enabled: boolean) => void;
  setFixedRoutineApplyLayoutMode: (mode: FixedRoutineApplyLayoutMode) => void;
  pinMealSlotInSet: (setId: string, slot: DayMealSlot) => void;

  addCategoryToSet: (setId: string, categoryKey: string, mealSlot?: DayMealSlot) => void;
  removeCategoryFromSet: (setId: string, categoryKey: string) => void;
  setSetOrder: (setId: string, categoryKeys: string[]) => void;
  setCategoryEnabledInSet: (setId: string, categoryKey: string, enabled: boolean) => void;
  setCategoryMealSlotInSet: (setId: string, categoryKey: string, mealSlot: DayMealSlot) => void;
  toggleCategoryMealSlotInSet: (setId: string, categoryKey: string, mealSlot: DayMealSlot) => void;
  setCategorySpineScheduleInSet: (
    setId: string,
    categoryKey: string,
    startMinutes: number,
    endMinutes: number,
    endsNextCalendarDay?: boolean,
  ) => void;
  setCategoryMealSlotInAnySet: (categoryKey: string, mealSlot: DayMealSlot) => boolean;

  setActiveSetOrder: (categoryKeys: string[]) => void;
  addCategoryToActiveSet: (categoryKey: string) => void;
  removeCategoryFromActiveSet: (categoryKey: string) => void;
  setCategoryEnabled: (categoryKey: string, enabled: boolean) => void;
};

function createSetId(): string {
  const cryptoAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const uuid = cryptoAny.crypto?.randomUUID?.();
  return uuid ?? `set_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
}

function recomputeTodayApplied(
  activeSetIds: string[],
  activeMealSlotsBySetId: Record<string, DayMealSlot[]>,
  sets: FixedFlowSet[],
  now: Date = new Date(),
): string[] {
  return resolveTodayFixedRoutineKeys({ activeSetIds, activeMealSlotsBySetId, sets }, { now });
}

function applyTodayAppliedPatch(
  set: (fn: (state: FixedFlowSetsStoreState) => Partial<FixedFlowSetsStoreState>) => void,
  get: () => FixedFlowSetsStoreState,
  patch: Partial<FixedFlowSetsStoreState>,
  now?: Date,
): void {
  const nextActiveSetIds = patch.activeSetIds ?? get().activeSetIds;
  const nextActiveMealSlotsBySetId = patch.activeMealSlotsBySetId ?? get().activeMealSlotsBySetId;
  const nextSets = patch.sets ?? get().sets;
  const todayAppliedCategoryKeys = recomputeTodayApplied(
    nextActiveSetIds,
    nextActiveMealSlotsBySetId,
    nextSets,
    now,
  );
  set((state) => ({
    ...patch,
    todayAppliedCategoryKeys,
    todayAppliedRevision: state.todayAppliedRevision + 1,
  }));
  syncTodayTabWithFixedRoutineApply();
}

function persistState(
  set: (fn: (state: FixedFlowSetsStoreState) => Partial<FixedFlowSetsStoreState>) => void,
  get: () => FixedFlowSetsStoreState,
  patch: Partial<
    Pick<
      FixedFlowSetsStoreState,
      | 'activeSetIds'
      | 'activeMealSlotsBySetId'
      | 'activeSetIdsByLayoutMode'
      | 'activeMealSlotsBySetIdByLayoutMode'
      | 'sets'
      | 'scheduledMealSlotLayoutEnabled'
      | 'dismissedExampleCustomFlowSetIds'
      | 'fixedRoutineApplyLayoutMode'
    >
  >,
): void {
  const fixedRoutineApplyLayoutMode =
    patch.fixedRoutineApplyLayoutMode ?? get().fixedRoutineApplyLayoutMode;
  let activeSetIdsByLayoutMode =
    patch.activeSetIdsByLayoutMode ?? get().activeSetIdsByLayoutMode;
  let activeMealSlotsBySetIdByLayoutMode =
    patch.activeMealSlotsBySetIdByLayoutMode ?? get().activeMealSlotsBySetIdByLayoutMode;

  // 현재 모드 미러만 바꾼 호출 → 해당 모드 슬롯에 반영 (목록/시간대/타임라인 독립)
  if (patch.activeSetIds !== undefined || patch.activeMealSlotsBySetId !== undefined) {
    activeSetIdsByLayoutMode = {
      ...activeSetIdsByLayoutMode,
      [fixedRoutineApplyLayoutMode]:
        patch.activeSetIds ?? activeSetIdsByLayoutMode[fixedRoutineApplyLayoutMode],
    };
    activeMealSlotsBySetIdByLayoutMode = {
      ...activeMealSlotsBySetIdByLayoutMode,
      [fixedRoutineApplyLayoutMode]:
        patch.activeMealSlotsBySetId ??
        activeMealSlotsBySetIdByLayoutMode[fixedRoutineApplyLayoutMode],
    };
  }

  const mirrors = mirrorsForMode(
    fixedRoutineApplyLayoutMode,
    activeSetIdsByLayoutMode,
    activeMealSlotsBySetIdByLayoutMode,
  );
  const activeSetIds = mirrors.activeSetIds;
  const activeMealSlotsBySetId = mirrors.activeMealSlotsBySetId;
  const sets = patch.sets ?? get().sets;
  const scheduledMealSlotLayoutEnabled =
    patch.scheduledMealSlotLayoutEnabled ?? get().scheduledMealSlotLayoutEnabled;
  const dismissedExampleCustomFlowSetIds =
    patch.dismissedExampleCustomFlowSetIds ?? get().dismissedExampleCustomFlowSetIds;
  saveFixedFlowSetsState({
    activeSetIds,
    activeMealSlotsBySetId,
    activeSetIdsByLayoutMode,
    activeMealSlotsBySetIdByLayoutMode,
    sets,
    scheduledMealSlotLayoutEnabled,
    dismissedExampleCustomFlowSetIds,
    fixedRoutineApplyLayoutMode,
  });
  applyTodayAppliedPatch(set, get, {
    activeSetIds,
    activeMealSlotsBySetId,
    activeSetIdsByLayoutMode,
    activeMealSlotsBySetIdByLayoutMode,
    sets,
    fixedRoutineApplyLayoutMode,
  });
}

function mapSetItems(items: FixedFlowSetItem[]): Map<string, FixedFlowSetItem> {
  return new Map(items.map((x) => [x.categoryKey, x]));
}

function nextSetName(existing: FixedFlowSet[]): string {
  const base = '세트';
  const taken = new Set(existing.map((s) => s.name.trim()));
  if (!taken.has(EXAMPLE_CUSTOM_FLOW_SET_NAME)) return EXAMPLE_CUSTOM_FLOW_SET_NAME;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

export const useFixedFlowSetsStore = create<FixedFlowSetsStoreState>((set, get) => ({
  activeSetIds: [],
  activeMealSlotsBySetId: {},
  activeSetIdsByLayoutMode: emptyActiveSetIdsByLayoutMode(),
  activeMealSlotsBySetIdByLayoutMode: emptyActiveMealSlotsByLayoutMode(),
  sets: [],
  scheduledMealSlotLayoutEnabled: false,
  dismissedExampleCustomFlowSetIds: [],
  fixedRoutineApplyLayoutMode: 'bag',
  todayAppliedCategoryKeys: [],
  todayAppliedRevision: 0,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const loaded = loadFixedFlowSetsState();
    const sanitized = sanitizeSetsState(loaded);
    const keysBefore = loaded.sets.map((s) => s.items.map((i) => i.categoryKey).join(',')).join('|');
    const keysAfter = sanitized.sets.map((s) => s.items.map((i) => i.categoryKey).join(',')).join('|');
    if (keysBefore !== keysAfter) {
      saveFixedFlowSetsState({ ...loaded, ...sanitized });
    }
    const mode = loaded.fixedRoutineApplyLayoutMode ?? 'bag';
    const todayAppliedCategoryKeys = recomputeTodayApplied(
      sanitized.activeSetIds,
      sanitized.activeMealSlotsBySetId,
      sanitized.sets,
    );
    set({
      activeSetIds: sanitized.activeSetIds,
      activeMealSlotsBySetId: sanitized.activeMealSlotsBySetId,
      activeSetIdsByLayoutMode: sanitized.activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: sanitized.activeMealSlotsBySetIdByLayoutMode,
      sets: sanitized.sets,
      scheduledMealSlotLayoutEnabled: loaded.scheduledMealSlotLayoutEnabled === true,
      dismissedExampleCustomFlowSetIds: loaded.dismissedExampleCustomFlowSetIds ?? [],
      fixedRoutineApplyLayoutMode: mode,
      todayAppliedCategoryKeys,
      todayAppliedRevision: 1,
      isHydrated: true,
    });
    syncTodayTabWithFixedRoutineApply();
  },

  reloadFromStorage: () => {
    const loaded = loadFixedFlowSetsState();
    const sanitized = sanitizeSetsState(loaded);
    applyTodayAppliedPatch(set, get, {
      activeSetIds: sanitized.activeSetIds,
      activeMealSlotsBySetId: sanitized.activeMealSlotsBySetId,
      activeSetIdsByLayoutMode: sanitized.activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: sanitized.activeMealSlotsBySetIdByLayoutMode,
      sets: sanitized.sets,
      scheduledMealSlotLayoutEnabled: loaded.scheduledMealSlotLayoutEnabled === true,
      dismissedExampleCustomFlowSetIds: loaded.dismissedExampleCustomFlowSetIds ?? [],
      fixedRoutineApplyLayoutMode: loaded.fixedRoutineApplyLayoutMode ?? 'bag',
      isHydrated: true,
    });
  },

  refreshTodayAppliedCategoryKeys: (now) => {
    const { activeSetIds, activeMealSlotsBySetId, sets } = get();
    const todayAppliedCategoryKeys = recomputeTodayApplied(
      activeSetIds,
      activeMealSlotsBySetId,
      sets,
      now,
    );
    set((state) => ({
      todayAppliedCategoryKeys,
      todayAppliedRevision: state.todayAppliedRevision + 1,
    }));
    syncTodayTabWithFixedRoutineApply();
  },

  addSet: (name) => {
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const labelRaw = typeof name === 'string' ? name.trim() : '';
    const nextName = labelRaw.length > 0 ? labelRaw.slice(0, 24) : nextSetName(sets);
    const nextSet: FixedFlowSet = {
      id: createSetId(),
      name: nextName,
      applyRule: 'manual',
      items: nextName === EXAMPLE_CUSTOM_FLOW_SET_NAME ? createExampleCustomFlowSetItems() : [],
    };
    const nextSets = [...sets, nextSet];
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  renameSet: (setId, nextName) => {
    if (BUILTIN_FIXED_FLOW_SET_IDS.includes(setId as (typeof BUILTIN_FIXED_FLOW_SET_IDS)[number])) {
      return;
    }
    const name = nextName.trim();
    if (!name) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const nextSets = sets.map((s) => (s.id === setId ? { ...s, name: name.slice(0, 24) } : s));
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  removeSet: (setId) => {
    if (BUILTIN_FIXED_FLOW_SET_IDS.includes(setId as (typeof BUILTIN_FIXED_FLOW_SET_IDS)[number])) {
      return;
    }
    const {
      sets,
      activeSetIds,
      activeMealSlotsBySetId,
      activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode,
      dismissedExampleCustomFlowSetIds,
      fixedRoutineApplyLayoutMode,
    } = get();
    const nextSets = sets.filter((s) => s.id !== setId);
    // setState로 미러만 갱신한 경우에도 현재 모드 슬롯과 맞춤
    const syncedByMode: FixedRoutineActiveSetIdsByLayoutMode = {
      ...activeSetIdsByLayoutMode,
      [fixedRoutineApplyLayoutMode]: activeSetIds,
    };
    const syncedSlotsByMode: FixedRoutineActiveMealSlotsByLayoutMode = {
      ...activeMealSlotsBySetIdByLayoutMode,
      [fixedRoutineApplyLayoutMode]: activeMealSlotsBySetId,
    };
    const nextActiveSetIdsByLayoutMode = emptyActiveSetIdsByLayoutMode();
    const nextActiveMealSlotsBySetIdByLayoutMode = emptyActiveMealSlotsByLayoutMode();
    for (const mode of ['bag', 'sections', 'spine'] as const) {
      nextActiveSetIdsByLayoutMode[mode] = syncedByMode[mode].filter((id) => id !== setId);
      const { [setId]: _removed, ...restSlots } = syncedSlotsByMode[mode];
      nextActiveMealSlotsBySetIdByLayoutMode[mode] = restSlots;
    }
    const nextDismissed = isBuiltinExampleCustomFlowSet({ id: setId })
      ? [...new Set([...dismissedExampleCustomFlowSetIds, setId])]
      : dismissedExampleCustomFlowSetIds;
    const mirrors = mirrorsForMode(
      fixedRoutineApplyLayoutMode,
      nextActiveSetIdsByLayoutMode,
      nextActiveMealSlotsBySetIdByLayoutMode,
    );
    set({
      sets: nextSets,
      activeSetIds: mirrors.activeSetIds,
      activeMealSlotsBySetId: mirrors.activeMealSlotsBySetId,
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
      dismissedExampleCustomFlowSetIds: nextDismissed,
    });
    persistState(set, get, {
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
      sets: nextSets,
      dismissedExampleCustomFlowSetIds: nextDismissed,
    });
  },

  toggleSetForToday: (setId, layoutMode) => {
    const mode = layoutMode ?? get().fixedRoutineApplyLayoutMode;
    const {
      sets,
      activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode,
    } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const modeActiveIds = activeSetIdsByLayoutMode[mode] ?? [];
    const modeSlots = activeMealSlotsBySetIdByLayoutMode[mode] ?? {};
    const isActivating = !modeActiveIds.includes(setId);
    const nextActive = isActivating
      ? [...modeActiveIds, setId]
      : modeActiveIds.filter((id) => id !== setId);
    const { [setId]: _removed, ...restSlots } = modeSlots;
    const nextActiveSetIdsByLayoutMode = {
      ...activeSetIdsByLayoutMode,
      [mode]: nextActive,
    };
    const nextActiveMealSlotsBySetIdByLayoutMode = {
      ...activeMealSlotsBySetIdByLayoutMode,
      [mode]: restSlots,
    };
    set({
      fixedRoutineApplyLayoutMode: mode,
      activeSetIds: nextActive,
      activeMealSlotsBySetId: restSlots,
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
    });
    persistState(set, get, {
      fixedRoutineApplyLayoutMode: mode,
      activeSetIds: nextActive,
      activeMealSlotsBySetId: restSlots,
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
      sets,
    });
  },

  toggleMealSlotForToday: (setId, slot, layoutMode) => {
    const normalizedSlot = normalizeDayMealSlot(slot);
    if (!normalizedSlot) return;
    const mode = layoutMode ?? get().fixedRoutineApplyLayoutMode;
    const {
      sets,
      activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode,
    } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target || !isBuiltinPresetScheduleSet(target)) return;

    const modeActiveIds = activeSetIdsByLayoutMode[mode] ?? [];
    const modeSlots = { ...(activeMealSlotsBySetIdByLayoutMode[mode] ?? {}) };
    const currentSlots = new Set(modeSlots[setId] ?? []);
    if (currentSlots.has(normalizedSlot)) currentSlots.delete(normalizedSlot);
    else currentSlots.add(normalizedSlot);

    let nextActiveSetIds = modeActiveIds.includes(setId) ? [...modeActiveIds] : [...modeActiveIds, setId];
    const nextSlots = [...currentSlots];
    if (nextSlots.length === 0) {
      delete modeSlots[setId];
      nextActiveSetIds = nextActiveSetIds.filter((id) => id !== setId);
    } else {
      modeSlots[setId] = nextSlots;
    }

    const nextActiveSetIdsByLayoutMode = {
      ...activeSetIdsByLayoutMode,
      [mode]: nextActiveSetIds,
    };
    const nextActiveMealSlotsBySetIdByLayoutMode = {
      ...activeMealSlotsBySetIdByLayoutMode,
      [mode]: modeSlots,
    };
    set({
      fixedRoutineApplyLayoutMode: mode,
      activeSetIds: nextActiveSetIds,
      activeMealSlotsBySetId: modeSlots,
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
    });
    persistState(set, get, {
      fixedRoutineApplyLayoutMode: mode,
      activeSetIds: nextActiveSetIds,
      activeMealSlotsBySetId: modeSlots,
      activeSetIdsByLayoutMode: nextActiveSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode: nextActiveMealSlotsBySetIdByLayoutMode,
      sets,
    });
  },

  setScheduledMealSlotLayoutEnabled: (enabled) => {
    set({ scheduledMealSlotLayoutEnabled: enabled });
    persistState(set, get, { scheduledMealSlotLayoutEnabled: enabled });
  },

  setFixedRoutineApplyLayoutMode: (mode) => {
    if (get().fixedRoutineApplyLayoutMode === mode) return;
    const { activeSetIdsByLayoutMode, activeMealSlotsBySetIdByLayoutMode } = get();
    const mirrors = mirrorsForMode(mode, activeSetIdsByLayoutMode, activeMealSlotsBySetIdByLayoutMode);
    set({
      fixedRoutineApplyLayoutMode: mode,
      activeSetIds: mirrors.activeSetIds,
      activeMealSlotsBySetId: mirrors.activeMealSlotsBySetId,
    });
    persistState(set, get, { fixedRoutineApplyLayoutMode: mode });
  },

  pinMealSlotInSet: (setId, slot) => {
    const normalizedSlot = normalizeDayMealSlot(slot);
    if (!normalizedSlot) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target || !isBuiltinPresetScheduleSet(target)) return;
    const current = target.pinnedMealSlots ?? [];
    if (current.includes(normalizedSlot)) return;
    const nextSets = sets.map((s) =>
      s.id === setId
        ? { ...s, pinnedMealSlots: [...current, normalizedSlot] }
        : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  addCategoryToSet: (setId, categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    if (!key) return;
    if (!isPriorityCatalogAllowedKey(key)) return;
    const normalizedMealSlot = mealSlot ? normalizeDayMealSlot(mealSlot) : null;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    if (target.items.some((x) => x.categoryKey === key)) {
      if (normalizedMealSlot) {
        get().setCategoryMealSlotInSet(setId, key, normalizedMealSlot);
        if (isBuiltinPresetScheduleSet(target)) {
          get().pinMealSlotInSet(setId, normalizedMealSlot);
        }
      }
      return;
    }
    const nextItem: FixedFlowSetItem = {
      categoryKey: key,
      enabled: true,
      ...(normalizedMealSlot ? buildFixedFlowItemMealSlotsFields([normalizedMealSlot]) : {}),
    };
    const nextSets = sets.map((s) =>
      s.id === setId ? { ...s, items: [...s.items, nextItem] } : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
    if (normalizedMealSlot && isBuiltinPresetScheduleSet(target)) {
      get().pinMealSlotInSet(setId, normalizedMealSlot);
    }
  },

  removeCategoryFromSet: (setId, categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const nextSets = sets.map((s) =>
      s.id === setId ? { ...s, items: s.items.filter((x) => x.categoryKey !== key) } : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  setSetOrder: (setId, categoryKeys) => {
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const existing = mapSetItems(target.items);
    const seen = new Set<string>();
    const items: FixedFlowSetItem[] = [];
    for (const row of categoryKeys) {
      const key = row.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const prev = existing.get(key);
      items.push({
        categoryKey: key,
        enabled: prev?.enabled !== false,
        mealSlot: prev?.mealSlot,
        mealSlots: prev?.mealSlots,
        spineStartMinutes: prev?.spineStartMinutes,
        spineEndMinutes: prev?.spineEndMinutes,
        ...(prev?.spineEndsNextCalendarDay === true
          ? { spineEndsNextCalendarDay: true as const }
          : {}),
      });
    }
    const nextSets = sets.map((s) => (s.id === setId ? { ...s, items } : s));
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  setCategoryEnabledInSet: (setId, categoryKey, enabled) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const nextSets = sets.map((s) =>
      s.id === setId
        ? {
          ...s,
          items: s.items.map((x) => (x.categoryKey === key ? { ...x, enabled } : x)),
        }
        : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  setCategoryMealSlotInSet: (setId, categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    const normalized = normalizeDayMealSlot(mealSlot);
    if (!key || !normalized) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target?.items.some((x) => x.categoryKey === key)) return;
    const nextSets = sets.map((s) =>
      s.id === setId
        ? {
          ...s,
          items: s.items.map((x) =>
            x.categoryKey === key
              ? { ...x, ...buildFixedFlowItemMealSlotsFields([normalized]) }
              : x,
          ),
        }
        : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  toggleCategoryMealSlotInSet: (setId, categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    const normalized = normalizeDayMealSlot(mealSlot);
    if (!key || !normalized) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const index = target.items.findIndex((x) => x.categoryKey === key);
    if (index < 0) return;
    const item = target.items[index]!;
    const nextSlots = toggleFixedFlowItemMealSlots(item, index, normalized);
    const nextSets = sets.map((s) =>
      s.id === setId
        ? {
          ...s,
          items: s.items.map((x) =>
            x.categoryKey === key ? { ...x, ...buildFixedFlowItemMealSlotsFields(nextSlots) } : x,
          ),
        }
        : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  setCategorySpineScheduleInSet: (setId, categoryKey, startMinutes, endMinutes, endsNextCalendarDay) => {
    const key = categoryKey.trim();
    const start = Math.floor(startMinutes);
    const end = Math.floor(endMinutes);
    const endsNext = endsNextCalendarDay === true;
    if (!key || !Number.isFinite(start) || !Number.isFinite(end)) return;
    if (start < 0 || end < 0 || start > 24 * 60 || end > 24 * 60) return;
    if (endsNext ? end >= start : end <= start) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target?.items.some((x) => x.categoryKey === key)) return;
    const nextSets = sets.map((s) =>
      s.id === setId
        ? {
          ...s,
          items: s.items.map((x) =>
            x.categoryKey === key
              ? {
                  ...x,
                  spineStartMinutes: start,
                  spineEndMinutes: end,
                  ...(endsNext
                    ? { spineEndsNextCalendarDay: true as const }
                    : { spineEndsNextCalendarDay: undefined }),
                }
              : x,
          ),
        }
        : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
  },

  setCategoryMealSlotInAnySet: (categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    const normalized = normalizeDayMealSlot(mealSlot);
    if (!key || !normalized) return false;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    if (!sets.some((s) => s.items.some((x) => x.categoryKey === key))) return false;
    const nextSets = sets.map((s) => {
      if (!s.items.some((x) => x.categoryKey === key)) return s;
      return {
        ...s,
        items: s.items.map((x) =>
          x.categoryKey === key
            ? { ...x, ...buildFixedFlowItemMealSlotsFields([normalized]) }
            : x,
        ),
      };
    });
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
    return true;
  },

  setActiveSetOrder: (categoryKeys) => {
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    get().setSetOrder(active.id, categoryKeys);
  },

  addCategoryToActiveSet: (categoryKey) => {
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    get().addCategoryToSet(active.id, categoryKey);
  },

  removeCategoryFromActiveSet: (categoryKey) => {
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    get().removeCategoryFromSet(active.id, categoryKey);
  },

  setCategoryEnabled: (categoryKey, enabled) => {
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    get().setCategoryEnabledInSet(active.id, categoryKey, enabled);
  },
}));

registerFixedSyncTodayTabAccessor(() => useFixedFlowSetsStore.getState());

/** 목표 상세 요일 설정 등 fixedFlowSetsState 밖 변경 후 오늘 적용 목록 갱신 */
export function notifyFixedFlowApplyScheduleChanged(now?: Date): void {
  useFixedFlowSetsStore.getState().refreshTodayAppliedCategoryKeys(now);
}

/** @deprecated `todayAppliedCategoryKeys` 사용 */
export function selectMergedActiveFixedFlowCategoryKeys(): string[] {
  return useFixedFlowSetsStore.getState().todayAppliedCategoryKeys;
}
