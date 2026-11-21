jest.mock('@features/subscriptions', () => ({ useSubscriptionStore: () => false, selectCanTestProStoreItems: () => false }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { CalendarPaper, HeroCalendarDesigns, calendarPaperDays } from './HeroCalendarDesigns';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ useSubscriptionStore: () => false, selectIsPro: () => false }));
jest.mock('../lib/storeArtwork', () => ({ useStoreArtwork: () => ({ artwork: { board: 1 } }) }));
jest.mock('../lib/calendarStoreDownload', () => ({
  installedPaper: () => ({ paper: '#fff', edge: '#ddd', revision: 1 }),
  installPaper: jest.fn(async () => {}), diaryImages: () => undefined,
  installDiaryItem: jest.fn(async () => {}), storeDownloadErrorMessage: () => 'download error',
}));
jest.mock('./WeatherSummary', () => ({ WeatherSummary: () => null, getCalendarWeatherReport: () => null }));
jest.mock('./usePremiumPackPaywall', () => ({ usePremiumPackPaywall: () => ({ present: async () => 'cancelled', modal: null }) }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(), setJson: jest.fn() } }));
beforeEach(() => {
  const data = new Map();
  jest.mocked(localStorageClient.getJson).mockImplementation(key => data.get(key) ?? null);
  jest.mocked(localStorageClient.setJson).mockImplementation((key, value) => { data.set(key, value); });
});

it('builds Monday-first leap months and year boundaries without duplicate dates', () => {
  const leap = calendarPaperDays(new Date(2024, 1, 15));
  expect(leap[0].getDay()).toBe(1);
  expect(leap.filter(day => day.getMonth() === 1)).toHaveLength(29);
  const january = calendarPaperDays(new Date(2027, 0, 1));
  expect(january[0].getFullYear()).toBe(2026);
  expect(new Set(january.map(day => day.getTime())).size).toBe(january.length);
});

it.each(['bold', 'grid', 'photo'] as const)('opens a date with one press in %s', design => {
  const onSelectDate = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarPaper design={design} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={onSelectDate} />); });
  act(() => tree.root.findByProps({ testID: 'calendar-paper-day-2026-11-09' }).props.onPress());
  expect(onSelectDate).toHaveBeenCalledWith('2026-11-09');
  act(() => tree.unmount());
});

it('applies and persists the selected free design', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarDesigns month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} onSelectDate={jest.fn()} />); });
  const button = tree.root.findByProps({ accessibilityLabel: 'Photo Paper, 무료, 한 장의 사진을 담은 달력' });
  act(() => { void button.props.onPress(); });
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:calendar-design', 'photo');
  expect(button.props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByType(CalendarPaper).map(paper => paper.props.design)).toContain('cream-kitten');
  expect(tree.root.findAllByType(CalendarPaper).every(paper => paper.props.miniature)).toBe(true);
  expect(tree.root.findAllByType(CalendarPaper).every(paper => paper.props.layoutWidth > 0)).toBe(true);
  act(() => tree.unmount());
});

it.each(['bold', 'grid', 'photo'] as const)('always displays saved photos on their dates in %s', design => {
  let tree!: ReactTestRenderer;
  const diaries = [{ id: 'photo-day', title: 'Diary', date: '2026-11-09', createdAt: 1, updatedAt: 1, characterId: 'protagonist-1', scenes: [{ id: 'photo', image: '05-work', title: 'Memory', memo: 'Saved writing', artworkUri: 'file:///saved.jpg' }] }] as any;
  act(() => { tree = create(<CalendarPaper design={design} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={diaries} />); });
  expect(tree.root.findAllByProps({ testID: 'calendar-paper-photo-2026-11-09' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'calendar-paper-photo-2026-11-10' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('marks linked event dates without replacing diary navigation', () => {
  const onSelectDate = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarPaper design="bold" month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={[]} eventDates={['2026-11-09']} onSelectDate={onSelectDate} />); });
  expect(tree.root.findAllByProps({ testID: 'calendar-event-ring-2026-11-09' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'calendar-paper-day-2026-11-09' })[0].props.onPress());
  expect(onSelectDate).toHaveBeenCalledWith('2026-11-09');
  act(() => tree.unmount());
});

it('renders clipboard photos with a loading placeholder and preserves date taps', () => {
  let tree!: ReactTestRenderer;
  const onSelectDate = jest.fn();
  const diaries = [{ id: 'photo-day', date: '2026-11-09', createdAt: 1, updatedAt: 1, scenes: [{ id: 'photo', artworkUri: 'file:///saved.jpg' }] }] as any;
  act(() => { tree = create(<CalendarPaper design="clipboard" month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={diaries} onSelectDate={onSelectDate} />); });
  expect(tree.root.findAllByProps({ testID: 'clipboard-photo-2026-11-09' }).length).toBeGreaterThan(0);
  const photoFrame = tree.root.findAllByProps({ testID: 'clipboard-photo-2026-11-09' })[0].props.style;
  expect(photoFrame.position).toBe('absolute');
  expect(photoFrame.width).toBeGreaterThan(0);
  expect(photoFrame.height).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'clipboard-day-2026-11-09' })[0].props.onPress());
  expect(onSelectDate).toHaveBeenCalledWith('2026-11-09');
  const image = tree.root.findAll(node => node.props.source?.uri === 'file:///saved.jpg' && !!node.props.onDisplay)[0];
  act(() => image.props.onDisplay());
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' })).toHaveLength(0);
  act(() => tree.unmount());
});

