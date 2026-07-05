import { getLocalDateKey } from './localDateKey';
import {
  formatStudyDdayLabel,
  buildWeekCalendarRow,
  normalizeWorkStudyDdayEvents,
  normalizeWorkStudyTimetableSlots,
  sortDdayEvents,
} from './workStudySchedule';

describe('workStudySchedule', () => {
  it('buildWeekCalendarRow returns Monday-start week containing anchor', () => {
    const row = buildWeekCalendarRow(new Date(2026, 6, 5, 12, 0, 0, 0));
    expect(row).toHaveLength(7);
    expect(row[0]!.getDate()).toBe(29);
    expect(row[0]!.getMonth()).toBe(5);
    expect(row[6]!.getDate()).toBe(5);
    expect(row[6]!.getMonth()).toBe(6);
  });

  it('formatStudyDdayLabel returns D-Day labels', () => {
    expect(formatStudyDdayLabel('2026-07-05', '2026-07-05')).toBe('D-Day');
    expect(formatStudyDdayLabel('2026-07-10', '2026-07-05')).toBe('D-5');
    expect(formatStudyDdayLabel('2026-07-01', '2026-07-05')).toBe('D+4');
  });

  it('sortDdayEvents orders by nearest upcoming date', () => {
    const sorted = sortDdayEvents(
      normalizeWorkStudyDdayEvents([
        { id: '1', title: '중간', dateKey: '2026-08-01' },
        { id: '2', title: '기말', dateKey: '2026-07-10' },
      ]),
      '2026-07-05',
    );
    expect(sorted[0]!.title).toBe('기말');
  });

  it('normalizeWorkStudyTimetableSlots validates time order', () => {
    const slots = normalizeWorkStudyTimetableSlots([
      {
        id: '1',
        weekday: 0,
        startHhmm: '14:00',
        endHhmm: '13:00',
        subject: '수학',
        place: '',
      },
    ]);
    expect(slots[0]!.endHhmm).toBe('10:00');
  });

  it('normalizeWorkStudyDdayEvents drops empty titles', () => {
    expect(
      normalizeWorkStudyDdayEvents([{ id: '1', title: '  ', dateKey: getLocalDateKey() }]),
    ).toHaveLength(0);
  });
});
