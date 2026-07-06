import { sanitizeFixedFlowSetItems } from './sanitizeFixedFlowSetItems';

describe('sanitizeFixedFlowSetItems', () => {
  it('keeps only catalog-allowed keys and preserves enabled flag', () => {
    const items = sanitizeFixedFlowSetItems([
      { categoryKey: 'reading', enabled: false },
      { categoryKey: 'invalid_key', enabled: true },
      { categoryKey: 'water', enabled: true },
    ]);
    expect(items).toEqual([
      { categoryKey: 'reading', enabled: false, mealSlot: undefined },
      { categoryKey: 'water', enabled: true, mealSlot: undefined },
    ]);
  });

  it('dedupes by catalog order', () => {
    const items = sanitizeFixedFlowSetItems([
      { categoryKey: 'water', enabled: true },
      { categoryKey: 'water', enabled: false },
    ]);
    expect(items).toEqual([{ categoryKey: 'water', enabled: false, mealSlot: undefined }]);
  });
});
