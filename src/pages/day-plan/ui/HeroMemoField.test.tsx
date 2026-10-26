import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { ComicMemoField } from './HeroMemoField';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
let mockAppScale = 1;
jest.mock('react-native', () => { const native = jest.requireActual('react-native'); Object.defineProperty(native, 'useWindowDimensions', { configurable: true, value: () => ({ width: 390, height: 844, scale: 3, fontScale: 1.2 }) }); return native; });
jest.mock('@shared/lib/ui-font', () => ({ useAppFontSizeScale: () => mockAppScale, scaleTypeSize: (value: number, scale: number) => Math.round(value * scale * 10) / 10 }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
it.each([0.88, 1, 1.36])('keeps every rule aligned with scaled text at app size %s and scrolls wrapped lines inside a fixed viewport', appScale => {
  mockAppScale = appScale;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicMemoField value="First\nSecond\nThird" ink="#222" onChangeText={jest.fn()} />); });
  const input = () => tree.root.findByType(ThemedTextInput);
  const rules = () => tree.root.findAllByType(View).filter(node => node.props.testID === 'comic-memo-rule');
  const lineHeight = StyleSheet.flatten(input().props.style).lineHeight;
  expect(lineHeight).toBe(Math.ceil(Math.round(36 * appScale * 10) / 10 * 1.2));
  expect(input().props.typographyScale).toBe(1);
  expect(input().props.allowFontScaling).toBe(false);
  expect(input().props.scrollEnabled).toBe(true);
  // iOS can scroll long fixed-height inputs without reporting a larger content size.
  act(() => { input().props.onScroll({ nativeEvent: { contentOffset: { y: lineHeight * 100 + 13 } } }); });
  expect(rules()).toHaveLength(6);
  const track = tree.root.findAllByProps({ testID: 'comic-memo-rules' })[0];
  expect(StyleSheet.flatten(track.props.style).transform).toEqual([{ translateY: -13 }]);
  expect(rules().every(rule => StyleSheet.flatten(rule.props.style).height === lineHeight)).toBe(true);
  expect(StyleSheet.flatten(input().props.style).height).toBe(lineHeight * 5);
  act(() => { tree.unmount(); });
});
