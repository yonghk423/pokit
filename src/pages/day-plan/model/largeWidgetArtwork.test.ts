jest.mock('@features/subscriptions', () => ({}));
jest.mock('../lib/calendarStoreDownload', () => ({}));
jest.mock('../lib/illustrationCalendarAssets', () => ({}));
jest.mock('../ui/usePremiumPackPaywall', () => ({}));
import { calendarPackThemes } from '../lib/cityCalendarPack';
import { ILLUSTRATION_CALENDAR_CATEGORIES } from './illustrationCalendarCategories';
import { largeWidgetArtwork } from './largeWidgetArtwork';
import { CALENDAR_DESIGNS } from '../ui/HeroCalendarDesigns';
import { RETIRED_CALENDAR_DESIGNS } from './retiredCalendarDesigns';

it('maps every selectable design to a bundled background except user-owned Photo Paper', () => {
  const active = CALENDAR_DESIGNS.filter(({ id }) => !RETIRED_CALENDAR_DESIGNS.has(id));
  expect(active.filter(({ id }) => !largeWidgetArtwork(id)).map(({ id }) => id)).toEqual(['photo']);
  const artwork = new Set(active.map(({ id }) => largeWidgetArtwork(id)).filter(Boolean));
  for (const category of ILLUSTRATION_CALENDAR_CATEGORIES) {
    for (const pack of category.packs) {
      const designs = calendarPackThemes(pack);
      expect(designs.length).toBeGreaterThan(0);
      const reference = largeWidgetArtwork(designs[0].design);
      expect(reference).toBeDefined();
      expect(artwork.has(reference)).toBe(false);
      for (const theme of designs) expect(largeWidgetArtwork(theme.design)).toBe(reference);
      artwork.add(reference);
    }
  }
  expect(artwork.size).toBe(24);
});
