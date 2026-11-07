import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedTextInput } from '../themed-text-input/ThemedTextInput';

let mockAppFont = 'corncorn';
jest.mock('@shared/lib/ui-font', () => ({
  useEffectiveAppFontId: () => mockAppFont,
  useAppFontSizeScale: () => 1,
  resolveAppFontFamily: (id: string) => `font-${id}`,
  resolveAppFontMinLineHeight: () => 10,
  isSingleFaceAppFont: () => true,
  scaleTypeSize: (value: number) => value,
}));
jest.mock('@shared/lib/hooks/use-theme-color', () => ({ useThemeColor: () => '#202020' }));
it('keeps card font overrides independent while default text follows app settings', () => {
  let tree!: ReactTestRenderer;
  const render = () => <><ThemedText fontId="hiMelody">First</ThemedText><ThemedText fontId="cafe24Syongsyong">Second</ThemedText><ThemedText>Default</ThemedText><ThemedTextInput fontId="hiMelody" value="Memo" /></>;
  act(() => { tree = create(render()); });
  const fonts = () => tree.root.findAllByType(Text).map(node => StyleSheet.flatten(node.props.style).fontFamily);
  expect(fonts()).toEqual(['font-hiMelody', 'font-cafe24Syongsyong', 'font-corncorn']);
  mockAppFont = 'cafe24ShiningStar';
  act(() => tree.update(render()));
  expect(fonts()).toEqual(['font-hiMelody', 'font-cafe24Syongsyong', 'font-cafe24ShiningStar']);
  const input = tree.root.findByType(TextInput);
  expect(StyleSheet.flatten(input.props.style).fontFamily).toBe('font-hiMelody');
  expect(input.props.fontId).toBeUndefined();
  act(() => tree.unmount());
});
