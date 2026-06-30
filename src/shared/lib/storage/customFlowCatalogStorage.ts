import { listGoalDetailCategoryConfigKeys } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

/** 사용자가 만든 플로우 1개의 카탈로그 메타 — 키와 소속 상위 그룹 */
export type CustomFlowCatalogEntry = {
  id: string;
  /** `health` | `productivity` | `customGroup:<uuid>` */
  groupKey: string;
};

type Shape = {
  /** 신규 형식 — id + groupKey */
  items?: CustomFlowCatalogEntry[];
  /** legacy(이전 버전) — id 만 저장된 형태. 읽기 시 `productivity` 로 마이그레이션 */
  ids?: string[];
};

/** 기본 그룹 — 신규 추가/legacy 마이그레이션 시 사용 */
export const DEFAULT_CUSTOM_FLOW_GROUP_KEY = 'productivity';

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.customFlowCatalog) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(items: CustomFlowCatalogEntry[]): void {
  localStorageClient.setJson(StorageKeys.customFlowCatalog, { items });
  notifyCustomFlowCatalogChanged();
}

function normalizeEntries(raw: Shape): CustomFlowCatalogEntry[] {
  const out: CustomFlowCatalogEntry[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw.items)) {
    for (const it of raw.items) {
      if (!it || typeof it !== 'object') continue;
      const id = typeof it.id === 'string' ? it.id.trim() : '';
      if (!id.startsWith('customFlow:') || seen.has(id)) continue;
      const groupKey =
        typeof it.groupKey === 'string' && it.groupKey.trim().length > 0
          ? it.groupKey.trim()
          : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
      seen.add(id);
      out.push({ id, groupKey });
    }
  }

  if (Array.isArray(raw.ids)) {
    for (const id of raw.ids) {
      if (typeof id !== 'string') continue;
      const t = id.trim();
      if (!t.startsWith('customFlow:') || seen.has(t)) continue;
      seen.add(t);
      out.push({ id: t, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
    }
  }

  return out;
}

/** 사용자가 만든 플로우(담기·고정 루틴) 카탈로그 — 신규 형식(그룹 포함) */
export function listCustomFlowCatalogEntries(): CustomFlowCatalogEntry[] {
  return normalizeEntries(readRoot());
}

/** 기존 호환 — id 만 반환 */
export function listCustomFlowCatalogIds(): string[] {
  return listCustomFlowCatalogEntries().map((e) => e.id);
}

/**
 * catalog 항목이 누락되었지만 goal-detail config에는 존재하는 customFlow를 보강해 반환.
 * 담기·나만의 루틴·허용 키 판별이 동일한 목록을 쓰도록 한다.
 */
export function listAllCustomFlowCatalogEntries(): CustomFlowCatalogEntry[] {
  const stored = listCustomFlowCatalogEntries();
  const known = new Map(stored.map((e) => [e.id, e] as const));
  for (const id of listGoalDetailCategoryConfigKeys()) {
    if (!id.startsWith('customFlow:') || known.has(id)) continue;
    known.set(id, { id, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
  }
  return [...known.values()];
}

type CustomFlowCatalogListener = () => void;
const customFlowCatalogListeners = new Set<CustomFlowCatalogListener>();

/** customFlow 카탈로그 저장소 변경 구독 — 탭 간 목록 동기화용 */
export function subscribeCustomFlowCatalog(listener: CustomFlowCatalogListener): () => void {
  customFlowCatalogListeners.add(listener);
  return () => {
    customFlowCatalogListeners.delete(listener);
  };
}

function notifyCustomFlowCatalogChanged(): void {
  for (const listener of customFlowCatalogListeners) {
    listener();
  }
}

/** 그룹 정보를 명시해서 추가 — 이미 있으면 group 만 갱신 */
export function appendCustomFlowCatalogEntry(entry: CustomFlowCatalogEntry): void {
  const id = entry.id.trim();
  if (!id.startsWith('customFlow:')) return;
  const groupKey =
    entry.groupKey && entry.groupKey.trim().length > 0
      ? entry.groupKey.trim()
      : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  const cur = listCustomFlowCatalogEntries();
  const idx = cur.findIndex((e) => e.id === id);
  if (idx >= 0) {
    if (cur[idx].groupKey === groupKey) return;
    const next = cur.slice();
    next[idx] = { id, groupKey };
    writeRoot(next);
    return;
  }
  writeRoot([...cur, { id, groupKey }]);
}

/** 기존 호환 — 그룹은 기본값(`productivity`) */
export function appendCustomFlowCatalogId(id: string): void {
  appendCustomFlowCatalogEntry({ id, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
}

/** customFlow의 상위 그룹 변경 */
export function updateCustomFlowCatalogGroup(id: string, groupKey: string): void {
  const t = id.trim();
  if (!t.startsWith('customFlow:')) return;
  const next = groupKey.trim().length > 0 ? groupKey.trim() : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  const cur = listCustomFlowCatalogEntries();
  const idx = cur.findIndex((e) => e.id === t);
  if (idx < 0) {
    writeRoot([...cur, { id: t, groupKey: next }]);
    return;
  }
  if (cur[idx].groupKey === next) return;
  const updated = cur.slice();
  updated[idx] = { id: t, groupKey: next };
  writeRoot(updated);
}

export function removeCustomFlowCatalogId(id: string): void {
  const t = id.trim();
  const next = listCustomFlowCatalogEntries().filter((e) => e.id !== t);
  writeRoot(next);
}

/** 특정 그룹에 속한 entry 들의 그룹을 모두 기본 그룹으로 되돌림 — 그룹 삭제 시 사용 */
export function reassignCustomFlowGroup(fromGroupKey: string, toGroupKey: string): void {
  const target = toGroupKey.trim().length > 0 ? toGroupKey.trim() : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  const cur = listCustomFlowCatalogEntries();
  let changed = false;
  const next = cur.map((e) => {
    if (e.groupKey !== fromGroupKey) return e;
    changed = true;
    return { id: e.id, groupKey: target };
  });
  if (changed) writeRoot(next);
}
