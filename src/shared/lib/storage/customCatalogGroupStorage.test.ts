import { localStorageClient } from './localStorageClient';
import {
  createCustomCatalogGroup,
  isCustomCatalogGroupKey,
  listCustomCatalogGroups,
  removeCustomCatalogGroup,
  renameCustomCatalogGroup,
} from './customCatalogGroupStorage';
import { StorageKeys } from './storageKeys';

describe('customCatalogGroupStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
  });

  it('validates custom group key prefix', () => {
    expect(isCustomCatalogGroupKey('customGroup:abc')).toBe(true);
    expect(isCustomCatalogGroupKey('productivity')).toBe(false);
    expect(isCustomCatalogGroupKey('customGroup:')).toBe(false);
  });

  it('creates and lists a custom group', () => {
    const created = createCustomCatalogGroup('나만의 그룹');
    expect(created).not.toBeNull();
    expect(listCustomCatalogGroups()).toHaveLength(1);
    expect(listCustomCatalogGroups()[0]?.label).toBe('나만의 그룹');
  });

  it('creates a custom group with subtitle', () => {
    const created = createCustomCatalogGroup('집중 묶음', '아침에 쓰는 항목');
    expect(created).not.toBeNull();
    expect(listCustomCatalogGroups()[0]).toEqual({
      key: created!.key,
      label: '집중 묶음',
      subtitle: '아침에 쓰는 항목',
    });
  });

  it('reuses group when label already exists', () => {
    const a = createCustomCatalogGroup('중복');
    const b = createCustomCatalogGroup('중복');
    expect(a?.key).toBe(b?.key);
    expect(listCustomCatalogGroups()).toHaveLength(1);
  });

  it('renames and removes a group', () => {
    const created = createCustomCatalogGroup('이전');
    expect(created).not.toBeNull();
    renameCustomCatalogGroup(created!.key, '이후');
    expect(listCustomCatalogGroups()[0]?.label).toBe('이후');
    removeCustomCatalogGroup(created!.key);
    expect(listCustomCatalogGroups()).toHaveLength(0);
  });
});
