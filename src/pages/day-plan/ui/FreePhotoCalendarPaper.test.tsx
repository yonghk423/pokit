import { act, create } from 'react-test-renderer';
import { Text, StyleSheet } from 'react-native';
import { FreePhotoCalendarPaper } from './FreePhotoCalendarPaper';
import { CalendarPaper } from './HeroCalendarDesigns';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { PHOTO_CALENDARS } from '../model/freePhotoCalendars';

jest.mock('@features/subscriptions', () => ({ useSubscriptionStore: () => false, selectCanTestProStoreItems: () => false }));
jest.mock('../lib/storeArtwork', () => ({ useStoreArtwork: () => ({ artwork: { board: 1 } }) }));
jest.mock('./usePremiumPackPaywall', () => ({ usePremiumPackPaywall: () => ({ present: async () => 'cancelled', modal: null }) }));
jest.mock('./HeroCalendarPhoto', () => ({ HeroCalendarPhoto: () => null }));
const props = {
  month: new Date(2026, 10, 1), today: new Date(2026, 10, 22), width: 330,
  diaries: [{ id: 'record', date: '2026-11-09', createdAt: 1, scenes: [{ id: 'photo', artworkUri: 'file:///saved.jpg' }] }] as any,
};

it.each(PHOTO_CALENDARS.map(theme => theme.id))('fits %s text within its regions in both widget sizes', design => {
  for (const widgetSize of ['small', 'large'] as const) {
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<CalendarPaper {...props} design={design} layoutWidth={330} layoutHeight={widgetSize === 'small' ? 330 : 346} widgetSize={widgetSize} />); });
    try {
      expect(tree.root.findByType(FreePhotoCalendarPaper).props.widgetSize).toBe(widgetSize);
      expect(tree.root.findAllByType(HeroCalendarPhoto)).toHaveLength(1);
      const heading = tree.root.findByProps({ testID: 'photo-calendar-heading-region' }).props.style;
      const weekdays = tree.root.findByProps({ testID: 'photo-calendar-weekday-region' }).props.style;
      const grid = tree.root.findByProps({ testID: 'photo-calendar-grid-region' }).props.style;
      expect(heading.top + heading.height).toBeLessThanOrEqual(weekdays.top);
      expect(weekdays.top + weekdays.height).toBeLessThanOrEqual(grid.top);
      expect(grid.top + grid.height).toBeLessThanOrEqual(widgetSize === 'small' ? 330 : 346);
      const photo = tree.root.findByType(HeroCalendarPhoto).parent!.props.style;
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.height).toBeLessThan(grid.height / 6);
      for (const text of tree.root.findAllByType(Text)) {
        const style = StyleSheet.flatten(text.props.style);
        const parentStyle = StyleSheet.flatten(text.parent!.props.style);
        expect(text.props.allowFontScaling).toBe(false);
        expect(style.fontSize).toBeLessThanOrEqual(style.lineHeight);
        if (typeof parentStyle?.height === 'number') expect(style.lineHeight).toBeLessThanOrEqual(parentStyle.height);
      }
    } finally { act(() => tree.unmount()); }
  }
});

it('retains diary photos in the app calendar', () => {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<FreePhotoCalendarPaper {...props} design="cream-kitten" height={600} />); });
  expect(tree.root.findAllByType(HeroCalendarPhoto)).toHaveLength(1);
  act(() => tree.unmount());
});

it('leaves neighbouring months empty and only opens dates in the displayed month', () => {
  const select = jest.fn();
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<FreePhotoCalendarPaper {...props} design="cream-kitten" height={800} onSelectDate={select} />); });
  try {
    const dates = tree.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && /^2026-\d{2}-\d{2}$/.test(node.props.accessibilityLabel) && typeof node.props.onPress === 'function');
    expect(new Set(dates.map(node => node.props.accessibilityLabel)).size).toBe(30);
    expect(dates.every(node => node.props.accessibilityLabel.startsWith('2026-11-'))).toBe(true);
    expect(tree.root.findAll(node => node.props.accessibilityLabel === '2026-12-03')).toHaveLength(0);
    const empty = tree.root.findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('photo-calendar-empty-'));
    expect(empty.length).toBeGreaterThan(0);
    expect(empty.every(node => !node.props.onPress && node.props.pointerEvents === 'none')).toBe(true);
    act(() => dates.find(node => node.props.accessibilityLabel === '2026-11-03')!.props.onPress());
    expect(select).toHaveBeenCalledWith('2026-11-03');
  } finally { act(() => tree.unmount()); }
});
