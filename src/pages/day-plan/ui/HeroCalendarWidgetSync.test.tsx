import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { NativeModules, Platform } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { HeroCalendarWidgetSync } from './HeroCalendarWidgetSync';
import { CalendarPaper } from './HeroCalendarDesigns';
import { setCalendarPhotosHidden } from '@shared/lib/calendarLayoutPreferences';
jest.mock('../lib/calendarStoreDownload', () => ({ diaryImages: {} }));
jest.mock('./HeroCalendarDesigns', () => ({ CalendarPaper: () => null }));
jest.mock('./HeroIllustrationCalendar', () => ({ HeroIllustrationCalendar: () => null }));
jest.mock('../model/heroCalendarDesign', () => ({ CITY_CALENDAR_THEMES: [], useHeroCalendarCover: () => null }));
jest.mock('../lib/illustrationCalendarAssets', () => ({ getLoadedIllustrationCalendarAssets: () => null }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///widget.png'), releaseCapture: jest.fn() }));
const props = { design: 'photo' as const, month: new Date(2026, 10, 1), today: new Date(2026, 10, 10), diaries: [], eventDates: ['2026-11-10'] };
let tree: ReactTestRenderer | undefined;
const originalOS = Platform.OS;
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' }); });
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; delete NativeModules.PokitWidgetSync; Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }); jest.clearAllTimers(); jest.useRealTimers(); });
it('renders the selected design with diary dates and copies the image before releasing it', async () => {
  const sync = jest.fn(async () => undefined);
  NativeModules.PokitWidgetSync = { syncCalendarWidgetImage: sync };
  act(() => { tree = create(<HeroCalendarWidgetSync {...props} />); });
  expect(tree!.root.findAllByType(CalendarPaper)[0].props).toEqual(expect.objectContaining({ design: 'photo', month: props.month, eventDates: props.eventDates }));
  await act(async () => { jest.advanceTimersByTime(400); });
  expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useRenderInContext: true }));
  expect(sync).toHaveBeenCalledWith('file:///widget.png', '2026-11');
  expect(releaseCapture).toHaveBeenCalledWith('file:///widget.png');
  expect(sync.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(releaseCapture).mock.invocationCallOrder[0]);
});
it('does not attempt capture in a build without the native bridge', async () => {
  act(() => { tree = create(<HeroCalendarWidgetSync {...props} />); });
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(tree!.toJSON()).toBeNull();
  expect(captureRef).not.toHaveBeenCalled();
});
it('cancels pending renders when the calendar closes', async () => {
  NativeModules.PokitWidgetSync = { syncCalendarWidgetImage: jest.fn() };
  act(() => { tree = create(<HeroCalendarWidgetSync {...props} />); });
  act(() => tree!.unmount()); tree = undefined;
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(captureRef).not.toHaveBeenCalled();
});

it('captures a settled calendar once and refreshes when its content changes', async () => {
  NativeModules.PokitWidgetSync = { syncCalendarWidgetImage: jest.fn(async () => undefined) };
  act(() => { tree = create(<HeroCalendarWidgetSync {...props} />); });
  await act(async () => { jest.advanceTimersByTime(400); });
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(captureRef).toHaveBeenCalledTimes(1);
  act(() => { tree!.update(<HeroCalendarWidgetSync {...props} eventDates={['2026-11-11']} />); });
  await act(async () => { jest.advanceTimersByTime(400); });
  expect(captureRef).toHaveBeenCalledTimes(2);
});

it('prepares only the large calendar', () => {
  NativeModules.PokitWidgetSync = { syncCalendarWidgetImageForFamily: jest.fn() };
  act(() => { tree = create(<HeroCalendarWidgetSync {...props} />); });
  const calendars = tree!.root.findAllByType(CalendarPaper);
  expect(calendars.map(calendar => calendar.props.widgetSize)).toEqual(['large']);
  expect(calendars.map(calendar => calendar.props.layoutHeight)).toEqual([346]);
});

it('replaces the large widget snapshot when the photo visibility preference changes', async () => {
  const diaries = [{ id: 'record', date: '2026-11-09', scenes: [{ id: 'photo', artworkUri: 'file:///saved.jpg' }] }] as any;
  const sync = jest.fn(async () => undefined);
  NativeModules.PokitWidgetSync = { syncCalendarWidgetImageForFamily: sync };
  act(() => { setCalendarPhotosHidden(false); tree = create(<HeroCalendarWidgetSync {...props} design="cream-kitten" diaries={diaries} />); });
  try {
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(sync).toHaveBeenCalledTimes(1);
    act(() => setCalendarPhotosHidden(true));
    expect(tree!.root.findAllByType(CalendarPaper)[0].props.diaries[0].scenes[0].artworkUri).toBeUndefined();
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(sync.mock.calls.slice(1)).toEqual([
      ['file:///widget.png', '2026-11', 'large'],
    ]);
    expect(diaries[0].scenes[0].artworkUri).toBe('file:///saved.jpg');
    act(() => setCalendarPhotosHidden(false));
    expect(tree!.root.findAllByType(CalendarPaper)[0].props.diaries[0].scenes[0].artworkUri).toBe('file:///saved.jpg');
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(sync).toHaveBeenCalledTimes(3);
  } finally { act(() => setCalendarPhotosHidden(false)); }
});
