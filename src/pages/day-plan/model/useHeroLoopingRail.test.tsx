import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, AppState } from 'react-native';
import { DayPlanTabFocusContext } from './dayPlanTabFocus';
import { useHeroLoopingRail } from './useHeroLoopingRail';
import { wrapHeroRailOffset } from '../lib/heroLoopingRail';

let result!: ReturnType<typeof useHeroLoopingRail>;
function Probe() { const rail = useHeroLoopingRail(600, true); useEffect(() => { result = rail; }); return null; }
let tick: FrameRequestCallback;
const originalAppState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, writable: true, value: 'active' });
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { tick = callback; return 1; });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});
afterEach(() => { jest.restoreAllMocks(); if (originalAppState) Object.defineProperty(AppState, 'currentState', originalAppState); });
it('wraps either direction to the equivalent middle copy', () => {
  expect(wrapHeroRailOffset(599, 600)).toBe(1199);
  expect(wrapHeroRailOffset(1201, 600)).toBe(601);
  expect(wrapHeroRailOffset(-1, 600)).toBe(1199);
  expect(wrapHeroRailOffset(100, 0)).toBe(0);
});
it('moves right, pauses on touch and resumes from the user position', async () => {
  let now = 10000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Probe />); });
  const scrollTo = jest.fn();
  Object.assign(result.ref, { current: { scrollTo } });
  tick(0); tick(16);
  expect(scrollTo.mock.calls.at(-1)?.[0].x).toBeCloseTo(1199.712);
  scrollTo.mockClear();
  result.onTouchStart(); tick(32);
  expect(scrollTo).not.toHaveBeenCalled();
  result.onScroll({ nativeEvent: { contentOffset: { x: 700 } } } as Parameters<typeof result.onScroll>[0]);
  result.onTouchEnd(); now += 1000; tick(48);
  expect(scrollTo).not.toHaveBeenCalled();
  now += 900; tick(64);
  expect(scrollTo.mock.calls.at(-1)?.[0].x).toBeCloseTo(699.712);
  act(() => tree.unmount());
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
it('stops off screen and in the background', async () => {
  let tree!: ReactTestRenderer;
  const render = (focused: boolean) => <DayPlanTabFocusContext.Provider value={focused}><Probe /></DayPlanTabFocusContext.Provider>;
  await act(async () => { tree = create(render(true)); });
  expect(result.autoPlaying).toBe(true);
  act(() => tree.update(render(false)));
  expect(result.autoPlaying).toBe(false);
  act(() => tree.update(render(true)));
  const listener = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  act(() => listener('background'));
  expect(result.autoPlaying).toBe(false);
  act(() => listener('active'));
  expect(result.autoPlaying).toBe(true);
  act(() => tree.unmount());
});
it.each(['motion', 'reader'])('respects the %s accessibility preference', async preference => {
  if (preference === 'motion') jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  else jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Probe />); });
  expect(result.autoPlaying).toBe(false);
  act(() => tree.unmount());
});
