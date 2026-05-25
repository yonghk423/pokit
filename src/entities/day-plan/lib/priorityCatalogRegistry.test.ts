jest.mock('@shared/lib/storage', () => ({
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
    expect(standard).not.toContain('creative');
    expect(standard).not.toContain('work');
    expect(standard).not.toContain('inbox');
  });

  it('filters fixed set keys to catalog-only', () => {
    const filtered = filterKeysToPriorityCatalog([
      'reading',
      'creative',
      'work',
      'water',
      'water',
    ]);
    expect(filtered).toEqual(['reading', 'water']);
  });
});
