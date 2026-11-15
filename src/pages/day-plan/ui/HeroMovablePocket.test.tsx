import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { HeroMovablePocket } from './HeroMovablePocket';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: () => ({ source: { uri: 'file:///pocket.webp' } }) }));
jest.mock('./DiaryItemImage', () => ({ DiaryItemImage: () => null }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(() => null), setJson: jest.fn() } }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
  Gesture: { Pan: () => {
    const gesture: Record<string, unknown> = {};
    for (const name of ['enabled', 'activateAfterLongPress', 'minDistance', 'runOnJS', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) {
      gesture[name] = (value: unknown) => { gesture[name + 'Value'] = value; return gesture; };
    }
    return gesture;
  } },
}));

it('saves a long-press drag within the canvas and restores its position after remounting', () => {
  let tree!: ReactTestRenderer;
  const mount = () => {
    act(() => { tree = create(<HeroMovablePocket defaultTop={120} ko />); });
    act(() => tree.root.findAllByType(View).find(node => node.props.onLayout)!.props.onLayout({ nativeEvent: { layout: { width: 320, height: 500 } } }));
  };
  mount();
  const gesture = tree.root.findByType(GestureDetector).props.gesture;
  expect(gesture.activateAfterLongPressValue).toBe(350);
  act(() => {
    gesture.onStartValue();
    gesture.onUpdateValue({ translationX: 900, translationY: 900 });
    gesture.onEndValue({ translationX: 900, translationY: 900 }, true);
  });
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:diary-pocket-position', { x: 1, y: 1 });
  act(() => tree.unmount());
  jest.mocked(localStorageClient.getJson).mockReturnValue({ x: 1, y: 1 });
  mount();
  const restored = tree.root.findByProps({ testID: 'hero-movable-pocket' }).props.style.transform;
  expect(JSON.parse(JSON.stringify(restored))).toEqual([{ translateX: 276 }, { translateY: 456 }]);
  act(() => tree.unmount());
});
