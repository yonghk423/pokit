import { resolveFixedFlowSpineSchedules } from './fixedFlowSpineSchedule';

describe('resolveFixedFlowSpineSchedules', () => {
  it('keeps an exact same-day time outside the daily focus window', () => {
    const schedules = resolveFixedFlowSpineSchedules({
      items: [
        {
          categoryKey: 'reading',
          enabled: true,
          spineStartMinutes: 13 * 60,
          spineEndMinutes: 13 * 60 + 30,
        },
      ],
      priorityStart: '07:00',
      priorityEnd: '07:30',
    });

    expect(schedules.get('reading')).toEqual({
      startMinutes: 13 * 60,
      endMinutes: 13 * 60 + 30,
      isSuggested: false,
    });
  });

  it('keeps a next-day end even when its clock time is later than the start', () => {
    const schedules = resolveFixedFlowSpineSchedules({
      items: [
        {
          categoryKey: 'reading',
          enabled: true,
          spineStartMinutes: 7 * 60,
          spineEndMinutes: 7 * 60 + 30,
          spineEndsNextCalendarDay: true,
        },
      ],
      priorityStart: '06:00',
      priorityEnd: '23:00',
    });

    expect(schedules.get('reading')).toEqual({
      startMinutes: 7 * 60,
      endMinutes: 7 * 60 + 30,
      endsNextCalendarDay: true,
      isSuggested: false,
    });
  });
});
