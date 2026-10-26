import { selectWeatherOutfit } from './weatherOutfit';

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
