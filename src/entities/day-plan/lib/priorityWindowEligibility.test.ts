import {
  isPriorityWindowEligible,
  isPriorityWindowEndedForToday,
} from './priorityWindowEligibility';

describe('priorityWindowEligibility', () => {
  const base = {
    planMode: 'priority' as const,
    priorityStart: '08:00',
    priorityEnd: '22:00',
    priorityPlanDateKey: '2026-06-17',
    priorityPlanDateKeyEnd: '2026-06-17',
    nowKey: '2026-06-17',
  };

  it('is eligible while still inside same-day window', () => {
    expect(
      isPriorityWindowEligible({ ...base, nowMin: 10 * 60 }),
    ).toBe(true);
    expect(
      isPriorityWindowEndedForToday({ ...base, nowMin: 10 * 60 }),
    ).toBe(false);
  });

  it('is ended after same-day window end', () => {
    expect(
      isPriorityWindowEligible({ ...base, nowMin: 22 * 60 }),
    ).toBe(false);
    expect(
      isPriorityWindowEndedForToday({ ...base, nowMin: 22 * 60 }),
    ).toBe(true);
  });

  it('returns false when plan mode is not priority', () => {
    expect(
      isPriorityWindowEndedForToday({ ...base, planMode: 'quickMemo', nowMin: 23 * 60 }),
    ).toBe(false);
  });
});
