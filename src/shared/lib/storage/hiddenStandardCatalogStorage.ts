import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Shape = { hidden?: string[] };

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.hiddenStandardCatalogKeys) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(hidden: string[]): void {
  localStorageClient.setJson(StorageKeys.hiddenStandardCatalogKeys, { hidden });
}

/** 담기 목록에서 숨긴 표준 카테고리 키 */
export function loadHiddenStandardCatalogKeys(): string[] {
  const raw = readRoot().hidden;
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

export function isStandardCatalogKeyHidden(categoryKey: string): boolean {
  const t = categoryKey.trim();
  if (!t) return false;
  return loadHiddenStandardCatalogKeys().includes(t);
}

export function hideStandardCatalogKey(categoryKey: string): void {
  const t = categoryKey.trim();
  if (!t || isStandardCatalogKeyHidden(t)) return;
  writeRoot([...loadHiddenStandardCatalogKeys(), t]);
}

export function restoreStandardCatalogKey(categoryKey: string): void {
  const t = categoryKey.trim();
  if (!t) return;
  const next = loadHiddenStandardCatalogKeys().filter((k) => k !== t);
  if (next.length === loadHiddenStandardCatalogKeys().length) return;
  writeRoot(next);
}
