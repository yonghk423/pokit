import { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, StyleSheet, View } from 'react-native';
import { DayPlanTabScreenShell } from './DayPlanTabScreenShell';
import { useDayPlanHeaderActions } from '../model/dayPlanHeaderActions';

let mockWeatherAvailable = true;
let mockPlanMode = 'priority';
let mockSegments = ['(tabs)', 'day-plan'];
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), useSegments: () => mockSegments, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@entities/day-plan', () => ({ consumePendingWidgetPlanMode: jest.fn(async () => null), useDayPlanDraftStore: (selector: (state: unknown) => unknown) => selector({ planMode: mockPlanMode, setPlanMode: jest.fn() }) }));
jest.mock('@shared/lib/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@shared/lib/i18n/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/header-icon', () => ({ HeaderIcon: () => null }));
jest.mock('./WeatherSummary', () => ({ WeatherSummary: () => {
  const { useTutorialGuideLayer } = jest.requireActual('@shared/ui/tutorial-guide-layer');
  const NativeView = jest.requireActual('react-native').View;
  const guideOwner = useTutorialGuideLayer();
  return mockWeatherAvailable ? <NativeView testID="weather-guide-owner" guideOwner={guideOwner} style={{ height: 28 }} /> : null;
} }));
jest.mock('./SettingsTopBarButton', () => ({ SettingsTopBarButton: () => {
  const NativeView = jest.requireActual('react-native').View;
  return <NativeView testID="fixed-settings" />;
} }));

function RegisterActions({ onPress }: { onPress: () => void }) {
  const register = useDayPlanHeaderActions();
  useLayoutEffect(() => {
    register?.(<Pressable testID="layout-control" onPress={onPress} />);
    return () => register?.(null);
  }, [register, onPress]);
  return <View testID="daily-content" />;
}

it('hosts daily layout controls in the settings row and hides them in other modes', async () => {
  mockPlanMode = 'priority';
  const onPress = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<DayPlanTabScreenShell><RegisterActions onPress={onPress} /></DayPlanTabScreenShell>); });
  const host = tree.root.findAll(node => node.props.testID === 'day-plan-header-layout-actions')[0];
  expect(host).toBeDefined();
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'planMode.quickMemo')).toHaveLength(0);
  // There are other plan-mode controls, so locate the registered action by its stable ID.
  const action = tree.root.findAll(node => node.props.testID === 'layout-control' && typeof node.props.onPress === 'function')[0];
  act(() => action.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(View).some(node => node.props.testID === 'fixed-settings')).toBe(true);
  mockPlanMode = 'quickMemo';
  await act(async () => tree.update(<DayPlanTabScreenShell><RegisterActions onPress={onPress} /></DayPlanTabScreenShell>));
  expect(tree.root.findAll(node => node.props.testID === 'layout-control')).toHaveLength(0);
  expect(tree.root.findAllByType(View).some(node => node.props.testID === 'fixed-settings')).toBe(true);
  act(() => tree.unmount());
});

it('keeps diary and cards available while hiding paused daily layouts', async () => {
  const { DayPlanLayoutModeTabs } = require('./DayPlanLayoutModeTabs');
  const { palette } = require('../lib/dayPlanPalette');
  const onCards = jest.fn();
  const onCircle = jest.fn();
  const onList = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<DayPlanLayoutModeTabs mode="bag" c={palette(false)} isDark={false} showCircularTimetable onSelectMode={onList} onSelectCards={onCards} onSelectCircular={onCircle} onSelectComic={jest.fn()} cardsActive />); });
  const tabs = tree.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'tab');
  expect(tabs).toHaveLength(2);
  expect(onCircle).not.toHaveBeenCalled();
  expect(onList).not.toHaveBeenCalled();
  // Selected cards remain selected when re-pressed; the other tab is the diary.
  expect(tabs[1].props.accessibilityState.selected).toBe(true);
  act(() => tree.unmount());
});


it.each(['day-plan', 'comic-day'])('keeps %s header ownership while another tab becomes active', async tabName => {
  mockPlanMode = 'priority';
  mockSegments = ['(tabs)', tabName];
  const onPress = jest.fn();
  let tree!: ReactTestRenderer;
  const render = () => <DayPlanTabScreenShell tabName={tabName}><RegisterActions onPress={onPress} /></DayPlanTabScreenShell>;
  await act(async () => { tree = create(render()); });
  const { PlanModeSwitch } = require('./PlanModeSwitch');
  expect(tree.root.findByType(PlanModeSwitch).props.fixedMiddle).toBe(tabName === 'comic-day');
  mockSegments = ['(tabs)', tabName === 'comic-day' ? 'day-plan' : 'comic-day'];
  await act(async () => { tree.update(render()); });
  expect(tree.root.findByType(PlanModeSwitch).props.fixedMiddle).toBe(tabName === 'comic-day');
  expect(tree.root.findByType(PlanModeSwitch).props.middle).not.toBeNull();
  act(() => { tree.unmount(); });
  mockSegments = ['(tabs)', 'day-plan'];
});


