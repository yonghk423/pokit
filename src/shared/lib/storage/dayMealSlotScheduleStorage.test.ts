import {
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  isDayMealSlotScheduleValid,
  normalizeDayMealSlotSchedule,
  resolveCurrentMealSlotFromSchedule,
} from './dayMealSlotScheduleStorage';

describe('normalizeDayMealSlotSchedule', () => {
  it('returns defaults for invalid order', () => {
    expect(
      normalizeDayMealSlotSchedule({
        dawn: '08:00',
        morning: '06:00',
        lunch: '12:30',
        dinner: '19:00',
        night: '21:00',
      }),
    ).toEqual(DEFAULT_DAY_MEAL_SLOT_SCHEDULE);
  });

  it('keeps valid custom schedule', () => {
    const custom = {
      dawn: '05:00',
      morning: '07:30',
      lunch: '11:00',
      dinner: '18:00',
      night: '22:30',
    };
    expect(normalizeDayMealSlotSchedule(custom)).toEqual(custom);
    expect(isDayMealSlotScheduleValid(custom)).toBe(true);
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

  it('wraps before dawn as night', () => {
    expect(resolveCurrentMealSlotFromSchedule(4 * 60, custom)).toBe('night');
  });
});
