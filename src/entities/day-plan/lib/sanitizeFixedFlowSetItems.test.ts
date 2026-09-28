import { sanitizeFixedFlowSetItems } from './sanitizeFixedFlowSetItems';

describe('sanitizeFixedFlowSetItems', () => {
  it('keeps only catalog-allowed keys and preserves enabled flag', () => {
    const items = sanitizeFixedFlowSetItems([
      { categoryKey: 'reading', enabled: false },
      { categoryKey: 'invalid_key', enabled: true },
      { categoryKey: 'water', enabled: true },
    ]);
    expect(items).toEqual([
      {
        categoryKey: 'water',
        enabled: true,
        mealSlot: undefined,
        mealSlots: undefined,
        spineStartMinutes: undefined,
        spineEndMinutes: undefined,
      },
    ]);
  });

  it('dedupes by catalog order', () => {
    const items = sanitizeFixedFlowSetItems([
      { categoryKey: 'water', enabled: true },
      { categoryKey: 'water', enabled: false },
    ]);
    expect(items).toEqual([{ categoryKey: 'water', enabled: false, mealSlot: undefined }]);
  });

  it('keeps non-catalog keys when a manual spine schedule exists', () => {
    const items = sanitizeFixedFlowSetItems([
      {
        categoryKey: 'legacy:unknown_routine',
        enabled: true,
        spineStartMinutes: 8 * 60,
        spineEndMinutes: 8 * 60 + 30,
      },
    ]);
    expect(items).toEqual([
      {
        categoryKey: 'legacy:unknown_routine',
        enabled: true,
        mealSlot: undefined,
        mealSlots: undefined,
        spineStartMinutes: 8 * 60,
        spineEndMinutes: 8 * 60 + 30,
      },
    ]);
  });
});
