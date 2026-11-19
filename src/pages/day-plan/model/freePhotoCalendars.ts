export const FREE_PHOTO_CALENDARS = [
  { id: 'cream-kitten', name: 'Cream Kitten', description: 'A cozy cream calendar', ink: '#29251F', background: require('../../../../assets/free-photo-calendars/cream-kitten.webp'), thumbnail: require('../../../../assets/free-photo-calendars/cream-kitten-thumb.webp') },
  { id: 'mono-cafe', name: 'Mono Café', description: 'A quiet monochrome calendar', ink: '#FFF5E4', background: require('../../../../assets/free-photo-calendars/mono-cafe.webp'), thumbnail: require('../../../../assets/free-photo-calendars/mono-cafe-thumb.webp') },
  { id: 'pink-vinyl', name: 'Pink Vinyl', description: 'A rose vinyl calendar', ink: '#FFF5E4', background: require('../../../../assets/free-photo-calendars/pink-vinyl.webp'), thumbnail: require('../../../../assets/free-photo-calendars/pink-vinyl-thumb.webp') },
] as const;
export type FreePhotoCalendar = typeof FREE_PHOTO_CALENDARS[number]['id'];
export const freePhotoCalendar = (id: string | null | undefined) => FREE_PHOTO_CALENDARS.find(item => item.id === id);
