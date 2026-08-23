import {
  buildNextDailyReminderDates,
  toLocalDateKey,
} from './nextIncompleteRoutineReminderDates';

describe('buildNextDailyReminderDates', () => {
  it('keeps today when the reminder is still in the future', () => {
    const now = new Date(2026, 7, 23, 18, 20, 0);
    const dates = buildNextDailyReminderDates(18, 27, 2, now);

    expect(dates).toHaveLength(2);
    expect(toLocalDateKey(dates[0]!)).toBe('2026-08-23');
    expect(dates[0]!.getHours()).toBe(18);
    expect(dates[0]!.getMinutes()).toBe(27);
    expect(toLocalDateKey(dates[1]!)).toBe('2026-08-24');
  });

  it('rolls to tomorrow when the reminder time already passed', () => {
    const now = new Date(2026, 7, 23, 18, 30, 0);
    const dates = buildNextDailyReminderDates(18, 27, 1, now);

    expect(dates).toHaveLength(1);
    expect(toLocalDateKey(dates[0]!)).toBe('2026-08-24');
    expect(dates[0]!.getHours()).toBe(18);
    expect(dates[0]!.getMinutes()).toBe(27);
  });
});
