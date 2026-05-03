import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type CustomCatalogGroup = {
  /** `customGroup:<uuid>` 형식 */
  key: string;
  label: string;
};

type Shape = { groups?: CustomCatalogGroup[] };

const PREFIX = 'customGroup:' as const;
const MAX_LABEL = 24;

/** `:` 뒤에 최소 1글자만 있으면 사용자 정의 그룹 키로 인정 (길이 상한은 저장 시 생성 로직에서 보장) */
export function isCustomCatalogGroupKey(k: string): boolean {
  return typeof k === 'string' && k.startsWith(PREFIX) && k.length > PREFIX.length;
}

function newCustomGroupId(): string {
  const c = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const u =
    c.crypto?.randomUUID?.() ??
    `${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
  return `${PREFIX}${u}`;
}

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.customCatalogGroups) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(groups: CustomCatalogGroup[]): void {
  localStorageClient.setJson(StorageKeys.customCatalogGroups, { groups });
}

function normalize(raw: Shape): CustomCatalogGroup[] {
  if (!Array.isArray(raw.groups)) return [];
  const out: CustomCatalogGroup[] = [];
  const seen = new Set<string>();
  for (const g of raw.groups) {
    if (!g || typeof g !== 'object') continue;
    const key = typeof g.key === 'string' ? g.key.trim() : '';
    const label = typeof g.label === 'string' ? g.label.trim().slice(0, MAX_LABEL) : '';
    if (!isCustomCatalogGroupKey(key) || seen.has(key) || label.length === 0) continue;
    seen.add(key);
    out.push({ key, label });
  }
  return out;
}

export function listCustomCatalogGroups(): CustomCatalogGroup[] {
  return normalize(readRoot());
}

/** 신규 그룹 생성 — label 정규화 후 신규 key 발급해 반환 */
export function createCustomCatalogGroup(label: string): CustomCatalogGroup | null {
  const trimmed = label.trim().slice(0, MAX_LABEL);
  if (trimmed.length === 0) return null;
  const cur = listCustomCatalogGroups();
  const dup = cur.find((g) => g.label === trimmed);
  if (dup) return dup;
  const next: CustomCatalogGroup = { key: newCustomGroupId(), label: trimmed };
  writeRoot([...cur, next]);
  return next;
}

export function renameCustomCatalogGroup(key: string, label: string): void {
  const trimmed = label.trim().slice(0, MAX_LABEL);
  if (trimmed.length === 0) return;
  const cur = listCustomCatalogGroups();
  const idx = cur.findIndex((g) => g.key === key);
  if (idx < 0) return;
  if (cur[idx].label === trimmed) return;
  const next = cur.slice();
  next[idx] = { key, label: trimmed };
  writeRoot(next);
}

export function removeCustomCatalogGroup(key: string): void {
  const next = listCustomCatalogGroups().filter((g) => g.key !== key);
  writeRoot(next);
}
