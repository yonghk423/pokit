import { ensureFixedRoutinesInPriorityOrder } from './ensureFixedRoutinesInPriorityOrder';

describe('ensureFixedRoutinesInPriorityOrder', () => {
  it('prepends missing fixed keys without reordering existing', () => {
    const order = ['study', 'reading'];
    const fixed = ['water', 'reading', 'stretching'];
    expect(ensureFixedRoutinesInPriorityOrder(order, fixed)).toEqual([
      'water',
      'stretching',
      'study',
      'reading',
    ]);
  });

  it('returns same array when nothing is missing', () => {
    const order = ['water', 'reading'];
    expect(ensureFixedRoutinesInPriorityOrder(order, ['water', 'reading'])).toBe(order);
  });
});