it('reserves the full comic header before weather and title arrive and retains it after failure', async () => {
  mockWeatherAvailable = false;
  mockPlanMode = 'priority';
  let tree!: ReactTestRenderer;
  const render = (withTitle: boolean) => <DayPlanTabScreenShell tabName="comic-day">{withTitle ? <RegisterActions onPress={jest.fn()} /> : <View />}</DayPlanTabScreenShell>;
  await act(async () => { tree = create(render(false)); });
  const dimensions = () => ({
    header: StyleSheet.flatten(tree.root.findAllByProps({ testID: 'comic-header-trailing' })[0].props.style).minHeight,
    weather: StyleSheet.flatten(tree.root.findAllByProps({ testID: 'comic-header-weather-slot' })[0].props.style).minHeight,
  });
  const reserved = dimensions();
  expect(reserved.weather).toBeGreaterThanOrEqual(28);
  expect(reserved.header).toBe(46 + reserved.weather);
  mockWeatherAvailable = true;
  await act(async () => tree.update(render(true)));
  expect(tree.root.findAllByProps({ testID: 'weather-guide-owner' }).length).toBeGreaterThan(0);
  expect(dimensions()).toEqual(reserved);
  mockWeatherAvailable = false;
  await act(async () => tree.update(render(true)));
  expect(tree.root.findAllByProps({ testID: 'weather-guide-owner' })).toHaveLength(0);
  expect(dimensions()).toEqual(reserved);
  act(() => tree.unmount());
  mockWeatherAvailable = true;
});

it('does not show the old right-hand date, even across midnight', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 29, 23, 59, 59));
  mockWeatherAvailable = false;
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<DayPlanTabScreenShell tabName="comic-day"><View /></DayPlanTabScreenShell>); });
    expect(tree.root.findAllByProps({ testID: 'comic-header-today' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'weather-guide-owner' })).toHaveLength(0);
    act(() => jest.advanceTimersByTime(1500));
    expect(tree.root.findAllByProps({ testID: 'comic-header-today' })).toHaveLength(0);
    act(() => tree.unmount());
  } finally { mockWeatherAvailable = true; jest.useRealTimers(); }
});

it('reclaims header space only while the comic composer keyboard is open', async () => {
 const { DayPlanComposerKeyboardContext }=require('../model/dayPlanHeaderActions');
 function ComposerKeyboard({open}:{open:boolean}) {
  const setOpen=require('react').useContext(DayPlanComposerKeyboardContext);
  useLayoutEffect(()=>{setOpen?.(open);return()=>setOpen?.(false);},[open,setOpen]);
  return <View testID="composer-content"/>;
 }
 let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<DayPlanTabScreenShell tabName="comic-day"><ComposerKeyboard open/></DayPlanTabScreenShell>);});
 const header=()=>tree.root.findAllByProps({testID:'day-plan-shell-header'})[0];
 expect(StyleSheet.flatten(header().props.style).display).toBe('none');
 expect(tree.root.findAllByProps({testID:'composer-content'}).length).toBeGreaterThan(0);
 await act(async()=>tree.update(<DayPlanTabScreenShell tabName="comic-day"><ComposerKeyboard open={false}/></DayPlanTabScreenShell>));
 expect(StyleSheet.flatten(header().props.style).display).not.toBe('none');
 await act(async()=>tree.update(<DayPlanTabScreenShell tabName="day-plan"><ComposerKeyboard open/></DayPlanTabScreenShell>));
 expect(StyleSheet.flatten(header().props.style).display).not.toBe('none');
 act(()=>tree.unmount());
});

it('places the menu, Today and settings in one flex row with equal side slots', async () => {
  const { useContext } = require('react');
  const { DayPlanHeaderCenterActionsContext } = require('../model/dayPlanHeaderActions');
  function RegisterHeader() {
    const registerMenu = useDayPlanHeaderActions();
    const registerCenter = useContext(DayPlanHeaderCenterActionsContext);
    useLayoutEffect(() => {
      registerMenu?.(<View testID="aligned-menu" style={{ height: 44 }} />);
      registerCenter?.(<View testID="aligned-today" style={{ height: 44 }} />);
      return () => { registerMenu?.(null); registerCenter?.(null); };
    }, [registerMenu, registerCenter]);
    return null;
  }
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<DayPlanTabScreenShell tabName="comic-day"><RegisterHeader /></DayPlanTabScreenShell>); });
  const row = tree.root.findAllByProps({ testID: 'day-plan-header-row' })[0];
  expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row');
  const center = row.findAllByProps({ testID: 'day-plan-header-center-actions' })[0];
  expect(StyleSheet.flatten(center.props.style)).toMatchObject({ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' });
  expect(center.findAllByProps({ testID: 'aligned-today' }).length).toBeGreaterThan(0);
  expect(row.findAllByProps({ testID: 'aligned-menu' }).length).toBeGreaterThan(0);
  expect(row.findAllByProps({ testID: 'fixed-settings' }).length).toBeGreaterThan(0);
  expect(center.props.style.position).toBeUndefined();
  const slots = row.props.children.filter(Boolean);
  expect(StyleSheet.flatten(slots[0].props.style)).toMatchObject({ flex: 1, minWidth: 0, alignSelf: 'flex-start' });
  expect(StyleSheet.flatten(slots.at(-1).props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  act(() => tree.unmount());
});

it('hides the home header for the camera tab even when the keyboard is closed', async () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { HeroCharacterPickerActionProvider, HeroCharacterPickerActionContext } = jest.requireActual('../model/heroCharacterPickerAction');
  function CameraSelection() {
    const actions = React.useContext(HeroCharacterPickerActionContext) as { setPhotoActive: (active: boolean) => void };
    React.useLayoutEffect(() => { actions.setPhotoActive(true); }, [actions.setPhotoActive]);
    return <View />;
  }
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterPickerActionProvider><DayPlanTabScreenShell tabName="comic-day"><CameraSelection /></DayPlanTabScreenShell></HeroCharacterPickerActionProvider>); });
  try {
    const header = tree.root.findAllByProps({ testID: 'day-plan-shell-header' })[0];
    expect(StyleSheet.flatten(header.props.style).display).toBe('none');
    expect(header.props.accessibilityElementsHidden).toBe(true);
  } finally { act(() => tree.unmount()); }
});
