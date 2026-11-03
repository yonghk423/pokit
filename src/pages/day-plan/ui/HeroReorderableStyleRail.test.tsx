import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PanResponder, Pressable, StyleSheet, type PanResponderCallbacks } from 'react-native';
import { clearPokitLocalStorage } from '@shared/lib/storage/localStorageClient';
import { readHeroCharacterOrder } from '../lib/heroCharacterOrder';
import { HERO_STYLE_ORDER_KEY, HeroReorderableStyleRail } from './HeroReorderableStyleRail';

beforeEach(async () => { await clearPokitLocalStorage(); });
it('drags a style without selecting it, persists its position and keeps upcoming last', () => {
  const select = jest.fn();
  let handlers!: PanResponderCallbacks;
  const original = PanResponder.create;
  const spy = jest.spyOn(PanResponder, 'create').mockImplementation(config => { handlers = config; return original(config); });
  const render = () => <HeroReorderableStyleRail>{readHeroCharacterOrder().map(id => <Pressable key={id} testID={id} onPress={select} />)}{[<Pressable key="upcoming" testID="upcoming" />]}</HeroReorderableStyleRail>;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render()); });
  const first = tree.root.findAllByProps({ testID: 'protagonist-1' })[0];
  act(() => first.props.onLongPress({ nativeEvent: { pageX: 50 } }));
  act(() => handlers.onPanResponderGrant?.({} as never, {} as never));
  act(() => handlers.onPanResponderMove?.({} as never, { moveX: 174 } as never));
  act(() => handlers.onPanResponderRelease?.({} as never, {} as never));
  act(() => first.props.onPress({}));
  expect(select).not.toHaveBeenCalled();
  expect(readHeroCharacterOrder(HERO_STYLE_ORDER_KEY).slice(0, 3)).toEqual(['protagonist-2', 'protagonist-3', 'protagonist-1']);
  expect(readHeroCharacterOrder()[0]).toBe('protagonist-1');
  act(() => tree.unmount());
  act(() => { tree = create(render()); });
  const children = tree.root.findAllByProps({ testID: 'hero-inline-style-scroll' })[0].props.children.flat();
  expect(children[0].key).toBe('protagonist-2');
  expect(children.at(-1).props.testID).toBe('upcoming');
  const second = tree.root.findAllByProps({ testID: 'protagonist-2' })[0];
  act(() => { second.props.onPressIn(); second.props.onPress({}); });
  expect(select).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  spy.mockRestore();
});

it('keeps card scale fixed across repeated moves and resets transforms after release or cancellation', () => {
  let handlers!: PanResponderCallbacks;
  const spy = jest.spyOn(PanResponder, 'create').mockImplementation(config => { handlers = config; return { panHandlers: {} }; });
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<HeroReorderableStyleRail>{readHeroCharacterOrder().map(id => <Pressable key={id} testID={id} />)}{null}</HeroReorderableStyleRail>); });
    const first = () => tree.root.findAllByProps({ testID: 'protagonist-1' })[0];
    const wrapper = () => tree.root.findAllByProps({ testID: 'hero-inline-style-scroll-item-protagonist-1' })[0];
    for (const cancel of [false, true, false]) {
      act(() => first().props.onLongPress({ nativeEvent: { pageX: 50 } }));
      act(() => handlers.onPanResponderGrant?.({} as never, {} as never));
      act(() => handlers.onPanResponderMove?.({} as never, { moveX: 174 } as never));
      expect(StyleSheet.flatten(wrapper().props.style).transform.at(-1)).toEqual({ scale: 1 });
      act(() => (cancel ? handlers.onPanResponderTerminate : handlers.onPanResponderRelease)?.({} as never, {} as never));
      expect(StyleSheet.flatten(wrapper().props.style).transform).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
    }
  } finally {
    act(() => tree?.unmount());
    spy.mockRestore();
  }
});
