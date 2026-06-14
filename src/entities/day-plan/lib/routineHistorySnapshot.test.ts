import {
  appendRoutineHistoryPending,
  normalizeRoutineHistoryByDate,
  removeRoutineHistoryPending,
  shouldTrackRoutineHistoryForDate,
  snapshotRoutinePlannedKeys,
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
});
