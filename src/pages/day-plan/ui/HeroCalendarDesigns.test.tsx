import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { CalendarPaper, HeroCalendarDesigns, calendarPaperDays } from './HeroCalendarDesigns';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(), setJson: jest.fn() } }));
beforeEach(() => {
  const data = new Map();
  jest.mocked(localStorageClient.getJson).mockImplementation(key => data.get(key));
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
  act(() => button.props.onPress());
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:calendar-design', 'photo');
  expect(button.props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByType(CalendarPaper)).toHaveLength(3);
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
  const image = tree.root.findAll(node => node.props.source?.uri === 'file:///saved.jpg' && !!node.props.onLoad)[0];
  act(() => image.props.onLoad());
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' })).toHaveLength(0);
  act(() => tree.unmount());
});
