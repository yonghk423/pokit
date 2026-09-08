import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  loadMyRoutineCollapsedGroupIds,
  loadRoutineCatalogCollapsedGroupIds,
  pruneMyRoutineCollapsedGroupIds,
  pruneRoutineCatalogCollapsedGroupIds,
  resolveMyRoutineExpandedGroupIds,
  resolveRoutineCatalogExpandedGroupIds,
  saveMyRoutineCollapsedGroupIds,
  saveRoutineCatalogCollapsedGroupIds,
  setMyRoutineGroupCollapsed,
  setRoutineCatalogGroupCollapsed,
} from './postItGroupCollapsedStorage';

describe('postItGroupCollapsedStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.myRoutineGroupCollapsed);
    localStorageClient.removeItem(StorageKeys.routineCatalogGroupCollapsed);
  });

  it('defaults to no collapsed groups so every visible group is expanded', () => {
    expect([...loadMyRoutineCollapsedGroupIds()]).toEqual([]);
    expect([...resolveMyRoutineExpandedGroupIds(['daily', 'weekend', 'health'])]).toEqual([
      'daily',
      'weekend',
      'health',
    ]);
    expect([...resolveRoutineCatalogExpandedGroupIds(['health', 'focus', 'tour'])]).toEqual([
      'health',
      'focus',
      'tour',
    ]);
  });

  it('persists collapsed groups across load', () => {
    setMyRoutineGroupCollapsed('weekend', true);
    setMyRoutineGroupCollapsed('health', true);
    expect([...loadMyRoutineCollapsedGroupIds()].sort()).toEqual(['health', 'weekend']);
    expect([...resolveMyRoutineExpandedGroupIds(['daily', 'weekend', 'health'])]).toEqual(['daily']);

    setMyRoutineGroupCollapsed('weekend', false);
    expect([...loadMyRoutineCollapsedGroupIds()]).toEqual(['health']);
  });

  it('keeps my-routine and catalog collapsed ids on separate keys', () => {
    setMyRoutineGroupCollapsed('weekend', true);
    setRoutineCatalogGroupCollapsed('tour', true);
    expect([...loadMyRoutineCollapsedGroupIds()]).toEqual(['weekend']);
    expect([...loadRoutineCatalogCollapsedGroupIds()]).toEqual(['tour']);
  });

  it('does not wipe collapsed ids when the visible list is empty', () => {
    saveMyRoutineCollapsedGroupIds(['weekend']);
    expect([...pruneMyRoutineCollapsedGroupIds([])]).toEqual(['weekend']);
    expect([...loadMyRoutineCollapsedGroupIds()]).toEqual(['weekend']);

    saveRoutineCatalogCollapsedGroupIds(['tour']);
    expect([...pruneRoutineCatalogCollapsedGroupIds([])]).toEqual(['tour']);
  });

  it('prunes vanished group ids only', () => {
    saveMyRoutineCollapsedGroupIds(['weekend', 'gone']);
    expect([...pruneMyRoutineCollapsedGroupIds(['daily', 'weekend'])]).toEqual(['weekend']);
  });
});
