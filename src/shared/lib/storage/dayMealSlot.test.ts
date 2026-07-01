import {
  resolveCurrentMealSlot,
  resolveCurrentMealSlotFromSchedule,
} from './dayMealSlot';

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
