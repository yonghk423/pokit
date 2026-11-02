import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroAiVideoGuide } from './HeroAiVideoGuide';

const mockPlayers: any[] = [];
let mockInitialStatus = 'readyToPlay';
jest.mock('./HeroPhotoSource', () => ({ HeroPhotoIcon: () => null }));
jest.mock('./HeroAiVisualGuide', () => ({ visualGuideWords: () => ({ modes: ['이야기로 그리기', '사진을 일러스트로'] }) }));
jest.mock('expo-video', () => {
  const React = require('react');
  return {
    VideoView: require('react-native').View,
    useVideoPlayer: (source: number, setup: (player: any) => void) => React.useMemo(() => {
      const listeners = new Map();
      const player = {
        status: mockInitialStatus, play: jest.fn(), pause: jest.fn(), replay: jest.fn(),
        replaceAsync: jest.fn(async () => undefined),
        addListener: (name: string, callback: Function) => { listeners.set(name, callback); return { remove: () => listeners.delete(name) }; },
        emit: (name: string, event: any) => { if (name === 'statusChange') player.status = event.status; listeners.get(name)?.(event); },
      };
      setup(player); mockPlayers.push(player); return player;
    }, [source]),
  };
});
beforeEach(() => { mockPlayers.length = 0; mockInitialStatus = 'readyToPlay'; });

it('automatically starts a prepared video on opening and shows feedback', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  const button = () => tree.root.findAllByProps({ testID: 'hero-help-video-play' })[0];
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  expect(button().props.accessibilityState.busy).toBe(true);
  act(() => mockPlayers[0].emit('playingChange', { isPlaying: true }));
  expect(button().props.accessibilityLabel).toBe('일시 정지');
  expect(button().props.accessibilityState.busy).toBe(false);
  act(() => tree.unmount());
});

it('automatically plays when initial loading finishes', () => {
  mockInitialStatus = 'loading';
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  expect(mockPlayers[0].play).not.toHaveBeenCalled();
  act(() => mockPlayers[0].emit('statusChange', { status: 'readyToPlay' }));
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('allows cancelling a queued play request without starting it later', () => {
  mockInitialStatus = 'loading';
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  const tap = () => tree.root.findAllByProps({ testID: 'hero-help-video-play' })[0].props.onPress();
  act(tap);
  act(() => mockPlayers[0].emit('statusChange', { status: 'readyToPlay' }));
  expect(mockPlayers[0].play).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('restarts a finished video when play is pressed again', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  act(() => mockPlayers[0].emit('playToEnd', {}));
  act(() => tree.root.findAllByProps({ testID: 'hero-help-video-play' })[0].props.onPress());
  expect(mockPlayers[0].replay).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('resumes in one tap after pausing through the native video controls', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  const tap = () => tree.root.findAllByProps({ testID: 'hero-help-video-play' })[0].props.onPress();
  act(() => mockPlayers[0].emit('playingChange', { isPlaying: true }));
  act(() => mockPlayers[0].emit('playingChange', { isPlaying: false }));
  act(tap);
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});

it('dismisses the separate instruction overlay and keeps it closed through the ending and replay', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-help-dismiss-tip' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' })).toHaveLength(0);
  act(() => mockPlayers[0].emit('timeUpdate', { currentTime: 5 }));
  act(() => mockPlayers[0].emit('timeUpdate', { currentTime: 18 }));
  act(() => mockPlayers[0].emit('playToEnd', {}));
  act(() => tree.root.findAllByProps({ testID: 'hero-help-video-replay' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('keeps the instruction overlay visible during playback until the user dismisses it', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' }).length).toBeGreaterThan(0);
  act(() => mockPlayers[0].emit('timeUpdate', { currentTime: 5 }));
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' }).length).toBeGreaterThan(0);
  act(() => mockPlayers[0].emit('timeUpdate', { currentTime: 18 }));
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('switches modes without remounting the video player or its view', async () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroAiVideoGuide locale="ko" />); });
  const player = mockPlayers[0];
  player.play.mockClear();
  act(() => mockPlayers[0].emit('timeUpdate', { currentTime: 5 }));
  expect(tree.root.findAllByProps({ testID: 'hero-help-tip' }).length).toBeGreaterThan(0);
  await act(async () => {
    tree.root.findAllByProps({ testID: 'hero-help-mode-1' })[0].props.onPress();
    await Promise.resolve(); await Promise.resolve();
  });
  expect(mockPlayers).toHaveLength(1);
  expect(mockPlayers[0]).toBe(player);
  expect(player.replaceAsync).toHaveBeenCalledTimes(1);
  expect(player.play).toHaveBeenCalledTimes(1);
  expect(tree.root.findAll(node => node.props.children?.includes?.('더 소중한 추억으로 남을 거예요.')).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
