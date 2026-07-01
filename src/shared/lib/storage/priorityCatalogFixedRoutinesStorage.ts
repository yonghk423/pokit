import {
  type FixedFlowSet,
  loadActiveFixedFlowCategoryKeys,
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from './fixedFlowSetsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type LegacyPersistedShape = {
  categoryKeys?: string[];
};

function normalizeLegacyKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of raw) {
    const key = typeof row === 'string' ? row.trim() : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function createDefaultSet(categoryKeys: string[]): FixedFlowSet {
  return {
    id: 'default',
    name: '기본 세트',
    applyRule: 'manual',
    items: categoryKeys.map((categoryKey) => ({ categoryKey, enabled: true })),
  };
}

function ensureMigratedFromLegacy(): void {
  const next = loadFixedFlowSetsState();
  const legacy = localStorageClient.getJson<LegacyPersistedShape>(StorageKeys.priorityCatalogFixedRoutines);
  const legacyKeys = normalizeLegacyKeys(legacy?.categoryKeys);
  if (legacyKeys.length === 0) return;
  const hasManualSet = next.sets.some((set) => set.applyRule === 'manual');
  if (hasManualSet) return;
  const nextSets = [...next.sets, createDefaultSet(legacyKeys)];
  const nextActiveSetIds = [...new Set([...next.activeSetIds, 'default'])];
  saveFixedFlowSetsState({
    activeSetIds: nextActiveSetIds,
    sets: nextSets,
  });
}

export function loadPriorityCatalogFixedRoutineKeys(): string[] {
  ensureMigratedFromLegacy();
  return loadActiveFixedFlowCategoryKeys();
}

export function savePriorityCatalogFixedRoutineKeys(categoryKeys: string[]): void {
  ensureMigratedFromLegacy();
  const state = loadFixedFlowSetsState();
  const manualSet = state.sets.find((set) => set.applyRule === 'manual');
  const activeManualId = state.activeSetIds.find((setId) =>
    state.sets.some((set) => set.id === setId && set.applyRule === 'manual'),
  );
  const activeId = activeManualId ?? manualSet?.id ?? 'default';
  const seen = new Set<string>();
  const normalized = categoryKeys
    .map((k) => k.trim())
    .filter((k) => {
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const sets = [...state.sets];
  const idx = sets.findIndex((s) => s.id === activeId);
  const updated = createDefaultSet(normalized);
  updated.id = activeId;
  updated.name = sets[idx]?.name ?? '기본 세트';
  updated.applyRule = sets[idx]?.applyRule ?? 'manual';
  if (idx >= 0) sets[idx] = updated;
  else sets.push(updated);
  const activeSetIds =
    state.activeSetIds.length > 0 ? state.activeSetIds : [activeId];
  saveFixedFlowSetsState({ activeSetIds, sets });
  localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
    categoryKeys: [...normalized],
  });
}
