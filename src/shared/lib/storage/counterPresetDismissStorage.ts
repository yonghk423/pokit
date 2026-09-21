import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Shape = { dismissed?: string[] };

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.dismissedCounterPresets) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(dismissed: string[]): void {
  localStorageClient.setJson(StorageKeys.dismissedCounterPresets, { dismissed });
}

/** 횟수 루틴「자주 쓰는 예시」에서 숨긴 프리셋 id */
export function loadDismissedCounterPresetIds(): string[] {
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

export function isCounterPresetDismissed(presetId: string): boolean {
  const t = presetId.trim();
  if (!t) return false;
  return loadDismissedCounterPresetIds().includes(t);
}

export function dismissCounterPresetId(presetId: string): void {
  const t = presetId.trim();
  if (!t || isCounterPresetDismissed(t)) return;
  writeRoot([...loadDismissedCounterPresetIds(), t]);
}

/** 「자주 쓰는 예시」 섹션 전체를 숨김 */
export function dismissAllCounterPresets(presetIds: readonly string[]): void {
  const existing = new Set(loadDismissedCounterPresetIds());
  let changed = false;
  for (const id of presetIds) {
    const t = typeof id === 'string' ? id.trim() : '';
    if (!t || existing.has(t)) continue;
    existing.add(t);
    changed = true;
  }
  if (!changed) return;
  writeRoot([...existing]);
}
