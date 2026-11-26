import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HeroCalendarBackground } from './HeroCalendarBackground';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'en', t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: require('react-native').Text }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ events: [] }) }));
jest.mock('../model/heroCanvasEvents', () => ({ useCanvasEventDates: () => [] }));
jest.mock('../model/freePhotoCalendars', () => ({ freePhotoCalendar: () => null }));
jest.mock('../model/premiumCalendarPapers', () => ({ isPremiumPaper: () => false, isRaisedCalendar: () => false }));
jest.mock('../model/heroCalendarDesign', () => ({ useHeroCalendarDesign: () => 'bold', isIllustrationCalendarDesign: () => false, CITY_CALENDAR_THEMES: [] }));
jest.mock('./FreePhotoCalendarPaper', () => ({ FreePhotoCalendarPaper: () => null }));
jest.mock('./HeroCalendarDesigns', () => ({ CalendarPaper: () => null }));
jest.mock('./HeroIllustrationCalendar', () => ({ HeroIllustrationCalendar: () => null }));
jest.mock('./HeroCalendarWidgetSync', () => ({ HeroCalendarWidgetSync: () => null }));
jest.mock('./HeroCalendarNote', () => ({ HeroCalendarNote: () => null }));

jest.mock('./CalendarRangePlans', () => {
  const { createContext } = require('react');
  return { CalendarPlansPanel: () => null, PlanAccentContext: createContext(null), PlanContext: createContext([]), readPlans: () => [] };
});

it('shows first-time plans guidance independently for someone who has opened notes', () => {
  const notesKey = 'pokit:calendar-notes-opened-v1';
  const plansKey = 'pokit:calendar-plans-opened-v1';
  localStorageClient.setItemRaw(notesKey, 'opened');
  localStorageClient.removeItem(plansKey);
  const params = { date: new Date(2026, 10, 1), month: new Date(2026, 10, 1), diaries: [], isDark: false, onSelectDate: jest.fn(), lastVisibleSize: { current: { width: 390, height: 700 } } };
  const scrollTo = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarBackground {...params} />, { createNodeMock: () => ({ scrollTo }) }); });
  const plansHints = () => tree.root.findAllByProps({ accessibilityLabel: 'comicCalendar.swipeDownForPlans' });
  try {
    expect(tree.root.findAllByProps({ accessibilityLabel: 'comicCalendar.swipeUpForNotes' })).toHaveLength(0);
    expect(plansHints().length).toBeGreaterThan(0);
    act(() => plansHints()[0].props.onPress());
    expect(plansHints()).toHaveLength(0);
    expect(localStorageClient.getItemRaw(plansKey)).toBe('opened');
    act(() => tree.update(<HeroCalendarBackground {...params} focused={false} />));
    act(() => tree.update(<HeroCalendarBackground {...params} />));
    expect(plansHints()).toHaveLength(0);
  } finally {
    act(() => tree.unmount());
    localStorageClient.removeItem(notesKey);
    localStorageClient.removeItem(plansKey);
  }
});

it.each(['tap', 'swipe'])('shows the hint once and dismisses it on %s', action => {
  const key = 'pokit:calendar-notes-opened-v1';
  const plansKey = 'pokit:calendar-plans-opened-v1';
  const previousHintKey = 'pokit:calendar-notes-hint-seen-v1';
  localStorageClient.setItemRaw(previousHintKey, 'seen');
  localStorageClient.removeItem(key);
  localStorageClient.removeItem(plansKey);
  const params = { date: new Date(2026, 10, 1), month: new Date(2026, 10, 1), diaries: [], isDark: false, onSelectDate: jest.fn(), lastVisibleSize: { current: { width: 390, height: 700 } } };
  const scrollTo = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarBackground {...params} visible={false} />, { createNodeMock: () => ({ scrollTo }) }); });
  const hints = () => tree.root.findAllByProps({ accessibilityLabel: 'comicCalendar.swipeUpForNotes' });
  const plansHints = () => tree.root.findAllByProps({ accessibilityLabel: 'comicCalendar.swipeDownForPlans' });
  try {
    expect(localStorageClient.getItemRaw(key)).toBeNull();
    act(() => tree.update(<HeroCalendarBackground {...params} />));
    expect(hints().length).toBeGreaterThan(0);
    expect(plansHints()).toHaveLength(0);
    expect(localStorageClient.getItemRaw(key)).toBeNull();
    act(() => tree.update(<HeroCalendarBackground {...params} focused={false} />));
    act(() => tree.update(<HeroCalendarBackground {...params} />));
    expect(hints().length).toBeGreaterThan(0);
    const scroll = tree.root.findByProps({ testID: 'calendar-note-scroll' }).props;
    const scrollToOffset = (y: number) => scroll.onScroll({ nativeEvent: { contentOffset: { y } } });
    act(() => scrollToOffset(0));
    expect(localStorageClient.getItemRaw(plansKey)).toBeNull();
    if (action === 'tap') {
      act(() => hints()[0].props.onPress());
      expect(localStorageClient.getItemRaw(plansKey)).toBeNull();
    } else {
      act(() => scrollToOffset(364));
      act(() => { scroll.onScrollBeginDrag({ nativeEvent: { contentOffset: { y: 364 } } }); scrollToOffset(420); });
      expect(localStorageClient.getItemRaw(key)).toBeNull();
      act(() => scrollToOffset(728));
    }
    expect(hints()).toHaveLength(0);
    expect(localStorageClient.getItemRaw(key)).toBe('opened');
    expect(plansHints()).toHaveLength(0);
    act(() => { scroll.onScrollBeginDrag({ nativeEvent: { contentOffset: { y: 728 } } }); scrollToOffset(0); });
    expect(localStorageClient.getItemRaw(plansKey)).toBeNull();
    act(() => scrollToOffset(364));
    expect(plansHints().length).toBeGreaterThan(0);
    act(() => tree.update(<HeroCalendarBackground {...params} visible={false} />));
    act(() => tree.update(<HeroCalendarBackground {...params} />));
    expect(hints()).toHaveLength(0);
  } finally { act(() => tree.unmount()); localStorageClient.removeItem(key); localStorageClient.removeItem(plansKey); localStorageClient.removeItem(previousHintKey); }
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { View: require('react-native').View },
  useSharedValue: () => require('react').useMemo(() => ({ value: 0 }), []),
  useAnimatedStyle: (style: () => unknown) => style(),
  withTiming: jest.fn(), withRepeat: jest.fn(), ReduceMotion: { System: 'system' },
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
  Gesture: { Race: jest.fn(), Pan: () => { const gesture = { enabled: jest.fn().mockReturnThis(), maxPointers: jest.fn().mockReturnThis(), activeOffsetY: jest.fn().mockReturnThis(), failOffsetX: jest.fn().mockReturnThis(), activeOffsetX: jest.fn().mockReturnThis(), failOffsetY: jest.fn().mockReturnThis(), runOnJS: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }; return gesture; } },
}));
