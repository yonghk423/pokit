import { create } from 'zustand';

import {
  BUILTIN_FIXED_FLOW_SET_IDS,
  getActiveFixedFlowSet,
  loadFixedFlowSetsState,
  normalizeDayMealSlot,
  saveFixedFlowSetsState,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';

import { resolveTodayFixedRoutineKeys } from '../lib/resolveTodayFixedRoutineKeys';
import { isPriorityCatalogAllowedKey } from '../lib/priorityCatalogRegistry';
import { sanitizeFixedFlowSetItems } from '../lib/sanitizeFixedFlowSetItems';

function sanitizeSetsState(state: { activeSetIds: string[]; sets: FixedFlowSet[] }): {
  activeSetIds: string[];
  sets: FixedFlowSet[];
} {
  const sets = state.sets.map((s) => ({
    ...s,
    items: sanitizeFixedFlowSetItems(s.items),
  }));
  const valid = new Set(sets.map((s) => s.id));
  const activeSetIds = state.activeSetIds.filter((id) => valid.has(id));
  return { activeSetIds, sets };
}

type FixedFlowSetsStoreState = {
  activeSetIds: string[];
  sets: FixedFlowSet[];
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

  addCategoryToSet: (setId: string, categoryKey: string, mealSlot?: DayMealSlot) => void;
  removeCategoryFromSet: (setId: string, categoryKey: string) => void;
  setSetOrder: (setId: string, categoryKeys: string[]) => void;
  setCategoryEnabledInSet: (setId: string, categoryKey: string, enabled: boolean) => void;
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
  sets: FixedFlowSet[],
  now: Date = new Date(),
): string[] {
  return resolveTodayFixedRoutineKeys({ activeSetIds, sets }, { now });
}

function applyTodayAppliedPatch(
  set: (fn: (state: FixedFlowSetsStoreState) => Partial<FixedFlowSetsStoreState>) => void,
  get: () => FixedFlowSetsStoreState,
  patch: Partial<FixedFlowSetsStoreState>,
  now?: Date,
): void {
  const nextActiveSetIds = patch.activeSetIds ?? get().activeSetIds;
  const nextSets = patch.sets ?? get().sets;
  const todayAppliedCategoryKeys = recomputeTodayApplied(nextActiveSetIds, nextSets, now);
  set((state) => ({
    ...patch,
    todayAppliedCategoryKeys,
    todayAppliedRevision: state.todayAppliedRevision + 1,
  }));
}

function persistState(
  set: (fn: (state: FixedFlowSetsStoreState) => Partial<FixedFlowSetsStoreState>) => void,
  get: () => FixedFlowSetsStoreState,
  activeSetIds: string[],
  sets: FixedFlowSet[],
): void {
  saveFixedFlowSetsState({ activeSetIds, sets });
  applyTodayAppliedPatch(set, get, { activeSetIds, sets });
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
  sets: [],
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
      sanitized.sets,
    );
    set({
      activeSetIds: sanitized.activeSetIds,
      sets: sanitized.sets,
      todayAppliedCategoryKeys,
      todayAppliedRevision: 1,
      isHydrated: true,
    });
  },

  reloadFromStorage: () => {
    const loaded = loadFixedFlowSetsState();
    const sanitized = sanitizeSetsState(loaded);
    applyTodayAppliedPatch(set, get, {
      activeSetIds: sanitized.activeSetIds,
      sets: sanitized.sets,
      isHydrated: true,
    });
  },

  refreshTodayAppliedCategoryKeys: (now) => {
    const { activeSetIds, sets } = get();
    const todayAppliedCategoryKeys = recomputeTodayApplied(activeSetIds, sets, now);
    set((state) => ({
      todayAppliedCategoryKeys,
      todayAppliedRevision: state.todayAppliedRevision + 1,
    }));
  },

  addSet: (name) => {
    const { sets, activeSetIds } = get();
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
    persistState(set, get, activeSetIds, nextSets);
  },

  renameSet: (setId, nextName) => {
    if (BUILTIN_FIXED_FLOW_SET_IDS.includes(setId as (typeof BUILTIN_FIXED_FLOW_SET_IDS)[number])) {
      return;
    }
    const name = nextName.trim();
    if (!name) return;
    const { sets, activeSetIds } = get();
    const nextSets = sets.map((s) => (s.id === setId ? { ...s, name: name.slice(0, 24) } : s));
    set({ sets: nextSets });
    persistState(set, get, activeSetIds, nextSets);
  },

  removeSet: (setId) => {
    if (BUILTIN_FIXED_FLOW_SET_IDS.includes(setId as (typeof BUILTIN_FIXED_FLOW_SET_IDS)[number])) {
      return;
    }
    const { sets, activeSetIds } = get();
    const nextSets = sets.filter((s) => s.id !== setId);
    const nextActive = activeSetIds.filter((id) => id !== setId);
    set({ sets: nextSets, activeSetIds: nextActive });
    persistState(set, get, nextActive, nextSets);
  },

  toggleSetForToday: (setId) => {
    const { sets, activeSetIds } = get();
    if (!sets.some((s) => s.id === setId)) return;
    const nextActive = activeSetIds.includes(setId)
      ? activeSetIds.filter((id) => id !== setId)
      : [...activeSetIds, setId];
    set({ activeSetIds: nextActive });
    persistState(set, get, nextActive, sets);
  },

  addCategoryToSet: (setId, categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    if (!key) return;
    if (!isPriorityCatalogAllowedKey(key)) return;
    const { sets, activeSetIds } = get();
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
    persistState(set, get, activeSetIds, nextSets);
  },

  removeCategoryFromSet: (setId, categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    const nextSets = sets.map((s) =>
      s.id === setId ? { ...s, items: s.items.filter((x) => x.categoryKey !== key) } : s,
    );
    set({ sets: nextSets });
    persistState(set, get, activeSetIds, nextSets);
  },

  setSetOrder: (setId, categoryKeys) => {
    const { sets, activeSetIds } = get();
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
    persistState(set, get, activeSetIds, nextSets);
  },

  setCategoryEnabledInSet: (setId, categoryKey, enabled) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds } = get();
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
    persistState(set, get, activeSetIds, nextSets);
  },

  setCategoryMealSlotInAnySet: (categoryKey, mealSlot) => {
    const key = categoryKey.trim();
    const normalized = normalizeDayMealSlot(mealSlot);
    if (!key || !normalized) return false;
    const { sets, activeSetIds } = get();
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
    persistState(set, get, activeSetIds, nextSets);
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

/** 목표 상세 요일 설정 등 fixedFlowSetsState 밖 변경 후 오늘 적용 목록 갱신 */
export function notifyFixedFlowApplyScheduleChanged(now?: Date): void {
  useFixedFlowSetsStore.getState().refreshTodayAppliedCategoryKeys(now);
}

/** @deprecated `todayAppliedCategoryKeys` 사용 */
export function selectMergedActiveFixedFlowCategoryKeys(): string[] {
  return useFixedFlowSetsStore.getState().todayAppliedCategoryKeys;
}
