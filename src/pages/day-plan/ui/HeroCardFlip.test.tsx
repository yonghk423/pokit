import { createRef } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, Keyboard, Modal, StyleSheet, Text } from 'react-native';
import { HeroCardFlip, type HeroCardFlipHandle, type HeroCardOpen } from './HeroCardFlip';

jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 20, left: 0, right: 0 }) }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('keeps details inactive until the front finishes rotating, and closes only after the reverse turn', () => {
  const callbacks: ((result: { finished: boolean }) => void)[] = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => { if (callback) callbacks.push(callback); }, stop: jest.fn(), reset: jest.fn(),
  }));
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  const onClosed = jest.fn();
  const onFrontReady = jest.fn();
  const onRestoreFront = jest.fn();
  const readCurrent = jest.fn((complete: (card: HeroCardOpen | null) => void) => complete({
    frame: { left: 12, top: 160, width: 300, height: 400 }, front: <Text>Edited card</Text>,
  }));
  const ref = createRef<HeroCardFlipHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardFlip ref={ref} paper="#FEFEFE" closeLabel="Close" onClosed={onClosed} onFrontReady={onFrontReady} onRestoreFront={onRestoreFront}
    card={{ frame: { left: 12, top: 180, width: 300, height: 360 }, front: <Text>Original card</Text>, readCurrent }}
    fallbackFront={<Text>Fallback</Text>}><Text>Editable back</Text></HeroCardFlip>); });
  const back = () => tree.root.findAllByProps({ testID: 'hero-card-flip-back' })[0];
  expect(back().props.pointerEvents).toBe('none');
  expect(tree.root.findAllByProps({ testID: 'hero-card-detail-skeleton' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['Original card']);
  act(() => tree.root.findByType(Modal).props.onShow());
  expect(onFrontReady).not.toHaveBeenCalled();
  expect(timing).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(64));
  expect(onFrontReady).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls[0][1]).toMatchObject({ toValue: 1, useNativeDriver: true });
  expect(back().props.accessibilityElementsHidden).toBe(true);
  act(() => callbacks.shift()!({ finished: true }));
  expect(back().props.pointerEvents).toBe('auto');
  expect(tree.root.findAllByProps({ testID: 'hero-card-detail-skeleton' })).toHaveLength(0);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['Original card', 'Editable back']);
  const restingBack = StyleSheet.flatten(back().props.style);
  expect(restingBack.opacity).toBe(1);
  expect(restingBack.transform).toEqual([]);
  expect(restingBack.backfaceVisibility).not.toBe('hidden');
  const paper = StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-card-flip-paper' })[0].props.style);
  expect(paper.transform).toEqual([]);
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-card-flip-front' })[0].props.style).opacity).toBe(0);
  act(() => { ref.current!.close(); ref.current!.close(); });
  act(() => jest.advanceTimersByTime(16));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(readCurrent).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['Edited card', 'Editable back']);
  expect(timing).toHaveBeenCalledTimes(2);
  expect(timing.mock.calls[1][1]).toMatchObject({ toValue: 0, useNativeDriver: true });
  expect(back().props.pointerEvents).toBe('none');
  expect(onClosed).not.toHaveBeenCalled();
  act(() => callbacks.shift()!({ finished: true }));
  expect(onRestoreFront).toHaveBeenCalledTimes(1);
  expect(onClosed).not.toHaveBeenCalled();
  act(() => jest.advanceTimersToNextTimer());
  expect(onClosed).not.toHaveBeenCalled();
  act(() => jest.advanceTimersToNextTimer());
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  expect(onClosed).not.toHaveBeenCalled();
  act(() => tree.root.findByType(Modal).props.onDismiss());
  expect(onClosed).toHaveBeenCalledTimes(1);
  act(() => tree.root.findByType(Modal).props.onDismiss());
  expect(onClosed).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  timing.mockRestore(); dismiss.mockRestore();
});

it('does not rotate an enlarged fallback image over the board when a tutorial restores details without a measured card', () => {
  const callbacks: ((result: { finished: boolean }) => void)[] = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => { if (callback) callbacks.push(callback); }, stop: jest.fn(), reset: jest.fn(),
  }));
  const ref = createRef<HeroCardFlipHandle>();
  const onClosed = jest.fn(); const onFrontReady = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardFlip ref={ref} paper="#FFF" closeLabel="Close" onClosed={onClosed} onFrontReady={onFrontReady}
    fallbackFront={<Text>Unmeasured image</Text>}><Text>Details</Text></HeroCardFlip>); });
  act(() => tree.root.findByType(Modal).props.onShow());
  expect(onFrontReady).not.toHaveBeenCalled();
  expect(timing).not.toHaveBeenCalled();
  act(() => ref.current!.close());
  expect(tree.root.findAllByProps({ testID: 'hero-card-flip-front' })).toHaveLength(0);
  expect(timing.mock.calls[0][1]).toMatchObject({ toValue: 0, duration: 180 });
  act(() => callbacks.shift()!({ finished: true }));
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  expect(onClosed).not.toHaveBeenCalled();
  act(() => tree.root.findByType(Modal).props.onDismiss());
  expect(onClosed).toHaveBeenCalledTimes(1);
  act(() => tree.unmount()); timing.mockRestore();
});

it('fades details in and out without rotating or duplicating the measured card', () => {
  const callbacks: ((result: { finished: boolean }) => void)[] = [];
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => { if (callback) callbacks.push(callback); }, stop: jest.fn(), reset: jest.fn(),
  }));
  const ref = createRef<HeroCardFlipHandle>();
  const onClosed = jest.fn(); const readCurrent = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardFlip ref={ref} transition="fade" paper="#FFF" closeLabel="Close" onClosed={onClosed}
    card={{ frame: { left: 40, top: 180, width: 320, height: 500 }, front: <Text>Duplicate artwork</Text>, readCurrent }}
    fallbackFront={<Text>Fallback artwork</Text>}><Text>Details</Text></HeroCardFlip>); });
  act(() => tree.root.findByType(Modal).props.onShow());
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['Details']);
  expect(timing.mock.calls[0][1]).toMatchObject({ toValue: 1, duration: 220, useNativeDriver: true });
  expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: 'hero-card-flip-back' })[0].props.style).transform).toEqual([]);
  act(() => { ref.current!.close(); ref.current!.close(); });
  expect(timing).toHaveBeenCalledTimes(2);
  expect(timing.mock.calls[1][1]).toMatchObject({ toValue: 0, duration: 180, useNativeDriver: true });
  expect(readCurrent).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-card-flip-front' })).toHaveLength(0);
  const paper = tree.root.findAllByProps({ testID: 'hero-card-flip-paper' })[0];
  expect(StyleSheet.flatten(paper.props.style).transform).toEqual([]);
  act(() => callbacks.shift()!({ finished: true }));
  act(() => tree.root.findByType(Modal).props.onDismiss());
  expect(onClosed).toHaveBeenCalledTimes(1);
  act(() => tree.unmount()); timing.mockRestore();
});
