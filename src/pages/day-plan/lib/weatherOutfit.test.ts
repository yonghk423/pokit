import { nextWeatherOutfit, weatherOutfitCandidates, selectWeatherOutfit } from './weatherOutfit';

const atUtcMonth = (month: number) => Date.UTC(2026, month - 1, 15, 12);

describe('selectWeatherOutfit', () => {
  it('uses local month and hemisphere for season selection', () => {
    expect(selectWeatherOutfit({ icon: '01d', temperature: 20, hemisphere: 'north' }, atUtcMonth(4))).toBe(1);
    expect(selectWeatherOutfit({ icon: '01d', temperature: 20, hemisphere: 'south' }, atUtcMonth(4))).toBe(9);
  });

  it('uses the OpenWeather condition and precipitation to choose rain and snow outfits', () => {
    expect(selectWeatherOutfit({ icon: '10d', temperature: 25, hemisphere: 'north' }, atUtcMonth(7))).toBe(7);
    expect(selectWeatherOutfit({ icon: '01d', temperature: 0, snowfall: 1.2, hemisphere: 'north' }, atUtcMonth(1))).toBe(14);
  });

  it('uses wind and feels-like temperature for the outfit choice', () => {
    expect(selectWeatherOutfit({ icon: '01d', temperature: 18, windSpeed: 10, hemisphere: 'north' }, atUtcMonth(4))).toBe(16);
    expect(selectWeatherOutfit({ icon: '01d', temperature: 12, feelsLike: -7, hemisphere: 'north' }, atUtcMonth(1))).toBe(13);
  });

  it('uses the OpenWeather timezone offset to determine local season', () => {
    const utcNearSpring = Date.UTC(2026, 1, 28, 16, 30);
    expect(selectWeatherOutfit({ icon: '01d', temperature: 20, timezoneOffset: 9 * 60 * 60, hemisphere: 'north' }, utcNearSpring)).toBe(1);
  });
});


it('cycles compatible outfits without repeating until the pool wraps', () => {
  const input = { icon: '01d', temperature: 16, hemisphere: 'north' as const };
  const timestamp = atUtcMonth(10);
  const candidates = weatherOutfitCandidates(input, timestamp);
  expect(candidates.length).toBeGreaterThan(1);
  let previous: number | undefined;
  const seen = candidates.map(() => { previous = nextWeatherOutfit(input, previous, timestamp); return previous; });
  expect(seen).toEqual(candidates);
  expect(nextWeatherOutfit(input, previous, timestamp)).toBe(candidates[0]);
  expect(nextWeatherOutfit(input, 999, timestamp)).toBe(candidates[0]);
});

it('keeps rain, snow and freezing weather alternatives suitable for their conditions', () => {
  expect(new Set(weatherOutfitCandidates({ icon: '10d', temperature: 20, hemisphere: 'north' }, atUtcMonth(7)))).toEqual(new Set([3, 7, 17]));
  expect(weatherOutfitCandidates({ icon: '13d', temperature: 0, hemisphere: 'north' }, atUtcMonth(1))).toEqual([14, 13, 12]);
  expect(weatherOutfitCandidates({ icon: '01d', temperature: -10, hemisphere: 'north' }, atUtcMonth(1))).toEqual([13, 14]);
});
