import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { RowColorPaletteBridgeProvider, RowColorPaletteDesk } from './RowColorPaletteBridge';
import { StationeryCaptionIcon } from '@shared/ui/stationery-desk/StationeryCaptionIcon';

jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/icon-symbol', () => ({ IconSymbol: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/stationery-tool', () => ({ StationeryTool: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/palette-selection-check', () => ({ PaletteSelectionCheck: jest.requireActual('react-native').View }));
jest.mock('react-native-gesture-handler', () => ({ FlatList: jest.requireActual('react-native').FlatList }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View },
  FadeIn: { duration: () => ({ reduceMotion: () => undefined }) },
  ReduceMotion: { System: 'system' },
  Easing: { cubic: jest.fn(), inOut: jest.fn() },
  withTiming: (value: number) => value,
  useSharedValue: (value: number) => ({ value, set: jest.fn() }),
  useAnimatedStyle: (style: () => unknown) => style(),
  withSpring: (value: number) => value,
}));

it('switches between paper and ink tabs and preserves selected colors', () => {
  const onColor = jest.fn();
  function Harness() {
    const [selected, setSelected] = useState<Record<string, string | null>>({});
    const choose = (tool: string, color: string | null) => {
      onColor(tool, color);
      setSelected((current) => ({ ...current, [tool]: color }));
    };
    return (
      <RowColorPaletteBridgeProvider
        ink="#222222" muted="#666666" isDark={false}
        tabs={(['face', 'ink'] as const).map((id) => ({
          id, label: id,
          choices: (['vividRed', 'vividOrange', 'vividYellow', 'vividGreen', 'vividBlue', 'vividIndigo', 'vividViolet', 'black'] as const).filter((color) => id === 'ink' ? color !== 'vividIndigo' : color !== 'black').map((color) => ({ id: color, color: '#ff0000', selected: selected[id] === color, labelKey: `dayPlan.quickMemoInkSwatch.${color}` as const, onSelect: () => choose(id, color) })),
          reset: () => choose(id, null),
        }))}>
        <RowColorPaletteDesk />
      </RowColorPaletteBridgeProvider>
    );
  }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Harness />); });
  const find = (label: string) => tree.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  const layoutPaperGrid = () => {
    const grid = tree.root.findAll((node) => node.props.accessibilityRole === 'toolbar' && typeof node.props.onLayout === 'function')[0];
    if (grid) act(() => grid.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
  };
  layoutPaperGrid();
  const press = (label: string) => {
    act(() => find(label).props.onPress());
    layoutPaperGrid();
  };
  const label = (id: string) => `${id} dayPlan.quickMemoInkSwatch.vividRed`;

  expect(find('dayPlan.stationeryTools').props.accessibilityState.expanded).toBe(false);
  expect(find('face')).toBeUndefined();
  expect(find(label('face'))).toBeUndefined();
  press('dayPlan.stationeryTools');
  expect(find('dayPlan.stationeryTools').props.accessibilityState.expanded).toBe(true);
  expect(tree.root.findAll((node) => node.props.accessibilityRole === 'tab' && node.props.onPress)).toHaveLength(2);
  expect(find('mark')).toBeUndefined();
  expect(find(label('face'))).toBeDefined();
  expect(find(label('ink'))).toBeUndefined();
  const iconColor = (kind: string) => tree.root.findAllByType(StationeryCaptionIcon).reverse().find((node) => node.props.kind === kind)!.props.color;
  expect(iconColor('face')).toBe('#FBFAF6');
  expect(iconColor('ink')).toBe('#222222');
  for (const id of ['face', 'ink']) {
    press(id);
    expect(find(id).props.accessibilityState.selected).toBe(true);
    for (const color of ['vividOrange', 'vividYellow', 'vividGreen', 'vividBlue', 'vividIndigo', 'vividViolet', 'vividRed']) {
      if (id === 'ink' && color === 'vividIndigo') continue;
      press(`${id} dayPlan.quickMemoInkSwatch.${color}`);
      expect(onColor).toHaveBeenLastCalledWith(id, color);
    }
    expect(find(label(id)).props.accessibilityState.selected).toBe(true);
    expect(iconColor(id)).toBe('#ff0000');
  }
  press('ink');
  press('ink dayPlan.quickMemoInkSwatch.black');
  expect(onColor).toHaveBeenLastCalledWith('ink', 'black');
  press('face');
  expect(find(label('face')).props.accessibilityState.selected).toBe(true);
  expect(find('ink dayPlan.quickMemoInkSwatch.black')).toBeUndefined();
  press('ink');
  expect(find('ink dayPlan.quickMemoInkSwatch.black').props.accessibilityState.selected).toBe(true);
  press('dayPlan.stationeryTools');
  expect(find('ink')).toBeUndefined();
  expect(find('ink dayPlan.quickMemoInkSwatch.black')).toBeUndefined();
  press('dayPlan.stationeryTools');
  expect(find('ink').props.accessibilityState.selected).toBe(true);
  expect(find('ink dayPlan.quickMemoInkSwatch.black').props.accessibilityState.selected).toBe(true);
  act(() => tree.unmount());
});
