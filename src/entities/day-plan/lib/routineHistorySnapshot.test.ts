import {
  appendRoutineHistoryPending,
  lookupCategoryPlannedDayCount,
  normalizeRoutineHistoryByDate,
  removeRoutineHistoryPending,
  shouldTrackRoutineHistoryForDate,
  snapshotRoutinePlannedKeys,
  sumCategoryPlannedDaysInRange,
} from './routineHistorySnapshot';

describe('routineHistorySnapshot', () => {
  it('normalizes pending map from storage', () => {
    expect(
      normalizeRoutineHistoryByDate({
        '2025-06-14': ['reading', 'water'],
        invalid: ['x'],
        'bad-date': ['y'],
      }),
    ).toEqual({
      '2025-06-14': ['reading', 'water'],
    });
  });

  it('tracks pending only for priority plan dates in range', () => {
    const slice = {
      planMode: 'priority' as const,
      priorityPlanDateKey: '2025-06-14',
      priorityPlanDateKeyEnd: '2025-06-14',
      routineHistoryPendingByDate: {},
      routineHistoryPlannedKeysByDate: {},
    };
    expect(shouldTrackRoutineHistoryForDate(slice, '2025-06-14')).toBe(true);
    expect(shouldTrackRoutineHistoryForDate(slice, '2025-06-13')).toBe(false);
  });

  it('appends and removes pending keys per date', () => {
    let pending = appendRoutineHistoryPending({}, '2025-06-14', 'reading');
    pending = appendRoutineHistoryPending(pending, '2025-06-14', 'water');
    expect(pending['2025-06-14']).toEqual(['reading', 'water']);
    pending = removeRoutineHistoryPending(pending, '2025-06-14', 'reading');
    expect(pending['2025-06-14']).toEqual(['water']);
  });

  it('snapshots planned keys for a date', () => {
    const planned = snapshotRoutinePlannedKeys({}, '2025-06-14', ['reading', 'water']);
    expect(planned['2025-06-14']).toEqual(['reading', 'water']);
  });

  it('unions planned keys so removed items still count for that day', () => {
    let planned = snapshotRoutinePlannedKeys({}, '2025-06-14', ['reading', 'water']);
    planned = snapshotRoutinePlannedKeys(planned, '2025-06-14', ['water', 'stretch']);
    expect(planned['2025-06-14']).toEqual(['reading', 'water', 'stretch']);
  });

  it('sums planned days in range once per day', () => {
    const plannedByDate = {
      '2025-06-14': ['reading', 'water'],
      '2025-06-13': ['reading'],
      '2025-06-12': ['stretch'],
    };
    expect(
      sumCategoryPlannedDaysInRange(plannedByDate, '2025-06-14', 3, (key, delta) => {
        const d = new Date(`${key}T12:00:00`);
        d.setDate(d.getDate() + delta);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }),
    ).toEqual({
      reading: 2,
      water: 1,
      stretch: 1,
    });
    expect(lookupCategoryPlannedDayCount({ reading: 2 }, 'reading')).toBe(2);
  });
});
