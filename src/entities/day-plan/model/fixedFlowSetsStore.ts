import { create } from 'zustand';

import {
  BUILTIN_FIXED_FLOW_SET_IDS,
  getActiveFixedFlowSet,
  isBuiltinPresetScheduleSet,
  isFixedFlowSetMatchedToday,
  loadFixedFlowSetsState,
  normalizeDayMealSlot,
  saveFixedFlowSetsState,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';

import { isPriorityCatalogAllowedKey } from '../lib/priorityCatalogRegistry';
import { resolveTodayFixedRoutineKeys } from '../lib/resolveTodayFixedRoutineKeys';
import {
  registerFixedSyncTodayTabAccessor,
  syncTodayTabWithFixedRoutineApply,
} from '../lib/runSyncTodayTabWithFixedRoutineApply';
import { sanitizeFixedFlowSetItems } from '../lib/sanitizeFixedFlowSetItems';

function sanitizeSetsState(state: { activeSetIds: string[]; sets: FixedFlowSet[] }): {
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, DayMealSlot[]>;
  sets: FixedFlowSet[];
} {
  const sets = state.sets.map((s) => ({
    ...s,
    items: sanitizeFixedFlowSetItems(s.items),
  }));
  const valid = new Set(sets.map((s) => s.id));
  const activeSetIds = state.activeSetIds.filter((id) => valid.has(id));
  const slotsBySetIdRaw = (state as { activeMealSlotsBySetId?: Record<string, DayMealSlot[]> })
    .activeMealSlotsBySetId;
  const activeMealSlotsBySetId: Record<string, DayMealSlot[]> = {};
  if (slotsBySetIdRaw && typeof slotsBySetIdRaw === 'object') {
    for (const [setId, slots] of Object.entries(slotsBySetIdRaw)) {
      if (!valid.has(setId) || !Array.isArray(slots)) continue;
      const normalized = [...new Set(slots.map((slot) => normalizeDayMealSlot(slot)).filter(Boolean))];
      if (normalized.length > 0) activeMealSlotsBySetId[setId] = normalized;
    }
  }
  return { activeSetIds, activeMealSlotsBySetId, sets };
}

type FixedFlowSetsStoreState = {
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, DayMealSlot[]>;
  sets: FixedFlowSet[];
  scheduledMealSlotLayoutEnabled: boolean;
  /** 오늘 자동·수동 적용 대상 categoryKey (중복 없음) */
  todayAppliedCategoryKeys: string[];
  /** todayAppliedCategoryKeys 재계산 시 증가 — 구독용 */
  todayAppliedRevision: number;
  isHydrated: boolean;

  hydrate: () => void;
  reloadFromStorage: () => void;
  refreshTodayAppliedCategoryKeys: (now?: Date) => void;
  addSet: (name?: string) => void;
  renameSet: (setId: string, nextName: string) => void;
  removeSet: (setId: string) => void;
  /** 오늘 적용 그룹 토글 — 여러 그룹 동시 적용 가능 */
  toggleSetForToday: (setId: string) => void;
  /** preset 루틴 구간별 오늘 적용 토글 */
  toggleMealSlotForToday: (setId: string, slot: DayMealSlot) => void;
  setScheduledMealSlotLayoutEnabled: (enabled: boolean) => void;

  addCategoryToSet: (setId: string, categoryKey: string, mealSlot?: DayMealSlot) => void;
  removeCategoryFromSet: (setId: string, categoryKey: string) => void;
  setSetOrder: (setId: string, categoryKeys: string[]) => void;
  setCategoryEnabledInSet: (setId: string, categoryKey: string, enabled: boolean) => void;
  setCategoryMealSlotInSet: (setId: string, categoryKey: string, mealSlot: DayMealSlot) => void;
  /** categoryKey가 속한 첫 세트의 mealSlot 갱신 — 성공 시 true */
  setCategoryMealSlotInAnySet: (categoryKey: string, mealSlot: DayMealSlot) => boolean;

  /** @deprecated 첫 적용 그룹 전용 — 기존 코드 호환 */
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
      'activeSetIds' | 'activeMealSlotsBySetId' | 'sets' | 'scheduledMealSlotLayoutEnabled'
    >
  >,
): void {
  const activeSetIds = patch.activeSetIds ?? get().activeSetIds;
  const activeMealSlotsBySetId = patch.activeMealSlotsBySetId ?? get().activeMealSlotsBySetId;
  const sets = patch.sets ?? get().sets;
  const scheduledMealSlotLayoutEnabled =
    patch.scheduledMealSlotLayoutEnabled ?? get().scheduledMealSlotLayoutEnabled;
  saveFixedFlowSetsState({ activeSetIds, activeMealSlotsBySetId, sets, scheduledMealSlotLayoutEnabled });
  applyTodayAppliedPatch(set, get, { activeSetIds, activeMealSlotsBySetId, sets });
}

function mapSetItems(items: FixedFlowSetItem[]): Map<string, FixedFlowSetItem> {
  return new Map(items.map((x) => [x.categoryKey, x]));
}

function nextSetName(existing: FixedFlowSet[]): string {
  const base = '세트';
  const taken = new Set(existing.map((s) => s.name.trim()));
  if (!taken.has('기본 세트')) return '기본 세트';
  let i = 2;
  while (taken.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

export const useFixedFlowSetsStore = create<FixedFlowSetsStoreState>((set, get) => ({
  activeSetIds: [],
  activeMealSlotsBySetId: {},
  sets: [],
  scheduledMealSlotLayoutEnabled: false,
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
      saveFixedFlowSetsState(sanitized);
    }
    const todayAppliedCategoryKeys = recomputeTodayApplied(
      sanitized.activeSetIds,
      sanitized.activeMealSlotsBySetId,
      sanitized.sets,
    );
    set({
      activeSetIds: sanitized.activeSetIds,
      activeMealSlotsBySetId: sanitized.activeMealSlotsBySetId,
      sets: sanitized.sets,
      scheduledMealSlotLayoutEnabled: sanitized.scheduledMealSlotLayoutEnabled === true,
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
      sets: sanitized.sets,
      scheduledMealSlotLayoutEnabled: sanitized.scheduledMealSlotLayoutEnabled === true,
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
      items: [],
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
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const nextSets = sets.filter((s) => s.id !== setId);
    const nextActive = activeSetIds.filter((id) => id !== setId);
    const { [setId]: _removed, ...nextActiveMealSlotsBySetId } = activeMealSlotsBySetId;
    set({ sets: nextSets, activeSetIds: nextActive, activeMealSlotsBySetId: nextActiveMealSlotsBySetId });
    persistState(set, get, {
      activeSetIds: nextActive,
      activeMealSlotsBySetId: nextActiveMealSlotsBySetId,
      sets: nextSets,
    });
  },

  toggleSetForToday: (setId) => {
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const isActivating = !activeSetIds.includes(setId);
    if (
      isActivating &&
      isBuiltinPresetScheduleSet(target) &&
      !isFixedFlowSetMatchedToday(target)
    ) {
      return;
    }
    const nextActive = isActivating
      ? [...activeSetIds, setId]
      : activeSetIds.filter((id) => id !== setId);
    const { [setId]: _removed, ...restSlots } = activeMealSlotsBySetId;
    const enableScheduledLayout =
      isActivating && isBuiltinPresetScheduleSet(target) && !get().scheduledMealSlotLayoutEnabled;
    set({
      activeSetIds: nextActive,
      activeMealSlotsBySetId: restSlots,
      ...(enableScheduledLayout ? { scheduledMealSlotLayoutEnabled: true } : {}),
    });
    persistState(set, get, {
      activeSetIds: nextActive,
      activeMealSlotsBySetId: restSlots,
      sets,
      ...(enableScheduledLayout ? { scheduledMealSlotLayoutEnabled: true } : {}),
    });
  },

  toggleMealSlotForToday: (setId, slot) => {
    const normalizedSlot = normalizeDayMealSlot(slot);
    if (!normalizedSlot) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target || !isBuiltinPresetScheduleSet(target)) return;
    if (!isFixedFlowSetMatchedToday(target)) return;

    const currentSlots = new Set(activeMealSlotsBySetId[setId] ?? []);
    if (currentSlots.has(normalizedSlot)) currentSlots.delete(normalizedSlot);
    else currentSlots.add(normalizedSlot);

    const nextActiveMealSlotsBySetId = { ...activeMealSlotsBySetId };
    let nextActiveSetIds = activeSetIds.includes(setId) ? [...activeSetIds] : [...activeSetIds, setId];
    const nextSlots = [...currentSlots];
    if (nextSlots.length === 0) {
      delete nextActiveMealSlotsBySetId[setId];
      nextActiveSetIds = nextActiveSetIds.filter((id) => id !== setId);
    } else {
      nextActiveMealSlotsBySetId[setId] = nextSlots;
    }

    const enableScheduledLayout = nextSlots.length > 0 && !get().scheduledMealSlotLayoutEnabled;

    set({
      activeSetIds: nextActiveSetIds,
      activeMealSlotsBySetId: nextActiveMealSlotsBySetId,
      ...(enableScheduledLayout ? { scheduledMealSlotLayoutEnabled: true } : {}),
    });
    persistState(set, get, {
      activeSetIds: nextActiveSetIds,
      activeMealSlotsBySetId: nextActiveMealSlotsBySetId,
      sets,
      ...(enableScheduledLayout ? { scheduledMealSlotLayoutEnabled: true } : {}),
    });
  },

  setScheduledMealSlotLayoutEnabled: (enabled) => {
    set({ scheduledMealSlotLayoutEnabled: enabled });
    persistState(set, get, { scheduledMealSlotLayoutEnabled: enabled });
  },

  addCategoryToSet: (setId, categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    if (!key) return;
    if (!isPriorityCatalogAllowedKey(key)) return;
    const { sets, activeSetIds, activeMealSlotsBySetId } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    if (target.items.some((x) => x.categoryKey === key)) return;
    const nextItem: FixedFlowSetItem = {
      categoryKey: key,
      enabled: true,
      ...(mealSlot ? { mealSlot } : {}),
    };
    const nextSets = sets.map((s) =>
      s.id === setId ? { ...s, items: [...s.items, nextItem] } : s,
    );
    set({ sets: nextSets });
    persistState(set, get, { activeSetIds, activeMealSlotsBySetId, sets: nextSets });
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
            x.categoryKey === key ? { ...x, mealSlot: normalized } : x,
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
          x.categoryKey === key ? { ...x, mealSlot: normalized } : x,
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
