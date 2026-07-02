import { syncPriorityOrderWithAppliedFixedRoutines } from '@entities/day-plan';

describe('syncPriorityOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['water', 'reading', 'stretching', 'deepwork']);

  it('removes fixed-flow keys that are not applied today', () => {
    const order = ['water', 'reading', 'study'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['study']);
  });

  it('prepends applied fixed keys and keeps manual catalog keys', () => {
    const order = ['study', 'water'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water', 'reading'], allFixed),
    ).toEqual(['reading', 'study', 'water']);
  });

  it('drops unapplied fixed keys when apply is turned off', () => {
    const order = ['water', 'reading', 'deepwork', 'stretching', 'study'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['water', 'study']);
  });
});
