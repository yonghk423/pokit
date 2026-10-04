import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedAnnouncementReads = {
  ids: string[];
};

function loadIdSet(): Set<string> {
  const v = localStorageClient.getJson<PersistedAnnouncementReads>(StorageKeys.announcementReadIds);
  const ids = Array.isArray(v?.ids) ? v.ids.filter((id) => typeof id === 'string') : [];
  return new Set(ids);
}

export function loadAnnouncementReadIds(): string[] {
  return [...loadIdSet()];
}

export function isAnnouncementRead(id: string): boolean {
  return loadIdSet().has(id);
}

export function markAnnouncementRead(id: string): void {
  const next = loadIdSet();
  if (next.has(id)) return;
  next.add(id);
  localStorageClient.setJson<PersistedAnnouncementReads>(StorageKeys.announcementReadIds, {
    ids: [...next],
  });
}

/** 여러 공지를 한 번에 읽음 처리 (이미 읽은 id는 건너뜀) */
export function markAnnouncementsRead(ids: string[]): void {
  if (ids.length === 0) return;
  const next = loadIdSet();
  let changed = false;
  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0 || next.has(id)) continue;
    next.add(id);
    changed = true;
  }
  if (!changed) return;
  localStorageClient.setJson<PersistedAnnouncementReads>(StorageKeys.announcementReadIds, {
    ids: [...next],
  });
}
