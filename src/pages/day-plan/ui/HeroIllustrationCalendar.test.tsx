jest.mock('../lib/illustrationCalendarAssets', () => ({ getLoadedIllustrationCalendarAssets: () => ({ background: 'file:///background.webp', paper: 'file:///paper.webp', leaf: 'file:///leaf.webp' }), loadIllustrationCalendarAssets: jest.fn(async () => ({ background: 'file:///background.webp', paper: 'file:///paper.webp', leaf: 'file:///leaf.webp' })) }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroIllustrationCalendar, illustrationMonthCells, illustrationCellFrame } from './HeroIllustrationCalendar';
it('places November 1 on Sunday and keeps the last Monday in the sixth week', () => {
  const cells = illustrationMonthCells(new Date(2026, 10, 1));
  expect(cells.slice(0, 6)).toEqual(Array(6).fill(null));
  expect(cells[6]?.getDate()).toBe(1);
  expect(cells[35]?.getDate()).toBe(30);
  expect(cells.filter(Boolean)).toHaveLength(30);
});
it('includes leap day without leaking adjacent months', () => {
  const cells = illustrationMonthCells(new Date(2028, 1, 1));
  expect(cells.filter(Boolean)).toHaveLength(29);
  expect(cells.filter(Boolean).every(date => date?.getMonth() === 1)).toBe(true);
});
it('opens the actual date and navigates months from the illustrated controls', () => {
  const select = jest.fn(), move = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroIllustrationCalendar width={390} height={720} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={select} onMoveMonth={move} />); });
  try {
    act(() => tree.root.findAllByProps({ testID: 'illustration-calendar-day-2026-11-09' })[0].props.onPress());
    expect(select).toHaveBeenCalledWith('2026-11-09');
    act(() => tree.root.findAllByProps({ accessibilityLabel: '다음 달' })[0].props.onPress());
    expect(move).toHaveBeenCalledWith(1);
  } finally { act(() => tree.unmount()); }
});

it.each([[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [844, 390]])('keeps all themed date frames on the same artwork coordinates at %s × %s', (width, height) => {
  for (const theme of ['01-rush-hour-commute', '02-office-presentation', '03-spilled-coffee-report', '04-lunch-rooftop', '05-proud-promotion']) {
    for (let slot = 0; slot < 42; slot++) {
      const actual = illustrationCellFrame(theme, slot, width, height);
      const reference = illustrationCellFrame(theme, slot, 910, 1730);
      expect(actual.left / width).toBeCloseTo(reference.left / 910);
      expect(actual.top / height).toBeCloseTo(reference.top / 1730);
      expect(actual.left).toBeGreaterThanOrEqual(0);
      expect(actual.top).toBeGreaterThanOrEqual(0);
      expect(actual.left + actual.width).toBeLessThanOrEqual(width + 0.01);
      expect(actual.top + actual.height).toBeLessThanOrEqual(height + 0.01);
    }
  }
});
it('separates month, weekdays and six date rows in the revised artwork', () => {
  const { CALENDAR_ARTWORK_LAYOUTS } = require('../lib/illustrationCalendarLayouts');
  for (const layout of Object.values(CALENDAR_ARTWORK_LAYOUTS) as any[]) {
    expect(layout.month[1] + layout.month[3]).toBeLessThanOrEqual(layout.weekdays[1] + .002);
    expect(layout.weekdays[1] + layout.weekdays[3]).toBeLessThanOrEqual(layout.grid[1] + .002);
    expect(layout.sourceRows).toHaveLength(7);
  }
});

it.each([[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [844, 390]])('keeps date coordinates attached to the cover-scaled artwork at %s × %s', async (width, height) => {
  const { StyleSheet } = require('react-native');
  const bottomInset = 110;
  for (const themeId of ['01-rush-hour-commute', '02-office-presentation', '03-spilled-coffee-report', '04-lunch-rooftop', '05-proud-promotion']) {
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<HeroIllustrationCalendar themeId={themeId} width={width} height={height} bottomInset={bottomInset} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={jest.fn()} />); });
    try {
      const date = tree.root.findAllByProps({ testID: 'illustration-calendar-day-2026-11-30' })[0];
      const frame = StyleSheet.flatten(date.props.style({ pressed: false }));
      const { fitCalendarArtwork } = require('../lib/illustrationCalendarGeometry');
      const artwork = fitCalendarArtwork(themeId, width, height, 0, bottomInset);
      expect(frame.top + frame.height).toBeLessThanOrEqual(artwork.height);
    } finally { act(() => tree.unmount()); }
  }
});

