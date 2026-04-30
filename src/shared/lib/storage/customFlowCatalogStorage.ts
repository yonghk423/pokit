import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Shape = { ids?: string[] };

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.customFlowCatalog) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

/** 사용자가 만든 플로우(담기·고정 루틴) 카탈로그 키 — `customFlow:…` */
export function listCustomFlowCatalogIds(): string[] {
  const ids = readRoot().ids;
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const t = id.trim();
    if (!t.startsWith('customFlow:') || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function appendCustomFlowCatalogId(id: string): void {
  const t = id.trim();
  if (!t.startsWith('customFlow:')) return;
  const cur = listCustomFlowCatalogIds();
  if (cur.includes(t)) return;
  localStorageClient.setJson(StorageKeys.customFlowCatalog, { ids: [...cur, t] });
}

export function removeCustomFlowCatalogId(id: string): void {
  const t = id.trim();
  const next = listCustomFlowCatalogIds().filter((x) => x !== t);
  localStorageClient.setJson(StorageKeys.customFlowCatalog, { ids: next });
}
