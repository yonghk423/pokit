import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Shape = { dismissed?: string[] };

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.dismissedCatalogGroups) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(dismissed: string[]): void {
  localStorageClient.setJson(StorageKeys.dismissedCatalogGroups, { dismissed });
}

/** 담기 화면에서 숨긴 상위 묶음 키 */
export function loadDismissedCatalogGroupKeys(): string[] {
  const raw = readRoot().dismissed;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of raw) {
    const t = typeof key === 'string' ? key.trim() : '';
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function isCatalogGroupDismissed(groupKey: string): boolean {
  const t = groupKey.trim();
  if (!t) return false;
  return loadDismissedCatalogGroupKeys().includes(t);
}

export function dismissCatalogGroupKey(groupKey: string): void {
  const t = groupKey.trim();
  if (!t || isCatalogGroupDismissed(t)) return;
  writeRoot([...loadDismissedCatalogGroupKeys(), t]);
}

export function restoreCatalogGroupKey(groupKey: string): void {
  const t = groupKey.trim();
  if (!t) return;
  const next = loadDismissedCatalogGroupKeys().filter((k) => k !== t);
  if (next.length === loadDismissedCatalogGroupKeys().length) return;
  writeRoot(next);
}
