import type { CalendarPackId } from '../lib/cityCalendarPack';

export const ILLUSTRATION_CALENDAR_CATEGORIES = [
  {
    id: 'character',
    labelKey: 'comicCalendar.categoryCharacterIllustration',
    packs: ['city', 'everyday', 'warm-sepia', 'citypop-retro', 'textured-watercolor'],
  },
  { id: 'season', labelKey: 'comicCalendar.categorySeason', packs: ['season-winter'] },
] as const satisfies readonly { id: string; labelKey: string; packs: readonly CalendarPackId[] }[];

export type IllustrationCalendarCategoryId = typeof ILLUSTRATION_CALENDAR_CATEGORIES[number]['id'];
