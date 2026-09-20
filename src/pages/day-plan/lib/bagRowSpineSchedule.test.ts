import { sortByExplicitSpineStartTime, resolveBagItemSpineSchedule, deriveBagRowScheduleFromStart } from './bagRowSpineSchedule';
import {
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
} from '@shared/lib/storage';

describe('resolveBagItemSpineSchedule', () => {
  it('follows priority window for tutorial without manual override', () => {
    const schedule = resolveBagItemSpineSchedule({
      categoryKey: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
      planBlocks: [
        {
          id: 'tour-block',
          title: '포킷 빠르게 둘러보기',
          category: '포킷 빠르게 둘러보기',
          categoryKey: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
          startMinutes: 11 * 60 + 40,
          endMinutes: 35,
          endsNextCalendarDay: true,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      fixedFlowSets: [],
      priorityStart: '11:40',
      priorityEnd: '02:20',
    });
    expect(schedule).toEqual({
      startMinutes: 11 * 60 + 40,
      endMinutes: 2 * 60 + 20,
      endsNextCalendarDay: true,
      startsNextCalendarDay: false,
      isSuggested: false,
    });
  });

  it('keeps tutorial manual override schedule', () => {
    const schedule = resolveBagItemSpineSchedule({
      categoryKey: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
      planBlocks: [
        {
          id: 'tour-block',
          title: '포킷 빠르게 둘러보기',
          category: '포킷 빠르게 둘러보기',
          categoryKey: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
          startMinutes: 11 * 60 + 40,
          endMinutes: 35,
          endsNextCalendarDay: true,
          order: 0,
          blockOrigin: 'spineTimeline',
          hasManualScheduleOverride: true,
        },
      ],
      fixedFlowSets: [],
      priorityStart: '11:40',
      priorityEnd: '02:20',
    });
    expect(schedule).toEqual({
      startMinutes: 11 * 60 + 40,
      endMinutes: 35,
      endsNextCalendarDay: true,
      startsNextCalendarDay: false,
      isSuggested: false,
    });
  });

  it('does not treat an auto session window as a user-set time', () => {
    const schedule = resolveBagItemSpineSchedule({
      categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
      planBlocks: [
        {
          id: 'auto-session',
          title: '운동하기',
          category: '운동하기',
          categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
          startMinutes: 7 * 60,
          endMinutes: 0,
          endsNextCalendarDay: true,
          order: 0,
          blockOrigin: 'prioritySession',
        },
      ],
      fixedFlowSets: [
        {
          id: 'set_weekend',
          name: '주말',
          applyRule: 'weekend',
          items: [{ categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID, enabled: true }],
        },
      ],
      priorityStart: '07:00',
      priorityEnd: '00:00',
    });
    expect(schedule.isSuggested).toBe(true);
  });

  it('keeps a time the user set on a regular routine', () => {
    const schedule = resolveBagItemSpineSchedule({
      categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
      planBlocks: [
        {
          id: 'manual',
          title: '운동하기',
          category: '운동하기',
          categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
          startMinutes: 8 * 60,
          endMinutes: 8 * 60 + 30,
          order: 0,
          blockOrigin: 'spineTimeline',
          hasManualScheduleOverride: true,
        },
      ],
      fixedFlowSets: [],
      priorityStart: '07:00',
      priorityEnd: '00:00',
    });
    expect(schedule).toEqual({
      startMinutes: 8 * 60,
      endMinutes: 8 * 60 + 30,
      endsNextCalendarDay: false,
      startsNextCalendarDay: false,
      isSuggested: false,
    });
  });

  it('shows a stored fixed-routine time without treating it as a suggestion', () => {
    const schedule = resolveBagItemSpineSchedule({
      categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
      planBlocks: [],
      fixedFlowSets: [
        {
          id: 'set_weekend',
          name: '주말',
          applyRule: 'weekend',
          items: [
            {
              categoryKey: BUILTIN_DAILY_EXERCISE_FLOW_ID,
              enabled: true,
              spineStartMinutes: 9 * 60,
              spineEndMinutes: 9 * 60 + 45,
            },
          ],
        },
      ],
      priorityStart: '07:00',
      priorityEnd: '00:00',
    });
    expect(schedule).toEqual({
      startMinutes: 9 * 60,
      endMinutes: 9 * 60 + 45,
      endsNextCalendarDay: false,
      startsNextCalendarDay: false,
      isSuggested: false,
    });
  });
});

describe('sortByExplicitSpineStartTime', () => {
  it('orders explicit start times ascending and keeps unset last', () => {
    const items = [
      { key: 'late', start: 19 * 60 },
      { key: 'unset' },
      { key: 'early', start: 8 * 60 },
      { key: 'mid', start: 12 * 60 + 30 },
    ];
    const sorted = sortByExplicitSpineStartTime(
      items,
      (item) => item.key,
      (key) => {
        const item = items.find((row) => row.key === key)!;
        return item.start == null
          ? { startMinutes: 0, isSuggested: true, startsNextCalendarDay: false }
          : { startMinutes: item.start, isSuggested: false, startsNextCalendarDay: false };
      },
    );
    expect(sorted.map((row) => row.key)).toEqual(['early', 'mid', 'late', 'unset']);
  });

  it('keeps original order when start times match', () => {
    const items = [
      { key: 'a', start: 10 * 60 },
      { key: 'b', start: 10 * 60 },
    ];
    const sorted = sortByExplicitSpineStartTime(
      items,
      (item) => item.key,
      (key) => {
        const item = items.find((row) => row.key === key)!;
        return {
          startMinutes: item.start,
          isSuggested: false,
          startsNextCalendarDay: false,
        };
      },
    );
    expect(sorted.map((row) => row.key)).toEqual(['a', 'b']);
  });

  it('orders same-day morning before next-day dawn in overnight window', () => {
    const items = [
      { key: 'dawn', start: 1 * 60 + 45, nextDay: true },
      { key: 'morning', start: 7 * 60 + 35, nextDay: false },
    ];
    const sorted = sortByExplicitSpineStartTime(
      items,
      (item) => item.key,
      (key) => {
        const item = items.find((row) => row.key === key)!;
        return {
          startMinutes: item.start,
          isSuggested: false,
          startsNextCalendarDay: item.nextDay,
        };
      },
    );
    expect(sorted.map((row) => row.key)).toEqual(['morning', 'dawn']);
  });
});

describe('deriveBagRowScheduleFromStart', () => {
  it('derives same-day end from start within daily window', () => {
    expect(
      deriveBagRowScheduleFromStart({
        startMinutes: 7 * 60 + 35,
        startsNextCalendarDay: false,
        priorityStart: '07:00',
        priorityEnd: '23:00',
        durationMinutes: 30,
      }),
    ).toEqual({
      startMinutes: 7 * 60 + 35,
      endMinutes: 8 * 60 + 5,
      endsNextCalendarDay: false,
    });
  });

  it('rejects start outside daily window', () => {
    expect(
      deriveBagRowScheduleFromStart({
        startMinutes: 6 * 60,
        startsNextCalendarDay: false,
        priorityStart: '07:00',
        priorityEnd: '23:00',
        durationMinutes: 30,
      }),
    ).toBeNull();
  });

  it('stores overnight morning start as same-day morning block', () => {
    expect(
      deriveBagRowScheduleFromStart({
        startMinutes: 6 * 60,
        startsNextCalendarDay: true,
        priorityStart: '22:00',
        priorityEnd: '07:00',
        durationMinutes: 30,
      }),
    ).toEqual({
      startMinutes: 6 * 60,
      endMinutes: 6 * 60 + 30,
      endsNextCalendarDay: false,
    });
  });

  it('wraps evening start past midnight into next-day end', () => {
    expect(
      deriveBagRowScheduleFromStart({
        startMinutes: 23 * 60 + 50,
        startsNextCalendarDay: false,
        priorityStart: '22:00',
        priorityEnd: '07:00',
        durationMinutes: 30,
      }),
    ).toEqual({
      startMinutes: 23 * 60 + 50,
      endMinutes: 20,
      endsNextCalendarDay: true,
    });
  });
});
