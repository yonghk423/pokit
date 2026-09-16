import { sortByExplicitSpineStartTime, resolveBagItemSpineSchedule } from './bagRowSpineSchedule';
import { BUILTIN_POKIT_WEEK_TOUR_FLOW_ID } from '@shared/lib/storage';

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
          ? { startMinutes: 0, isSuggested: true }
          : { startMinutes: item.start, isSuggested: false };
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
        return { startMinutes: item.start, isSuggested: false };
      },
    );
    expect(sorted.map((row) => row.key)).toEqual(['a', 'b']);
  });
});
