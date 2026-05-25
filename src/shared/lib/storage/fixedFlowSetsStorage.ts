import { createDefaultFixedFlowSetsState } from './defaultFixedFlowSets';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type FixedFlowSetItem = {
  categoryKey: string;
  enabled: boolean;
};

export type FixedFlowSet = {
  id: string;
  name: string;
  items: FixedFlowSetItem[];
};

export type FixedFlowSetsState = {
  activeSetId: string | null;
  sets: FixedFlowSet[];
};

type PersistedShape = Partial<FixedFlowSetsState>;

function normalizeItems(raw: unknown): FixedFlowSetItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedFlowSetItem[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const key = typeof r.categoryKey === 'string' ? r.categoryKey.trim() : '';
    if (!key || seen.has(key)) continue;
    out.push({
      categoryKey: key,
      enabled: r.enabled !== false,
    });
    seen.add(key);
  }
  return out;
}

function normalizeSets(raw: unknown): FixedFlowSet[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedFlowSet[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    if (!id || seen.has(id)) continue;
    const nameRaw = typeof r.name === 'string' ? r.name.trim() : '';
    const name = nameRaw.length > 0 ? nameRaw.slice(0, 24) : '기본 세트';
    const items = normalizeItems(r.items);
    out.push({ id, name, items });
    seen.add(id);
  }
  return out;
}

export function normalizeFixedFlowSetsState(input: unknown): FixedFlowSetsState {
  const raw = input && typeof input === 'object' ? (input as PersistedShape) : {};
  const sets = normalizeSets(raw.sets);
  const activeSetIdRaw = typeof raw.activeSetId === 'string' ? raw.activeSetId.trim() : null;
  const activeSetId =
    activeSetIdRaw && sets.some((s) => s.id === activeSetIdRaw)
      ? activeSetIdRaw
      : sets[0]?.id ?? null;
  return { activeSetId, sets };
}

export function loadFixedFlowSetsState(): FixedFlowSetsState {
  const raw = localStorageClient.getJson<PersistedShape>(StorageKeys.fixedFlowSets);
  const normalized = normalizeFixedFlowSetsState(raw);
  if (normalized.sets.length > 0) return normalized;
  const legacy = localStorageClient.getJson<{ categoryKeys?: string[] }>(
    StorageKeys.priorityCatalogFixedRoutines,
  );
  const legacyKeys = Array.isArray(legacy?.categoryKeys)
    ? legacy.categoryKeys
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k): k is string => k.length > 0)
    : [];
  if (legacyKeys.length === 0) {
    const defaults = createDefaultFixedFlowSetsState();
    saveFixedFlowSetsState(defaults);
    return defaults;
  }
  const migrated: FixedFlowSetsState = {
    activeSetId: 'default',
    sets: [
      {
        id: 'default',
        name: '기본 세트',
        items: [...new Set(legacyKeys)].map((categoryKey) => ({ categoryKey, enabled: true })),
      },
    ],
  };
  saveFixedFlowSetsState(migrated);
  return migrated;
}

export function saveFixedFlowSetsState(next: FixedFlowSetsState): void {
  const normalized = normalizeFixedFlowSetsState(next);
  localStorageClient.setJson(StorageKeys.fixedFlowSets, normalized);
}

export function getActiveFixedFlowSet(state: FixedFlowSetsState): FixedFlowSet | null {
  if (!state.activeSetId) return null;
  return state.sets.find((s) => s.id === state.activeSetId) ?? null;
}

export function loadActiveFixedFlowCategoryKeys(): string[] {
  const state = loadFixedFlowSetsState();
  const active = getActiveFixedFlowSet(state);
  if (!active) return [];
  return active.items.filter((x) => x.enabled).map((x) => x.categoryKey);
}
