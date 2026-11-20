import { diaryImages } from '../lib/calendarStoreDownload';
export const FREE_PHOTO_CALENDARS = [
  { id: 'cream-kitten', name: 'Cream Kitten', description: 'A cozy cream calendar', ink: '#29251F', background: require('../../../../assets/free-photo-calendars/cream-kitten.webp'), thumbnail: require('../../../../assets/free-photo-calendars/cream-kitten-thumb.webp') },
  { id: 'pink-vinyl', name: 'Pink Vinyl', description: 'A rose vinyl calendar', ink: '#FFF5E4', background: require('../../../../assets/free-photo-calendars/pink-vinyl.webp'), thumbnail: require('../../../../assets/free-photo-calendars/pink-vinyl-thumb.webp') },
  { id: 'mono-cafe', name: 'Mono Café', description: 'A quiet monochrome calendar', ink: '#FFF5E4', background: require('../../../../assets/free-photo-calendars/mono-cafe.webp'), thumbnail: require('../../../../assets/free-photo-calendars/mono-cafe-thumb.webp') },
] as const;
export const PRO_PHOTO_CALENDARS = [
  { id: 'sunshine-yellow', name: 'Sunshine Yellow', description: 'A vivid yellow calendar background', ink: '#252525', pro: true, calendarLift: 0.29, background: require('../../../../assets/pro-photo-calendars/sunshine-yellow.webp'), thumbnail: require('../../../../assets/pro-photo-calendars/sunshine-yellow.webp') },
  { id: 'lemon-slice', name: 'Lemon Slice', description: 'A bright citrus calendar background', ink: '#252525', pro: true, calendarLift: 0.29, background: require('../../../../assets/pro-photo-calendars/lemon-slice.webp'), thumbnail: require('../../../../assets/pro-photo-calendars/lemon-slice.webp') },
  { id: 'kissing-shadows', name: 'Kissing Shadows', description: 'A couple sharing a kiss in golden shadows', ink: '#252525', pro: true, calendarLift: 0.29, background: require('../../../../assets/pro-photo-calendars/kissing-shadows.webp'), thumbnail: require('../../../../assets/pro-photo-calendars/kissing-shadows.webp') },
  { id: 'daylight-cassette', name: 'Daylight Cassette', description: 'A transparent blue cassette in soft sunlight', ink: '#182F3A', pro: true, calendarLift: 0.29, background: require('../../../../assets/pro-photo-calendars/daylight-cassette.webp'), thumbnail: require('../../../../assets/pro-photo-calendars/daylight-cassette.webp') },
  { id: 'mint-sneakers', name: 'Mint Sneakers', description: 'Pastel mint sneakers on soft ivory fabric', ink: '#30423E', pro: true, calendarLift: 0.29, background: require('../../../../assets/pro-photo-calendars/mint-sneakers.webp'), thumbnail: require('../../../../assets/pro-photo-calendars/mint-sneakers.webp') },
] as const;
export const PHOTO_CALENDARS = [...FREE_PHOTO_CALENDARS, ...PRO_PHOTO_CALENDARS] as const;
export type FreePhotoCalendar = typeof PHOTO_CALENDARS[number]['id'];
export const freePhotoCalendar = (id: string | null | undefined) => {
  const theme = PHOTO_CALENDARS.find(item => item.id === id);
  if (!theme) return undefined;
  const uri = 'pro' in theme ? diaryImages(theme.id)?.image : undefined;
  return { ...theme, background: uri ? { uri } : theme.background };
};
export const isPhotoCalendar = (id: string | null | undefined): id is FreePhotoCalendar => PHOTO_CALENDARS.some(item => item.id === id);