it.each(['06-angry-email', '50-winter-bus-wait'])('renders downloaded theme %s without a missing layout crash', async themeId => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroIllustrationCalendar themeId={themeId} width={390} height={720} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'illustration-calendar-day-2026-11-09' }).length).toBeGreaterThan(0);
  for (let slot = 0; slot < 42; slot++) {
    expect(Object.values(illustrationCellFrame(themeId, slot, 390, 720)).every(Number.isFinite)).toBe(true);
  }
  act(() => tree.unmount());
});

it.each(['01-rush-hour-commute', '04-lunch-rooftop'])('marks linked event dates on %s without marking empty days', async themeId => {
  let tree!: ReactTestRenderer;
  const select = jest.fn();
  await act(async () => { tree = create(<HeroIllustrationCalendar themeId={themeId} width={390} height={844} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} eventDates={['2026-11-09']} onSelectDate={select} />); });
  expect(tree.root.findAllByProps({ testID: 'illustration-event-ring-2026-11-09' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'illustration-event-ring-2026-11-10' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'illustration-calendar-day-2026-11-09' })[0].props.onPress());
  expect(select).toHaveBeenCalledWith('2026-11-09');
  act(() => tree.unmount());
});

it('renders and opens event dates across all 50 themes with a photo present', async () => {
  const { CALENDAR_ARTWORK_SIZES } = require('../lib/illustrationCalendarGeometry');
  for (const themeId of Object.keys(CALENDAR_ARTWORK_SIZES)) {
    const select = jest.fn();
    let tree!: ReactTestRenderer;
    const diaries = [{ id: 'test', title: 'test', date: '2026-11-09', characterId: 'test', createdAt: 0, updatedAt: 0, scenes: [{ id: 'scene', artworkUri: 'file:///test-photo.jpg' }] }] as any;
    await act(async () => { tree = create(<HeroIllustrationCalendar themeId={themeId} width={375} height={667} topInset={20} bottomInset={90} month={new Date(2026,10,1)} today={new Date(2026,10,9)} diaries={diaries} eventDates={['2026-11-09']} onSelectDate={select} />); });
    try {
      expect(tree.root.findAllByProps({ testID: 'illustration-event-ring-2026-11-09' }).length).toBeGreaterThan(0);
      expect(tree.root.findAllByProps({ testID: 'illustration-calendar-polaroid-2026-11-09' }).length).toBeGreaterThan(0);
      act(() => tree.root.findAllByProps({ testID: 'illustration-calendar-day-2026-11-09' })[0].props.onPress());
      expect(select).toHaveBeenCalledWith('2026-11-09');
    } finally { act(() => tree.unmount()); }
  }
});

it('restores the default calendar when the selected illustration files are missing', async () => {
  const { loadIllustrationCalendarAssets } = require('../lib/illustrationCalendarAssets');
  const { applyHeroCalendarDesign, readHeroCalendarDesign } = require('../model/heroCalendarDesign');
  applyHeroCalendarDesign('city-animation-04');
  (loadIllustrationCalendarAssets as jest.Mock).mockRejectedValueOnce(new Error('theme_not_downloaded'));
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<HeroIllustrationCalendar themeId="04-lunch-rooftop" width={390} height={844} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={jest.fn()} />); });
    expect(readHeroCalendarDesign()).toBe('bold');
    expect(tree.root.findAllByProps({ testID: 'illustration-calendar-artwork' })).toHaveLength(0);
  } finally { act(() => tree?.unmount()); }
});
