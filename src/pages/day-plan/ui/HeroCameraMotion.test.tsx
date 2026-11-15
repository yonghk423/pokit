jest.mock('@features/subscriptions', () => ({ useSubscriptionStore: jest.fn(), selectCanTestProStoreItems: () => false }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { HeroCameraMotion } from './HeroCameraMotion';

afterEach(() => jest.restoreAllMocks());
it('plays one camera response on activation and stops the animation on unmount', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const stop = jest.spyOn(Animated.Value.prototype, 'stopAnimation');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCameraMotion active={false}><View /></HeroCameraMotion>); });
  expect(timing).not.toHaveBeenCalled();
  act(() => tree.update(<HeroCameraMotion active><View /></HeroCameraMotion>));
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 680, toValue: 1, useNativeDriver: true }));
  act(() => tree.update(<HeroCameraMotion active={false}><View /></HeroCameraMotion>));
  expect(stop).not.toHaveBeenCalled();
  act(() => tree.unmount());
  expect(stop).toHaveBeenCalled();
});
it('honors the device reduce-motion setting', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCameraMotion active={false}><View /></HeroCameraMotion>); });
  act(() => tree.update(<HeroCameraMotion active><View /></HeroCameraMotion>));
  expect(timing).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('gives all 14 camera designs distinct motifs and motion timing', async () => {
  const { cameraMotionProfiles } = require('../model/heroCameraMotionProfiles');
  const { proDiaryCatalog } = require('../model/proDiaryCatalog');
  const { HERO_CAMERA_STORE_ITEMS } = require('../model/heroCameraStyle');
  const ids = [...HERO_CAMERA_STORE_ITEMS.map((item: { id: string }) => item.id), ...proDiaryCatalog.filter((item: { category: string }) => item.category === 'camera').map((item: { id: string }) => item.id)];
  expect(Object.keys(cameraMotionProfiles).sort()).toEqual(ids.sort());
  expect(new Set(Object.values(cameraMotionProfiles).map(profile => (profile as { path: string }).path)).size).toBe(14);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  for (const id of ids) {
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<HeroCameraMotion active={false} cameraId={id}><View /></HeroCameraMotion>); });
    expect(tree.root.findAllByProps({ testID: 'camera-motif-' + id }).length).toBeGreaterThan(0);
    act(() => tree.update(<HeroCameraMotion active cameraId={id}><View /></HeroCameraMotion>));
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: cameraMotionProfiles[id].duration }));
    act(() => tree.unmount());
  }
});
