import { launchImageLibraryAsync } from 'expo-image-picker';
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), UIImagePickerPresentationStyle: { FULL_SCREEN: 'fullScreen' } }));
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', makeDirectoryAsync: jest.fn(async () => {}), copyAsync: jest.fn(async () => {}), deleteAsync: jest.fn(async () => {}) }));
import { CalendarPaper, HeroCalendarDesigns } from './HeroCalendarDesigns';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
beforeEach(() => { localStorageClient.removeItem('pokit:calendar-design'); localStorageClient.removeItem('pokit:calendar-cover:2026-11'); });
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroCalendarBackground } from './HeroCalendarBackground';
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').Image }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));


it('applies a collection choice to the live calendar and restores it on remount with working dates', () => {
  const onSelectDate = jest.fn();
  const common = { today: new Date(2026, 10, 9), month: new Date(2026, 10, 1), diaries: [], onSelectDate };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<><HeroCalendarDesigns {...common} /><HeroCalendarBackground date={common.today} month={common.month} diaries={[]} isDark={false} onSelectDate={onSelectDate} /></>); });
  try {
    act(() => tree.root.findByProps({ accessibilityLabel: 'Photo Paper, 무료, 한 장의 사진을 담은 달력' }).props.onPress());
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 375, height: 580 } } }));
    const live = tree.root.findAllByType(CalendarPaper).find(paper => !paper.props.miniature)!;
    expect(live.props.design).toBe('photo');
    act(() => live.findByProps({ testID: 'calendar-paper-day-2026-11-09' }).props.onPress());
    expect(onSelectDate).toHaveBeenCalledWith('2026-11-09');
    act(() => tree.update(<HeroCalendarBackground date={common.today} month={common.month} diaries={[]} isDark={false} onSelectDate={onSelectDate} />));
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 375, height: 580 } } }));
    expect(tree.root.findByType(CalendarPaper).props.design).toBe('photo');
    expect(tree.root.findByType(CalendarPaper).props.layoutWidth).toBeGreaterThan(0);
  } finally { act(() => tree.unmount()); }
});


it('starts with an empty cover and saves only the user-selected monthly photo', async () => {
  localStorageClient.setJson('pokit:calendar-design', 'photo');
  jest.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///picked.jpg', width: 1000, height: 1200 }] });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCalendarBackground date={new Date(2026, 10, 9)} month={new Date(2026, 10, 1)} isDark={false} diaries={[]} onSelectDate={jest.fn()} />); });
  try {
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 320, height: 460 } } }));
    expect(tree.root.findByType(CalendarPaper).props.layoutHeight).toBe(460);
    expect(tree.root.findAllByProps({ testID: 'calendar-cover-image' })).toHaveLength(0);
    await act(async () => { tree.root.findByProps({ testID: 'calendar-cover-picker' }).props.onPress(); });
    expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ testID: 'calendar-cover-image' }).props.source.uri).toContain('/calendar-covers/2026-11-');
    const saved = localStorageClient.getJson('pokit:calendar-cover:2026-11');
    expect(saved).toBeTruthy();
    jest.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
    await act(async () => { tree.root.findByProps({ testID: 'calendar-cover-picker' }).props.onPress(); });
    expect(localStorageClient.getJson('pokit:calendar-cover:2026-11')).toBe(saved);
  } finally { act(() => tree.unmount()); }
});


it.each([[320, 460], [430, 800], [740, 300]])('fits the default design in a %s by %s canvas on its first measured render', (width, height) => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCalendarBackground date={new Date(2026, 10, 9)} month={new Date(2026, 10, 1)} isDark={false} diaries={[]} onSelectDate={jest.fn()} />); });
  try {
    expect(tree.root.findAllByType(CalendarPaper)).toHaveLength(0);
    expect(tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.style.marginTop).toBeGreaterThanOrEqual(8);
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width, height } } }));
    const paper = tree.root.findByType(CalendarPaper);
    expect(paper.props.design).toBe('bold');
    expect(paper.props.layoutWidth).toBe(width);
    expect(paper.props.layoutHeight).toBe(height);
  } finally { act(() => tree.unmount()); }
});

it('keeps month navigation inside the selected calendar design', () => {
  const { SafeAreaInsetsContext } = require('react-native-safe-area-context');
  const previous = jest.fn(), next = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 34, left: 0, right: 0 }}><HeroCalendarBackground date={new Date(2026, 10, 9)} month={new Date(2026, 10, 1)} isDark={false} diaries={[]} onSelectDate={jest.fn()} onPreviousMonth={previous} onNextMonth={next} /></SafeAreaInsetsContext.Provider>); });
  try {
    act(() => tree.root.findByProps({ testID: 'hero-calendar-applied-design' }).props.onLayout({ nativeEvent: { layout: { width: 375, height: 580 } } }));
    const paper = tree.root.findByType(CalendarPaper);
    expect(paper.props.hideMonthHeading).not.toBe(true);
    act(() => paper.findByProps({ accessibilityLabel: '이전 달' }).props.onPress());
    act(() => paper.findByProps({ accessibilityLabel: '다음 달' }).props.onPress());
    expect(previous).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});
