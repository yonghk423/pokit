import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MateTutorialGuide } from './MateTutorialGuide';

jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));

it('keeps End and Later available after the guide resizes', async () => {
  const onEnd = jest.fn();
  const onPause = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MateTutorialGuide text="날씨 아이콘을 눌러 오늘의 날씨 정보를 확인해보세요." progress="9/16" end="종료" later="나중에" onEnd={onEnd} onPause={onPause} />);
  });
  const bubble = tree.root.findAll(node => typeof node.props.onLayout === 'function')[0];
  act(() => bubble.props.onLayout({ nativeEvent: { layout: { width: 248, height: 156 } } }));
  const actions = tree.root.findAll(node => typeof node.props.onPress === 'function');
  act(() => actions.find(node => node.props.accessibilityLabel === '종료')!.props.onPress());
  act(() => actions.find(node => node.props.accessibilityLabel === '나중에')!.props.onPress());
  expect(onEnd).toHaveBeenCalledTimes(1);
  expect(onPause).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
