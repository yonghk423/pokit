import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { View } from 'react-native';
import { CardToolsFab } from './CardToolsFab';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  const mocked = Object.create(actual);
  Object.defineProperty(mocked, 'Pressable', { value: React.forwardRef(function MockPressable(props: object, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ measureInWindow: (callback: (x: number, y: number) => void) => callback(200, 700) }));
    return React.createElement(actual.View, props);
  }) });
  return mocked;
});

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('../../welcome-intro/ui/ServiceTutorialTarget', () => ({ ServiceTutorialTarget: ({ children }: { children: unknown }) => children }));
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('opens docked film tools above the measured button and invokes the chosen action', () => {
  const action = jest.fn();
  const bag = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CardToolsFab docked concept="film" isDark={false} overview={false} testID="film" actions={[{ key: 'layout', testID: 'layout', label: 'Layout', onPress: action, icon: <View /> }]} belowAction={{ key: 'bag', testID: 'bag', label: 'Bag', onPress: bag, icon: <View /> }} />, { createNodeMock: () => ({ measureInWindow: (callback: (x: number, y: number) => void) => callback(200, 700) }) }); });
  const trigger = () => tree.root.findAllByProps({ testID: 'film' }).find(node => typeof node.props.onPress === 'function')!;
  act(() => trigger().props.onPress());
  const menu = tree.root.findAllByProps({ testID: 'comic-tools-vertical-menu' })[0];
  expect(menu.props.style).toMatchObject({ left: 200, top: 594 });
  expect(tree.root.findAllByProps({ testID: 'bag' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'layout' })[0].props.onPress());
  expect(action).toHaveBeenCalledTimes(1);
  expect(bag).not.toHaveBeenCalled();
  expect(trigger().props.accessibilityState.expanded).toBe(false);
  act(() => { jest.runAllTimers(); });
  expect(tree.root.findAllByProps({ testID: 'comic-tools-vertical-menu' })).toHaveLength(0);
  act(() => tree.unmount());
});
