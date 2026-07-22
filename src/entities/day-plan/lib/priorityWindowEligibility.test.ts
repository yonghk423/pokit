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

  it('다음날 종료(시계상 당일처럼 보여도) — 시작일에는 끝나지 않는다', () => {
    const ctx = {
      planMode: 'priority' as const,
      priorityStart: '06:00',
      priorityEnd: '12:00',
      priorityPlanDateKey: '2026-07-22',
      priorityPlanDateKeyEnd: '2026-07-23',
      nowKey: '2026-07-22',
      nowMin: 13 * 60 + 46,
    };
    expect(isPriorityWindowEndedForToday(ctx)).toBe(false);
    expect(isPriorityWindowEligible(ctx)).toBe(true);
  });

  it('다음날 종료 — 종료일 pe 이후에만 끝난다', () => {
    const before = {
      planMode: 'priority' as const,
      priorityStart: '06:00',
      priorityEnd: '12:00',
      priorityPlanDateKey: '2026-07-22',
      priorityPlanDateKeyEnd: '2026-07-23',
      nowKey: '2026-07-23',
      nowMin: 11 * 60,
    };
    expect(isPriorityWindowEndedForToday(before)).toBe(false);
    expect(isPriorityWindowEligible(before)).toBe(true);

    const after = { ...before, nowMin: 12 * 60 };
    expect(isPriorityWindowEndedForToday(after)).toBe(true);
    expect(isPriorityWindowEligible(after)).toBe(false);
  });

  it('자연 자정 넘김(22:00~06:00) — 시작일 오후에도 유효', () => {
    const ctx = {
      planMode: 'priority' as const,
      priorityStart: '22:00',
      priorityEnd: '06:00',
      priorityPlanDateKey: '2026-07-22',
      priorityPlanDateKeyEnd: '2026-07-23',
      nowKey: '2026-07-22',
      nowMin: 14 * 60,
    };
    expect(isPriorityWindowEndedForToday(ctx)).toBe(false);
    expect(isPriorityWindowEligible(ctx)).toBe(true);
  });
});
