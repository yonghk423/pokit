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
