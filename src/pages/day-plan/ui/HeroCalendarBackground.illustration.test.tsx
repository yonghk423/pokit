import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { CalendarPaper } from './HeroCalendarDesigns';
import { HeroCalendarBackground } from './HeroCalendarBackground';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../model/heroCanvasEvents', () => ({ useCanvasEventDates: () => [] }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ events: [] }) }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko', t: (key: string) => key }) }));
jest.mock('./HeroCalendarWidgetSync', () => ({ HeroCalendarWidgetSync: () => null }));
jest.mock('./HeroCalendarDesigns', () => ({ CalendarPaper: () => null }));
beforeEach(() => localStorageClient.removeItem('pokit:calendar-design'));
jest.mock('./HeroIllustrationCalendar', () => ({ HeroIllustrationCalendar: () => null }));
it.each([
  ['warm-sepia-open-panel-01', 'warm-sepia-open-panel-01-exercise'],
  ['warm-sepia-open-panel-100', 'warm-sepia-open-panel-100-kitchen-dance'],
  ['city-animation-everyday-01', 'everyday-cinema-01-platform'],
  ['city-animation-01', '01-rush-hour-commute'],
])('renders the applied illustration %s after reopening the calendar', (design, themeId) => {
  const { applyHeroCalendarDesign } = require('../model/heroCalendarDesign');
  const { HeroIllustrationCalendar } = require('./HeroIllustrationCalendar');
  const props = { date: new Date(2026, 10, 12), month: new Date(2026, 10, 1), isDark: false, diaries: [], onSelectDate: jest.fn() };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarBackground {...props} />); });
  try {
    act(() => applyHeroCalendarDesign(design));
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 390, height: 844 } } }));
    expect(tree.root.findByType(HeroIllustrationCalendar).props.themeId).toBe(themeId);
    expect(tree.root.findAllByType(CalendarPaper)).toHaveLength(0);
    act(() => tree.unmount());
    act(() => { tree = create(<HeroCalendarBackground {...props} />); });
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 390, height: 844 } } }));
    expect(tree.root.findByType(HeroIllustrationCalendar).props.themeId).toBe(themeId);
  } finally { act(() => tree.unmount()); }
});
