import { isPriorityCatalogAllowedKey } from './priorityCatalogRegistry';

jest.mock('@shared/lib/storage', () => ({
  listAllCustomFlowCatalogEntries: jest.fn(() => [
    { id: 'customFlow:legacy-only', groupKey: 'productivity' },
  ]),
  listCustomFlowCatalogEntries: jest.fn(() => []),
}));

import {
  filterKeysToPriorityCatalog,
  getPriorityCatalogStandardKeys,
} from './priorityCatalogRegistry';

describe('priorityCatalogRegistry', () => {
  it('excludes removed keys from standard catalog', () => {
    const standard = getPriorityCatalogStandardKeys();
    expect(standard).toContain('reading');
    expect(standard).toContain('water');
    expect(standard).toContain('meditation');
    expect(standard).toContain('deepwork');
    expect(standard).not.toContain('other');
    expect(standard).not.toContain('yoga');
    expect(standard).not.toContain('coding');
  });

  it('filters fixed set keys to catalog-only', () => {
    const filtered = filterKeysToPriorityCatalog([
      'reading',
      'yoga',
      'coding',
      'water',
      'water',
      'other',
    ]);
    expect(filtered).toEqual(['reading', 'water']);
  });

  it('allows config-only customFlow keys', () => {
    expect(isPriorityCatalogAllowedKey('customFlow:legacy-only')).toBe(true);
  });
});