it.each(['bold', 'photo'] as const)('fits %s preview dates inside all seven columns at small widths', design => {
  for (const width of [72, 96, 120]) {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<CalendarPaper design={design} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 11)} diaries={[]} miniature layoutWidth={width} layoutHeight={width * 540 / 330} />); });
    const dates = tree.root.findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('calendar-preview-date-') && node.props.style?.fontSize);
    expect(dates.length).toBeGreaterThan(0);
    for (const date of dates) {
      const columnWidth = (width - 38 * width / 330) / 7;
      expect(date.props.style.fontSize * 1.5).toBeLessThan(columnWidth);
      expect(date.props.allowFontScaling).toBe(false);
      expect(date.props.numberOfLines).toBe(1);
    }
    act(() => tree.unmount());
  }
});


it('offers a weather calendar and persists it across reads', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarDesigns month={new Date(2026, 10, 1)} today={new Date(2026, 10, 13)} diaries={[]} onSelectDate={jest.fn()} />); });
  const card = tree.root.findByProps({ accessibilityLabel: 'Weather Calendar, 무료 · 적용하기, 현재 날씨와 날짜를 함께 보는 달력' });
  act(() => { void card.props.onPress(); });
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:calendar-design', 'weather');
  expect(require('../model/heroCalendarDesign').readHeroCalendarDesign()).toBe('weather');
  act(() => tree.unmount());
});

it('loads current weather only on the applied weather calendar', () => {
  const { WeatherSummary } = require('./WeatherSummary');
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarPaper design="weather" month={new Date(2026, 10, 1)} today={new Date(2026, 10, 13)} diaries={[]} onSelectDate={jest.fn()} />); });
  expect(tree.root.findAllByType(WeatherSummary)).toHaveLength(1);
  expect(tree.root.findAllByProps({ testID: 'calendar-paper-day-2026-11-13' }).length).toBeGreaterThan(0);
  act(() => tree.update(<CalendarPaper design="weather" miniature month={new Date(2026, 10, 1)} today={new Date(2026, 10, 13)} diaries={[]} />));
  expect(tree.root.findAllByType(WeatherSummary)).toHaveLength(0);
  act(() => tree.unmount());
});

// Widget snapshots keep record dates, but never create diary photo components.
it.each(['bold', 'grid', 'photo', 'clipboard', 'weather'] as const)('excludes date photos from both %s widget sizes', design => {
  const { HeroCalendarPhoto } = require('./HeroCalendarPhoto');
  const diaries = [{ id: 'photo-day', date: '2026-11-09', createdAt: 1, scenes: [{ id: 'photo', artworkUri: 'file:///saved.jpg' }] }] as any;
  for (const widgetSize of ['small', 'large'] as const) {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<CalendarPaper design={design} widgetSize={widgetSize} layoutWidth={330} layoutHeight={widgetSize === 'small' ? 330 : 346} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 9)} diaries={diaries} eventDates={['2026-11-09']} />); });
    expect(tree.root.findAllByType(HeroCalendarPhoto)).toHaveLength(0);
    if (design === 'clipboard') {
      const { HeroClipboardCalendar } = require('./HeroClipboardCalendar');
      const calendar = tree.root.findByType(HeroClipboardCalendar);
      expect(calendar.props.photos).toEqual({});
      expect(calendar.props.recordDates).toContain('2026-11-09');
    }
    expect(tree.root.findAll(node => node.props.source?.uri === 'file:///saved.jpg')).toHaveLength(0);
    if (design !== 'clipboard') expect(tree.root.findAllByProps({ testID: 'calendar-paper-day-2026-11-09' }).length).toBeGreaterThan(0);
    act(() => tree.unmount());
  }
  expect(diaries[0].scenes[0].artworkUri).toBe('file:///saved.jpg');
});
