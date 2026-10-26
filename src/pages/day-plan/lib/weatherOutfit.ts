export type WeatherOutfitInput = {
  icon: string;
  temperature: number;
  feelsLike?: number;
  rainfall?: number;
  snowfall?: number;
  windSpeed?: number;
  windGust?: number;
  timezoneOffset?: number;
  hemisphere: 'north' | 'south';
};

export type OutfitSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** Returns one row-major index from the 4 × 5 outfit atlas. */
export function selectWeatherOutfit(input: WeatherOutfitInput, timestamp = Date.now()): number {
  const localDate = new Date(timestamp + (input.timezoneOffset ?? 0) * 1000);
  const month = localDate.getUTCMonth() + 1;
  let season: OutfitSeason;
  if (input.hemisphere === 'north') {
    season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  } else {
    season = month >= 3 && month <= 5 ? 'autumn' : month >= 6 && month <= 8 ? 'winter' : month >= 9 && month <= 11 ? 'spring' : 'summer';
  }

  const temperature = input.feelsLike ?? input.temperature;
  const iconId = input.icon.slice(0, 2);
  const isSnow = iconId === '13' || (input.snowfall ?? 0) > 0;
  const isRain = ['09', '10', '11'].includes(iconId) || (input.rainfall ?? 0) > 0;
  const isWindy = (input.windSpeed ?? 0) >= 9 || (input.windGust ?? 0) >= 12;

  if (isSnow) return season === 'winter' ? 14 : 17;
  if (isRain) return season === 'spring' ? 3 : season === 'summer' ? 7 : 17;
  if (isWindy) return season === 'autumn' ? 11 : 16;

  if (season === 'winter') return temperature <= -5 ? 13 : temperature <= 5 ? 12 : temperature >= 12 ? 19 : 15;
  if (season === 'autumn') return temperature <= 8 ? 10 : temperature >= 20 ? 9 : 18;
  if (season === 'summer') return temperature >= 30 ? 4 : temperature <= 18 ? 19 : temperature >= 25 ? 5 : 6;
  return temperature <= 8 ? 0 : temperature >= 22 ? 2 : temperature >= 16 ? 1 : 18;
}
