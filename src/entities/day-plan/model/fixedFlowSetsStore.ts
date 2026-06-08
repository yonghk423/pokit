import { create } from 'zustand';

import {
  collectActiveFixedFlowCategoryKeys,
  createDefaultFixedFlowSetsState,
  getActiveFixedFlowSet,
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';
import { isPriorityCatalogAllowedKey } from '../lib/priorityCatalogRegistry';
import { sanitizeFixedFlowSetItems } from '../lib/sanitizeFixedFlowSetItems';
import { useDayPlanDraftStore } from './dayPlanDraftStore';

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
  isHydrated: boolean;

  hydrate: () => void;
  addSet: (name?: string) => void;
  renameSet: (setId: string, nextName: string) => void;
  removeSet: (setId: string) => void;
  /** 오늘 적용 그룹 토글 — 여러 그룹 동시 적용 가능 */
  toggleSetForToday: (setId: string) => void;

  addCategoryToSet: (setId: string, categoryKey: string) => void;
  removeCategoryFromSet: (setId: string, categoryKey: string) => void;
  setSetOrder: (setId: string, categoryKeys: string[]) => void;
  setCategoryEnabledInSet: (setId: string, categoryKey: string, enabled: boolean) => void;

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

function persistState(activeSetIds: string[], sets: FixedFlowSet[]): void {
  saveFixedFlowSetsState({ activeSetIds, sets });
  useDayPlanDraftStore.getState().bumpPriorityCatalogFixedRoutineEpoch();
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
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    let loaded = loadFixedFlowSetsState();
    if (loaded.sets.length === 0) {
      loaded = createDefaultFixedFlowSetsState();
    }
    const sanitized = sanitizeSetsState(loaded);
    const keysBefore = loaded.sets.map((s) => s.items.map((i) => i.categoryKey).join(',')).join('|');
    const keysAfter = sanitized.sets.map((s) => s.items.map((i) => i.categoryKey).join(',')).join('|');
    if (keysBefore !== keysAfter) {
      saveFixedFlowSetsState(sanitized);
      useDayPlanDraftStore.getState().bumpPriorityCatalogFixedRoutineEpoch();
    } else if (loaded.sets.length === 0) {
      saveFixedFlowSetsState(sanitized);
    }
    set({
      activeSetIds: sanitized.activeSetIds,
      sets: sanitized.sets,
      isHydrated: true,
    });
  },

  addSet: (name) => {
    const { sets, activeSetIds } = get();
    const labelRaw = typeof name === 'string' ? name.trim() : '';
    const nextName = labelRaw.length > 0 ? labelRaw.slice(0, 24) : nextSetName(sets);
    const nextSet: FixedFlowSet = {
      id: createSetId(),
      name: nextName,
      items: [],
    };
    const nextSets = [...sets, nextSet];
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },

  renameSet: (setId, nextName) => {
    const name = nextName.trim();
    if (!name) return;
    const { sets, activeSetIds } = get();
    const nextSets = sets.map((s) => (s.id === setId ? { ...s, name: name.slice(0, 24) } : s));
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },

  removeSet: (setId) => {
    const { sets, activeSetIds } = get();
    const nextSets = sets.filter((s) => s.id !== setId);
    const nextActive = activeSetIds.filter((id) => id !== setId);
    set({ sets: nextSets, activeSetIds: nextActive });
    persistState(nextActive, nextSets);
  },

  toggleSetForToday: (setId) => {
    const { sets, activeSetIds } = get();
    if (!sets.some((s) => s.id === setId)) return;
    const nextActive = activeSetIds.includes(setId)
      ? activeSetIds.filter((id) => id !== setId)
      : [...activeSetIds, setId];
    set({ activeSetIds: nextActive });
    persistState(nextActive, sets);
  },

  addCategoryToSet: (setId, categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    if (!isPriorityCatalogAllowedKey(key)) return;
    const { sets, activeSetIds } = get();
    const target = sets.find((s) => s.id === setId);
    if (!target) return;
    if (target.items.some((x) => x.categoryKey === key)) return;
    const nextSets = sets.map((s) =>
      s.id === setId ? { ...s, items: [...s.items, { categoryKey: key, enabled: true }] } : s,
    );
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
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
    persistState(activeSetIds, nextSets);
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
      items.push({ categoryKey: key, enabled: prev?.enabled !== false });
    }
    const nextSets = sets.map((s) => (s.id === setId ? { ...s, items } : s));
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
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
    persistState(activeSetIds, nextSets);
  },

  setActiveSetOrder: (categoryKeys) => {
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    const existing = mapSetItems(active.items);
    const seen = new Set<string>();
    const items: FixedFlowSetItem[] = [];
    for (const row of categoryKeys) {
      const key = row.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const prev = existing.get(key);
      items.push({ categoryKey: key, enabled: prev?.enabled !== false });
    }
    const nextSets = sets.map((s) => (s.id === active.id ? { ...s, items } : s));
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },

  addCategoryToActiveSet: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    if (active.items.some((x) => x.categoryKey === key)) return;
    const nextSets = sets.map((s) =>
      s.id === active.id ? { ...s, items: [...s.items, { categoryKey: key, enabled: true }] } : s,
    );
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },

  removeCategoryFromActiveSet: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    const nextSets = sets.map((s) =>
      s.id === active.id ? { ...s, items: s.items.filter((x) => x.categoryKey !== key) } : s,
    );
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },

  setCategoryEnabled: (categoryKey, enabled) => {
    const key = categoryKey.trim();
    if (!key) return;
    const { sets, activeSetIds } = get();
    const active = getActiveFixedFlowSet({ activeSetIds, sets });
    if (!active) return;
    const nextSets = sets.map((s) =>
      s.id === active.id
        ? {
            ...s,
            items: s.items.map((x) => (x.categoryKey === key ? { ...x, enabled } : x)),
          }
        : s,
    );
    set({ sets: nextSets });
    persistState(activeSetIds, nextSets);
  },
}));

/** 스토어 밖에서 적용 키 목록이 필요할 때 */
export function selectMergedActiveFixedFlowCategoryKeys(): string[] {
  const { activeSetIds, sets } = useFixedFlowSetsStore.getState();
  return collectActiveFixedFlowCategoryKeys({ activeSetIds, sets });
}
