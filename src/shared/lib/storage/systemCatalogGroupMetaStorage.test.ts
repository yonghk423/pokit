import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  resolveSystemCatalogGroupLabel,
  resolveSystemCatalogGroupSubtitle,
  updateSystemCatalogGroupMeta,
} from './systemCatalogGroupMetaStorage';

describe('systemCatalogGroupMetaStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.systemCatalogGroupMeta);
  });

  it('returns defaults when no override exists', () => {
    expect(resolveSystemCatalogGroupLabel('health')).toContain('건강');
    expect(resolveSystemCatalogGroupSubtitle('health')).toContain('수분');
  });

  it('persists custom title and subtitle for system groups', () => {
    updateSystemCatalogGroupMeta('health', {
      label: '몸 챙기기',
      subtitle: '오늘 필요한 몸 관리만 골라 담아요.',
    });
    expect(resolveSystemCatalogGroupLabel('health')).toBe('몸 챙기기');
    expect(resolveSystemCatalogGroupSubtitle('health')).toBe('오늘 필요한 몸 관리만 골라 담아요.');
  });
});
