import type { ImageSource } from 'expo-image';
import type { HeroCalendarDesign } from './heroCalendarDesign';

export type WidgetArtwork = { source: ImageSource | number; ink: string; badge?: string; eventRing?: string; headingHeight?: number };

const artwork = {
  'bold': { source: require('../../../../assets/widget-calendars/general/bold.webp'), ink: '#151b19' },
  'cream-kitten': { source: require('../../../../assets/widget-calendars/general/cream-kitten.webp'), ink: '#382f2c' },
  'daylight-cassette': { source: require('../../../../assets/widget-calendars/general/daylight-cassette.webp'), ink: '#123345' },
  'ivory-paper': { source: require('../../../../assets/widget-calendars/general/ivory-paper.webp'), ink: '#4c3a30' },
  'kissing-shadows': { source: require('../../../../assets/widget-calendars/general/kissing-shadows.webp'), ink: '#362613' },
  'kraft-clip': { source: require('../../../../assets/widget-calendars/general/kraft-clip.webp'), ink: '#4b3424' },
  'lemon-slice': { source: require('../../../../assets/widget-calendars/general/lemon-slice.webp'), ink: '#3f2c10' },
  'mint-sneakers': { source: require('../../../../assets/widget-calendars/general/mint-sneakers.webp'), ink: '#233d38' },
  'mono-cafe': { source: require('../../../../assets/widget-calendars/general/mono-cafe.webp'), ink: '#fff9ee', badge: '#362937', eventRing: '#ffd8a6' },
  'pink-puppy': { source: require('../../../../assets/widget-calendars/general/pink-puppy.webp'), ink: '#492435' },
  'pink-vinyl': { source: require('../../../../assets/widget-calendars/general/pink-vinyl.webp'), ink: '#fff8ef', badge: '#362937', eventRing: '#ffd8a6' },
  'soft-mint': { source: require('../../../../assets/widget-calendars/general/soft-mint.webp'), ink: '#20483f' },
  'spiral-plan': { source: require('../../../../assets/widget-calendars/general/spiral-plan.webp'), ink: '#242722' },
  'sunshine-yellow': { source: require('../../../../assets/widget-calendars/general/sunshine-yellow.webp'), ink: '#392b12' },
  'weather': { source: require('../../../../assets/widget-calendars/general/weather.webp'), ink: '#193649' },
  'city': { source: require('../../../../assets/widget-calendars/illustration/city.webp'), ink: '#302820', headingHeight: 168 },
  'citypop-retro': { source: require('../../../../assets/widget-calendars/illustration/citypop-retro.webp'), ink: '#33243b', badge: '#ffede3', eventRing: '#9e2b3d' },
  'everyday': { source: require('../../../../assets/widget-calendars/illustration/everyday.webp'), ink: '#242220' },
  'season-autumn': { source: require('../../../../assets/widget-calendars/illustration/season-autumn.webp'), ink: '#4d2821' },
  'season-spring': { source: require('../../../../assets/widget-calendars/illustration/season-spring.webp'), ink: '#373941' },
  'season-summer': { source: require('../../../../assets/widget-calendars/illustration/season-summer.webp'), ink: '#173e47' },
  'season-winter': { source: require('../../../../assets/widget-calendars/illustration/season-winter.webp'), ink: '#243a56' },
  'textured-watercolor': { source: require('../../../../assets/widget-calendars/illustration/textured-watercolor.webp'), ink: '#2c4055' },
  'warm-sepia': { source: require('../../../../assets/widget-calendars/illustration/warm-sepia.webp'), ink: '#4c3627' },
} satisfies Record<string, WidgetArtwork>;

// Numbered store designs share one widget illustration per collection.
const collectionKeys: Record<string, keyof typeof artwork> = {
  'city-animation': 'city',
  'city-animation-everyday': 'everyday',
  'warm-sepia-open-panel': 'warm-sepia',
};

export function largeWidgetArtwork(design: HeroCalendarDesign): WidgetArtwork | undefined {
  if (design === 'illustration') return artwork.city;
  const collection = design.replace(/-\d+$/, '');
  const key = collectionKeys[collection] ?? collection;
  return Object.prototype.hasOwnProperty.call(artwork, key) ? artwork[key as keyof typeof artwork] : undefined;
}
