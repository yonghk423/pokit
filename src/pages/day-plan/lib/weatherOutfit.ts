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

/** Compatible alternatives, with the original recommendation first (zero-based asset indices). */
export function weatherOutfitCandidates(input: WeatherOutfitInput, timestamp = Date.now()): number[] {
  const primary = selectWeatherOutfit(input, timestamp);
  const icon = input.icon.slice(0, 2);
  if (icon === '13' || (input.snowfall ?? 0) > 0) return [14, 13, 12];
  if (['09', '10', '11'].includes(icon) || (input.rainfall ?? 0) > 0) {
    return [primary, ...[3, 7, 17].filter(index => index !== primary)];
  }
  const alternatives: Record<number, number[]> = {
    0: [0, 10, 11], 1: [1, 18, 8, 19], 2: [2, 6, 18],
    4: [4, 5, 6], 5: [5, 4, 6], 6: [6, 2, 5],
    9: [9, 1, 18, 2], 10: [10, 0, 11, 15], 11: [11, 16, 0],
    12: [12, 13, 14, 15], 13: [13, 14], 15: [15, 12, 10],
    16: [16, 11, 0], 18: [18, 1, 8, 19, 9], 19: [19, 1, 0, 18],
  };
  return alternatives[primary] ?? [primary];
}

export function nextWeatherOutfit(input: WeatherOutfitInput, previous?: number, timestamp = Date.now()): number {
  const candidates = weatherOutfitCandidates(input, timestamp);
  const position = previous === undefined ? -1 : candidates.indexOf(previous);
  return candidates[(position + 1) % candidates.length];
}
