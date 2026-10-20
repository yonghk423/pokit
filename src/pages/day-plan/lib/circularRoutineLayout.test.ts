import { orderCircularRoutines } from './circularRoutineLayout';

describe('orderCircularRoutines', () => {
  it('keeps every routine, orders scheduled ones first, then preserves untimed order', () => {
    const items = [
      { key: 'note' }, { key: 'evening', startMinutes: 1140 },
      { key: 'morning', startMinutes: 420 }, { key: 'count' },
    ];
    expect(orderCircularRoutines(items).map(item => item.key)).toEqual(['morning', 'evening', 'note', 'count']);
    expect(items[0].key).toBe('note');
  });
  it('keeps next-day times after tonight and handles midnight and ties', () => {
    const items = [
      { key: 'next', startMinutes: 0, startsNextDay: true },
      { key: 'a', startMinutes: 1380 }, { key: 'b', startMinutes: 1380 },
      { key: 'midnight', startMinutes: 0 },
    ];
    expect(orderCircularRoutines(items).map(item => item.key)).toEqual(['midnight', 'a', 'b', 'next']);
  });
});
