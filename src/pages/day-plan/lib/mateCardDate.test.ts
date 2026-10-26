import { rhythmCardDate } from './mateCardDate';

it('formats a large day and small month/year matching the reference', () => {
  expect(rhythmCardDate('2026-10-22')).toEqual({ day: '22', monthYear: 'OCT ’26' });
  expect(rhythmCardDate('2027-01-01')).toEqual({ day: '1', monthYear: 'JAN ’27' });
});

it('accepts leap dates and omits invalid or missing dates', () => {
  expect(rhythmCardDate('2028-02-29')?.day).toBe('29');
  for (const key of [undefined, '', '2026-02-29', '2026-13-01', '2026-04-31']) expect(rhythmCardDate(key)).toBeNull();
});
