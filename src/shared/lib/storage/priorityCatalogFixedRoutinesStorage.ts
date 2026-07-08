import {
  EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS,
  EXAMPLE_CUSTOM_FLOW_SET_NAME,
} from './defaultFixedFlowSets';
import {
  type FixedFlowSet,
  loadActiveFixedFlowCategoryKeys,
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from './fixedFlowSetsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

/** @shared/lib/storage 전용 — entities 순환 import 방지 */
const RETIRED_ROUTINE_CATALOG_SELECTION_KEYS = new Set(['medicine', 'water', 'meditation', 'other']);

function sanitizeRoutineCatalogSelectionKeys(keys: string[]): string[] {
  return normalizeLegacyKeys(keys).filter((key) => !RETIRED_ROUTINE_CATALOG_SELECTION_KEYS.has(key));
}

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

/** 루틴 탭에서 사용자가 직접 선택한 항목 — 오늘 탭 담기와 동기화 시 보존 */
export function loadRoutineCatalogSelectionKeys(): string[] {
  const legacy = localStorageClient.getJson<LegacyPersistedShape>(StorageKeys.priorityCatalogFixedRoutines);
  return sanitizeRoutineCatalogSelectionKeys(normalizeLegacyKeys(legacy?.categoryKeys));
}

export function saveRoutineCatalogSelectionKeys(categoryKeys: string[]): void {
  const normalized = sanitizeRoutineCatalogSelectionKeys(categoryKeys);
  localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
    categoryKeys: normalized,
  });
}

function createDefaultSet(categoryKeys: string[]): FixedFlowSet {
  const keys =
    categoryKeys.length > 0 ? categoryKeys : [...EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS];
  return {
    id: 'default',
    name: EXAMPLE_CUSTOM_FLOW_SET_NAME,
    applyRule: 'manual',
    items: keys.map((categoryKey) => ({ categoryKey, enabled: true })),
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
  updated.name = sets[idx]?.name ?? EXAMPLE_CUSTOM_FLOW_SET_NAME;
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
