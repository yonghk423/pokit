import { weatherForecastDays } from './weatherForecast';

it('groups samples by the forecast location day and skips past days', () => {
  const sample = (dt: string, low: number, high: number) => ({ dt: Date.parse(dt) / 1000, main: { temp_min: low, temp_max: high }, weather: [{ icon: '02d' }] });
  const days = weatherForecastDays({ city: { timezone: 9 * 3600 }, list: [
    sample('2026-11-12T14:00:00Z', -1, 5),
    sample('2026-11-12T18:00:00Z', 8, 10),
    sample('2026-11-13T03:00:00Z', 9, 16),
    sample('2026-11-14T03:00:00Z', 7, 14),
    sample('2026-11-15T03:00:00Z', 6, 13),
    sample('2026-11-16T03:00:00Z', 4, 10),
  ] }, Date.parse('2026-11-13T01:00:00Z'));
  expect(days).toEqual([
    { date: '2026-11-13', low: 8, high: 16, icon: '02d' },
    { date: '2026-11-14', low: 7, high: 14, icon: '02d' },
    { date: '2026-11-15', low: 6, high: 13, icon: '02d' },
  ]);
});

it('does not fabricate forecast values for missing or invalid samples', () => {
  expect(weatherForecastDays({ list: [{ dt: Date.now() / 1000, main: {} }] })).toEqual([]);
  expect(weatherForecastDays({})).toEqual([]);
});
