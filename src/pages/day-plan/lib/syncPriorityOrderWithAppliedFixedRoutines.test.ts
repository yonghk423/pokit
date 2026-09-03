import { syncPriorityOrderWithAppliedFixedRoutines } from '@entities/day-plan';

describe('syncPriorityOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['water', 'reading', 'stretching', 'deepwork']);

  it('removes fixed-flow keys that are not applied today', () => {
    const order = ['water', 'reading', 'study'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['study']);
  });

  it('keeps applied fixed keys and manual catalog keys in existing order', () => {
    const order = ['study', 'water'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water', 'reading'], allFixed),
    ).toEqual(['study', 'water']);
  });

  it('drops unapplied fixed keys when apply is turned off', () => {
    const order = ['water', 'reading', 'deepwork', 'stretching', 'study'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['water', 'study']);
  });

  it('removes orphaned customFlow keys with no catalog selection', () => {
    const order = ['study', 'customFlow:deleted-from-fixed'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['study']);
  });
});
