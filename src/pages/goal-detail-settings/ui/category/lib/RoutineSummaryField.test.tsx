import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput, StyleSheet } from 'react-native';
import { RoutineSummaryField } from './RoutineSummaryField';

let mockInk = '#1685F8';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('@shared/ui/presentation', () => ({ useUiSurfacePresentation: () => 'note' }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('@shared/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@shared/ui/color-palette-tabs', () => ({
  RowColorPaletteDesk: () => null,
  useRowColorPaletteBridge: () => ({
    ink: '#111111',
    tabs: [{ id: 'ink', choices: [{ selected: true, color: mockInk }] }],
  }),
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View },
  useSharedValue: (value: number) => ({ value, set: jest.fn() }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (value: number) => value,
  interpolateColor: (_v: number, _range: number[], colors: string[]) => colors[0],
  Easing: { out: (fn: unknown) => fn, cubic: jest.fn() },
}));

it('refreshes existing summary text with the selected ink without changing its contents', () => {
  const onChange = jest.fn();
  const palette = { onSurface: '#222222', onVariant: '#666666', outline: '#aaaaaa', outlineVariant: '#dddddd', surfaceLow: '#ffffff', surfaceLowest: '#ffffff', usesLightInk: false };
  const render = () => <RoutineSummaryField value="기존 요약" onChangeValue={onChange} palette={palette} />;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render()); });
  const before = tree.root.findByType(TextInput);
  expect(StyleSheet.flatten(before.props.style).color).toBe('#1685F8');
  mockInk = '#EF233C';
  act(() => tree.update(render()));
  const after = tree.root.findByType(TextInput);
  expect(after).not.toBe(before);
  expect(after.props.value).toBe('기존 요약');
  expect(StyleSheet.flatten(after.props.style).color).toBe('#EF233C');
  expect(onChange).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
