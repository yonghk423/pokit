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

  it('keeps weekend applied set only on Saturday/Sunday', () => {
    const flowSets = {
      activeSetIds: ['set_weekend'],
      activeMealSlotsBySetId: {},
      sets: [
        {
          id: 'set_weekend',
          name: '주말',
          applyRule: 'weekend' as const,
          applyWeekdays: [0, 6],
          items: [{ categoryKey: 'fasting', enabled: true }],
        },
      ],
    };
    expect(
      resolveTodayFixedRoutineKeys(flowSets, { now: new Date(2026, 8, 18, 8, 0, 0) }),
    ).toEqual([]);
    expect(
      resolveTodayFixedRoutineKeys(flowSets, { now: new Date(2026, 8, 19, 8, 0, 0) }),
    ).toEqual(['fasting']);
  });
});
