import {
  isSystemCatalogGroupKey,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
} from './customCatalogGroup';

describe('customCatalogGroup', () => {
  it('recognizes system group keys', () => {
    expect(isSystemCatalogGroupKey('health')).toBe(true);
    expect(isSystemCatalogGroupKey('productivity')).toBe(true);
    expect(isSystemCatalogGroupKey('customGroup:x')).toBe(false);
  });

  it('has Korean labels for system groups', () => {
    expect(SYSTEM_CATALOG_GROUP_LABEL_KO.health).toContain('건강');
    expect(SYSTEM_CATALOG_GROUP_LABEL_KO.productivity).toContain('생산성');
  });
});
