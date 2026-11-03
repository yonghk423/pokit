import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, Text, View } from 'react-native';
import { HeroCardToolsOutlet, HeroCardToolsPortal, HeroCardToolsProvider } from './heroCardToolsPortal';

it('publishes fresh tools without rerendering the publishing board in a loop', () => {
  let renders = 0;
  function Board() {
    renders += 1;
    if (renders > 10) throw new Error('Tools caused a render loop');
    const [layout, setLayout] = useState('cards');
    return <View>
      <Pressable testID="layout" onPress={() => setLayout('grid')} />
      <HeroCardToolsPortal><Text testID="tools">{layout}</Text></HeroCardToolsPortal>
      <HeroCardToolsOutlet />
    </View>;
  }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardToolsProvider><Board /></HeroCardToolsProvider>); });
  expect(renders).toBe(1);
  expect(tree.root.findAllByProps({ testID: 'tools' })[0].props.children).toBe('cards');
  act(() => tree.root.findAllByProps({ testID: 'layout' })[0].props.onPress());
  expect(renders).toBe(2);
  expect(tree.root.findAllByProps({ testID: 'tools' })[0].props.children).toBe('grid');
  act(() => tree.unmount());
});
