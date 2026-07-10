import {
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  isDayMealSlotScheduleValid,
  mealSlotProgressTowardNext,
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

describe('mealSlotProgressTowardNext', () => {
  const custom = {
    dawn: '05:00',
    morning: '08:00',
    lunch: '11:30',
    dinner: '18:00',
    night: '22:00',
  };

  it('점심 구간 중간이면 0~1 사이 진행률을 반환한다', () => {
    // lunch 11:30 → dinner 18:00 (6.5h). 14:45 = 3.25h → 0.5
    const progress = mealSlotProgressTowardNext(14 * 60 + 45, custom, 'lunch');
    expect(progress).toBeCloseTo(0.5, 2);
  });

  it('밤→새벽 자정 넘김도 계산한다', () => {
    // night 22:00 → dawn 05:00 (7h). 01:30 = 3.5h → 0.5
    const progress = mealSlotProgressTowardNext(1 * 60 + 30, custom, 'night');
    expect(progress).toBeCloseTo(0.5, 2);
  });
});
