import {
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  isDayMealSlotScheduleValid,
  mealSlotProgressTowardNext,
  normalizeDayMealSlotSchedule,
  alignDayMealSlotScheduleToPriorityWindow,
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

  it('allows night at 24:00', () => {
    const custom = {
      dawn: '04:00',
      morning: '06:00',
      lunch: '12:30',
      dinner: '19:00',
      night: '24:00',
    };
    expect(normalizeDayMealSlotSchedule(custom)).toEqual(custom);
    expect(isDayMealSlotScheduleValid(custom)).toBe(true);
  });
});

describe('alignDayMealSlotScheduleToPriorityWindow', () => {
  it('같은 날 창이면 첫·끝 구간을 하루 시작·마무리에 맞춘다', () => {
    const aligned = alignDayMealSlotScheduleToPriorityWindow(
      DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      '18:10',
      '24:00',
    );
    expect(aligned.lunch).toBe('18:10');
    expect(aligned.dinner).toBe('19:00');
    expect(aligned.night).toBe('24:00');
    expect(aligned.dawn).toBe('04:00');
    expect(aligned.morning).toBe('06:00');
  });

  it('밤이 이미 24:00이어도 저녁을 24:00으로 덮지 않는다', () => {
    const aligned = alignDayMealSlotScheduleToPriorityWindow(
      {
        dawn: '04:00',
        morning: '06:00',
        lunch: '18:10',
        dinner: '19:00',
        night: '24:00',
      },
      '18:10',
      '24:00',
    );
    expect(aligned.dinner).toBe('19:00');
    expect(aligned.night).toBe('24:00');
    expect(aligned.lunch).toBe('18:10');
  });

  it('자정 넘김 창은 스케줄을 바꾸지 않는다', () => {
    const aligned = alignDayMealSlotScheduleToPriorityWindow(
      DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      '22:00',
      '06:00',
    );
    expect(aligned).toEqual(DEFAULT_DAY_MEAL_SLOT_SCHEDULE);
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

  it('night at 24:00 keeps evening as dinner until midnight', () => {
    const withEnd = { ...custom, night: '24:00' };
    expect(resolveCurrentMealSlotFromSchedule(23 * 60, withEnd)).toBe('dinner');
    expect(resolveCurrentMealSlotFromSchedule(30, withEnd)).toBe('night');
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

  it('밤이 24:00이면 저녁→밤 구간을 마무리까지 잰다', () => {
    const withEnd = { ...custom, night: '24:00' };
    // dinner 18:00 → 24:00 (6h). 21:00 = 3h → 0.5
    expect(mealSlotProgressTowardNext(21 * 60, withEnd, 'dinner')).toBeCloseTo(0.5, 2);
  });
});
