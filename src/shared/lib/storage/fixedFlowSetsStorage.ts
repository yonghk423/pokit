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
  /** 오늘 담기에 적용 중인 그룹 id (여러 개 가능) */
  activeSetIds: string[];
  sets: FixedFlowSet[];
};

type PersistedShape = Partial<FixedFlowSetsState> & {
  /** 레거시 단일 적용 id — 읽기 전용 마이그레이션 */
  activeSetId?: string | null;
};

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

function normalizeActiveSetIds(raw: PersistedShape, sets: FixedFlowSet[]): string[] {
  const valid = new Set(sets.map((s) => s.id));
  const seen = new Set<string>();
  const out: string[] = [];

  const pushId = (id: string) => {
    if (!valid.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  if (Array.isArray(raw.activeSetIds)) {
    for (const row of raw.activeSetIds) {
      if (typeof row !== 'string') continue;
      pushId(row.trim());
    }
    return out;
  }

  const legacy =
    typeof raw.activeSetId === 'string' ? raw.activeSetId.trim() : '';
  if (legacy) pushId(legacy);
  return out;
}

export function normalizeFixedFlowSetsState(input: unknown): FixedFlowSetsState {
  const raw = input && typeof input === 'object' ? (input as PersistedShape) : {};
  const sets = normalizeSets(raw.sets);
  const activeSetIds = normalizeActiveSetIds(raw, sets);
  return { activeSetIds, sets };
}

/** 적용 중인 그룹들의 활성 항목 키 — 그룹 순서·항목 순서 유지, 중복 제거 */
export function collectActiveFixedFlowCategoryKeys(state: FixedFlowSetsState): string[] {
  const active = new Set(state.activeSetIds);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const set of state.sets) {
    if (!active.has(set.id)) continue;
    for (const item of set.items) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
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
    activeSetIds: ['default'],
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

/** @deprecated 첫 번째 적용 그룹 — 레거시 단일 세트 API용 */
export function getActiveFixedFlowSet(state: FixedFlowSetsState): FixedFlowSet | null {
  for (const set of state.sets) {
    if (state.activeSetIds.includes(set.id)) return set;
  }
  return null;
}

export function loadActiveFixedFlowCategoryKeys(): string[] {
  const state = loadFixedFlowSetsState();
  return collectActiveFixedFlowCategoryKeys(state);
}
