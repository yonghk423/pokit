import { resolveTodayFixedRoutineKeys } from './resolveTodayFixedRoutineKeys';

describe('resolveTodayFixedRoutineKeys', () => {
  it('merges manual active sets and excludes dismissed keys', () => {
    const keys = resolveTodayFixedRoutineKeys(
      {
        activeSetIds: ['set_a'],
        sets: [
          {
            id: 'set_a',
            name: 'A',
            applyRule: 'manual',
            items: [
              { categoryKey: 'water', enabled: true },
              { categoryKey: 'reading', enabled: true },
            ],
          },
        ],
      },
      { excludedKeys: ['reading'] },
    );
    expect(keys).toEqual(['water']);
  });
});
