import {
  buildWaterRoutineReminderSlots,
  waterReminderIntervalMinutes,
} from './waterReminderRoutineSlots';

describe('waterReminderIntervalMinutes', () => {
  it('uses preset or custom minutes', () => {
    expect(waterReminderIntervalMinutes({ reminderPreset: '60', reminderCustomMin: 90 })).toBe(60);
    expect(waterReminderIntervalMinutes({ reminderPreset: '120', reminderCustomMin: 90 })).toBe(
      120,
    );
    expect(waterReminderIntervalMinutes({ reminderPreset: 'custom', reminderCustomMin: 45 })).toBe(
      45,
    );
    expect(waterReminderIntervalMinutes({ reminderPreset: 'custom', reminderCustomMin: 5 })).toBe(
      15,
    );
  });
});

describe('buildWaterRoutineReminderSlots', () => {
  it('builds slots within same-day window', () => {
    const slots = buildWaterRoutineReminderSlots({
      routineStartHhmm: '09:00',
      routineEndHhmm: '12:00',
      intervalMinutes: 60,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.wallMinuteOfDay).toBe(9 * 60);
    expect(slots.map((s) => s.wallMinuteOfDay)).toContain(10 * 60);
  });

  it('builds slots across midnight window', () => {
    const slots = buildWaterRoutineReminderSlots({
      routineStartHhmm: '22:00',
      routineEndHhmm: '02:00',
      intervalMinutes: 60,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.wallMinuteOfDay === 22 * 60)).toBe(true);
  });

  it('returns empty for invalid input', () => {
    expect(
      buildWaterRoutineReminderSlots({
        routineStartHhmm: 'bad',
        routineEndHhmm: '12:00',
        intervalMinutes: 60,
      }),
    ).toEqual([]);
  });
});
