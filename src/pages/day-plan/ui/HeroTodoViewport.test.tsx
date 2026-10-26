import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ComicTodoViewport } from './HeroTodoViewport';

it('keeps five rows visible, measures larger rows and preserves every item inside the scroll area', () => {
  let tree!: ReactTestRenderer;
  const render = (count: number) => <ComicTodoViewport>{Array.from({ length: count }, (_, i) => <View key={`todo-${i}`} testID={`todo-${i}`} />)}</ComicTodoViewport>;
  act(() => { tree = create(render(5)); });
  const list = () => tree.root.findByType(ScrollView);
  expect(list().props.scrollEnabled).toBe(false);
  act(() => { tree.update(render(8)); });
  expect(list().props.scrollEnabled).toBe(true);
  expect(list().props.nestedScrollEnabled).toBe(true);
  const measuredRows = tree.root.findAllByType(View).filter(node => typeof node.props.onLayout === 'function' && !node.props.testID);
  act(() => { measuredRows.slice(0, 5).forEach(row => row.props.onLayout({ nativeEvent: { layout: { height: 64 } } })); });
  expect(StyleSheet.flatten(list().props.style).maxHeight).toBe(320);
  expect(tree.root.findAllByType(View).filter(node => /^todo-/.test(node.props.testID ?? ''))).toHaveLength(8);
  act(() => { tree.update(render(4)); });
  expect(list().props.scrollEnabled).toBe(false);
  expect(StyleSheet.flatten(list().props.style).maxHeight).toBeUndefined();
  act(() => { tree.unmount(); });
});
