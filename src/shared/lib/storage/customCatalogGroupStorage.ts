import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type CustomCatalogGroup = {
  /** `customGroup:<uuid>` 형식 */
  key: string;
  label: string;
  subtitle?: string;
};

type Shape = { groups?: CustomCatalogGroup[] };

const PREFIX = 'customGroup:' as const;
const MAX_LABEL = 24;
const MAX_SUBTITLE = 120;

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
    const subtitleRaw = typeof g.subtitle === 'string' ? g.subtitle.trim().slice(0, MAX_SUBTITLE) : '';
    if (!isCustomCatalogGroupKey(key) || seen.has(key) || label.length === 0) continue;
    seen.add(key);
    out.push({
      key,
      label,
      ...(subtitleRaw.length > 0 ? { subtitle: subtitleRaw } : {}),
    });
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

export function updateCustomCatalogGroup(
  key: string,
  input: { label: string; subtitle?: string },
): void {
  const trimmedLabel = input.label.trim().slice(0, MAX_LABEL);
  if (trimmedLabel.length === 0) return;
  const trimmedSubtitle =
    typeof input.subtitle === 'string' ? input.subtitle.trim().slice(0, MAX_SUBTITLE) : '';
  const cur = listCustomCatalogGroups();
  const idx = cur.findIndex((g) => g.key === key);
  if (idx < 0) return;
  const nextEntry: CustomCatalogGroup = {
    key,
    label: trimmedLabel,
    ...(trimmedSubtitle.length > 0 ? { subtitle: trimmedSubtitle } : {}),
  };
  const prev = cur[idx];
  if (prev.label === nextEntry.label && (prev.subtitle ?? '') === (nextEntry.subtitle ?? '')) {
    return;
  }
  const next = cur.slice();
  next[idx] = nextEntry;
  writeRoot(next);
}

export function renameCustomCatalogGroup(key: string, label: string): void {
  const cur = listCustomCatalogGroups();
  const existing = cur.find((g) => g.key === key);
  updateCustomCatalogGroup(key, { label, subtitle: existing?.subtitle });
}

export function removeCustomCatalogGroup(key: string): void {
  const next = listCustomCatalogGroups().filter((g) => g.key !== key);
  writeRoot(next);
}
