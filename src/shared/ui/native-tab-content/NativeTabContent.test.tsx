import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext } from 'react';
import { Platform, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaView } from 'react-native-screens/experimental';

import { NativeTabContent } from './NativeTabContent';

jest.mock('expo-router/js-tabs', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');
  return { BottomTabBarHeightContext: createContext<number | undefined>(undefined) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('react-native-screens/experimental', () => ({
  SafeAreaView: 'NativeSafeAreaView',
}));

function EditorProbe() {
  const height = useContext(BottomTabBarHeightContext);
  return <Text>{String(height)}</Text>;
}

const layout = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } });
let renderer: ReactTestRenderer;
const originalOS = Platform.OS;

afterEach(() => {
  act(() => renderer?.unmount());
  Object.defineProperty(Platform, 'OS', { value: originalOS });
});

it('provides the native bottom inset to editors and follows changes in tab height', () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  act(() => { renderer = create(<NativeTabContent><EditorProbe /></NativeTabContent>); });
  expect(renderer.root.findByType(SafeAreaView).props.edges).toEqual({ bottom: true });
  act(() => {
    renderer.root.findByType(SafeAreaView).props.onLayout(layout(844));
    renderer.root.findAllByType(View).find((node) => node.props.onLayout)?.props.onLayout(layout(748));
  });
  expect(renderer.root.findByType(Text).props.children).toBe('96');
  act(() => {
    renderer.root.findAllByType(View).find((node) => node.props.onLayout)?.props.onLayout(layout(761));
  });
  expect(renderer.root.findByType(Text).props.children).toBe('83');
});

it('leaves the existing JavaScript tab height provider intact on Android', () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  act(() => {
    renderer = create(
      <BottomTabBarHeightContext.Provider value={110}>
        <NativeTabContent><EditorProbe /></NativeTabContent>
      </BottomTabBarHeightContext.Provider>,
    );
  });
  expect(renderer.root.findAllByType(SafeAreaView)).toHaveLength(0);
  expect(renderer.root.findByType(Text).props.children).toBe('110');
});
