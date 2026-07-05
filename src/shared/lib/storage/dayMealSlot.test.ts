import {
  buildAppliedFixedRoutineMealSlotOverrides,
  buildCategoryMealSlotOverrides,
  resolveCurrentMealSlot,
  resolveCurrentMealSlotFromSchedule,
} from './dayMealSlot';

describe('buildAppliedFixedRoutineMealSlotOverrides', () => {
  const sets = [
    {
      id: 'set_daily',
      name: '데일리',
      applyRule: 'daily' as const,
      items: [
        { categoryKey: 'water', enabled: true },
        { categoryKey: 'work', enabled: true },
      ],
    },
  ];

  it('resolves default meal slot when item has no stored mealSlot', () => {
    const overrides = buildAppliedFixedRoutineMealSlotOverrides(
      { sets, activeSetIds: ['set_daily'], activeMealSlotsBySetId: { set_daily: ['morning'] } },
      ['water'],
    );
    expect(overrides).toEqual({ water: 'morning' });
  });

  it('respects active meal slot filter per set', () => {
    const overrides = buildAppliedFixedRoutineMealSlotOverrides(
      { sets, activeSetIds: ['set_daily'], activeMealSlotsBySetId: { set_daily: ['lunch'] } },
      ['water', 'work'],
    );
    expect(overrides).toEqual({ work: 'lunch' });
  });
});

describe('buildCategoryMealSlotOverrides with todayAppliedCategoryKeys', () => {
  it('uses resolved slots for applied keys only', () => {
    const map = buildCategoryMealSlotOverrides({
      sets: [
        {
          id: 'set_daily',
          name: '데일리',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
      activeSetIds: ['set_daily'],
      activeMealSlotsBySetId: { set_daily: ['morning'] },
      todayAppliedCategoryKeys: ['water'],
    });
    expect(map.get('water')).toBe('morning');
  });
});

describe('resolveCurrentMealSlotFromSchedule', () => {
  const custom = {
    dawn: '05:00',
    morning: '08:00',
    lunch: '11:30',
    dinner: '18:00',
    night: '22:00',
  };

  it('uses custom lunch start', () => {
    expect(resolveCurrentMealSlotFromSchedule(11 * 60 + 45, custom)).toBe('lunch');
    expect(resolveCurrentMealSlotFromSchedule(10 * 60 + 59, custom)).toBe('morning');
  });
});

describe('resolveCurrentMealSlot', () => {
  it('delegates to schedule with defaults', () => {
    expect(resolveCurrentMealSlot(8 * 60)).toBe('morning');
  });
});
