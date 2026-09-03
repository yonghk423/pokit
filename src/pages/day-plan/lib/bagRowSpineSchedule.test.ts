import { sortByExplicitSpineStartTime } from './bagRowSpineSchedule';

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
