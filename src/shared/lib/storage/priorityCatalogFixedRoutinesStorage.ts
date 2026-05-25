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
    items: categoryKeys.map((categoryKey) => ({ categoryKey, enabled: true })),
  };
}

function ensureMigratedFromLegacy(): void {
  const next = loadFixedFlowSetsState();
  if (next.sets.length > 0) return;
  const legacy = localStorageClient.getJson<LegacyPersistedShape>(StorageKeys.priorityCatalogFixedRoutines);
  const legacyKeys = normalizeLegacyKeys(legacy?.categoryKeys);
  if (legacyKeys.length === 0) return;
  saveFixedFlowSetsState({
    activeSetId: 'default',
    sets: [createDefaultSet(legacyKeys)],
  });
}

export function loadPriorityCatalogFixedRoutineKeys(): string[] {
  ensureMigratedFromLegacy();
  return loadActiveFixedFlowCategoryKeys();
}

export function savePriorityCatalogFixedRoutineKeys(categoryKeys: string[]): void {
  ensureMigratedFromLegacy();
  const state = loadFixedFlowSetsState();
  const activeId = state.activeSetId ?? state.sets[0]?.id ?? 'default';
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
  if (idx >= 0) sets[idx] = updated;
  else sets.push(updated);
  saveFixedFlowSetsState({ activeSetId: activeId, sets });
  localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
    categoryKeys: [...normalized],
  });
}
