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
