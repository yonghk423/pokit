import { localStorageClient } from './localStorageClient';
import { StorageKeys, type StorageKey } from './storageKeys';

type Shape = { collapsedIds?: unknown };

function readRoot(storageKey: StorageKey): Shape {
  const raw = localStorageClient.getJson<Shape>(storageKey);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function writeRoot(storageKey: StorageKey, collapsedIds: string[]): void {
  localStorageClient.setJson(storageKey, { collapsedIds });
}

function normalizeIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  const out = new Set<string>();
  for (const value of raw) {
    const id = typeof value === 'string' ? value.trim() : '';
    if (id) out.add(id);
  }
  return out;
}

/** 포스트잇 그룹 — 접힌 id. 없으면 펼침(기본 전부 열림). */
export function loadCollapsedGroupIds(storageKey: StorageKey): Set<string> {
  return normalizeIds(readRoot(storageKey).collapsedIds);
}

export function saveCollapsedGroupIds(
  storageKey: StorageKey,
  ids: Iterable<string>,
): Set<string> {
  const next = new Set<string>();
  for (const value of ids) {
    const id = typeof value === 'string' ? value.trim() : '';
    if (id) next.add(id);
  }
  writeRoot(storageKey, [...next]);
  return next;
}

export function setCollapsedGroupId(
  storageKey: StorageKey,
  groupId: string,
  collapsed: boolean,
): Set<string> {
  const id = groupId.trim();
  const next = loadCollapsedGroupIds(storageKey);
  if (!id) return next;
  if (collapsed) next.add(id);
  else next.delete(id);
  return saveCollapsedGroupIds(storageKey, next);
}

/** 사라진 그룹 id만 정리. validIds가 비면 저장값을 건드리지 않는다. */
export function pruneCollapsedGroupIds(
  storageKey: StorageKey,
  validIds: readonly string[],
): Set<string> {
  const valid = new Set(validIds.map((id) => id.trim()).filter(Boolean));
  const prev = loadCollapsedGroupIds(storageKey);
  if (valid.size === 0) return prev;
  const next = new Set<string>();
  for (const id of prev) {
    if (valid.has(id)) next.add(id);
  }
  if (next.size === prev.size) return prev;
  return saveCollapsedGroupIds(storageKey, next);
}

export function resolveExpandedGroupIds(
  storageKey: StorageKey,
  visibleIds: readonly string[],
): Set<string> {
  const collapsed = loadCollapsedGroupIds(storageKey);
  return new Set(visibleIds.filter((id) => id.trim() && !collapsed.has(id)));
}

function bindCollapsedStorage(storageKey: StorageKey) {
  return {
    load: () => loadCollapsedGroupIds(storageKey),
    save: (ids: Iterable<string>) => saveCollapsedGroupIds(storageKey, ids),
    setCollapsed: (groupId: string, collapsed: boolean) =>
      setCollapsedGroupId(storageKey, groupId, collapsed),
    prune: (validIds: readonly string[]) => pruneCollapsedGroupIds(storageKey, validIds),
    resolveExpanded: (visibleIds: readonly string[]) =>
      resolveExpandedGroupIds(storageKey, visibleIds),
  };
}

const myRoutineCollapsed = bindCollapsedStorage(StorageKeys.myRoutineGroupCollapsed);
const routineCatalogCollapsed = bindCollapsedStorage(StorageKeys.routineCatalogGroupCollapsed);

export const loadMyRoutineCollapsedGroupIds = myRoutineCollapsed.load;
export const saveMyRoutineCollapsedGroupIds = myRoutineCollapsed.save;
export const setMyRoutineGroupCollapsed = myRoutineCollapsed.setCollapsed;
export const pruneMyRoutineCollapsedGroupIds = myRoutineCollapsed.prune;
export const resolveMyRoutineExpandedGroupIds = myRoutineCollapsed.resolveExpanded;

export const loadRoutineCatalogCollapsedGroupIds = routineCatalogCollapsed.load;
export const saveRoutineCatalogCollapsedGroupIds = routineCatalogCollapsed.save;
export const setRoutineCatalogGroupCollapsed = routineCatalogCollapsed.setCollapsed;
export const pruneRoutineCatalogCollapsedGroupIds = routineCatalogCollapsed.prune;
export const resolveRoutineCatalogExpandedGroupIds = routineCatalogCollapsed.resolveExpanded;
