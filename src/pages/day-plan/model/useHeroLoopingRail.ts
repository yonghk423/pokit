import { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';
import { DayPlanTabFocusContext } from './dayPlanTabFocus';
import { wrapHeroRailOffset } from '../lib/heroLoopingRail';

const SPEED = 18;
const RESUME_DELAY = 1800;

/** Imperative native scrolling keeps animation frames out of React rendering. */
export function useHeroLoopingRail(span: number, ready: boolean, direction: 'left' | 'right' = 'right') {
  const focused = useContext(DayPlanTabFocusContext);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const ref = useRef<ScrollView>(null);
  const position = useRef(0);
  const touching = useRef(false);
  const dragging = useRef(false);
  const pausedUntil = useRef(0);

  useEffect(() => {
    let live = true;
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([motion, reader]) => {
      if (live) { setReduced(Boolean(motion)); setScreenReader(Boolean(reader)); }
    }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { live = false; motion.remove(); reader.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    position.current = span;
    ref.current?.scrollTo({ x: span, y: 0, animated: false });
  }, [span, ready]);

  const autoPlaying = ready && focused && active && !reduced && !screenReader;
  useEffect(() => {
    if (!autoPlaying || span <= 0) return;
    let frame: number;
    let previous: number | undefined;
    const tick = (timestamp: number) => {
      const elapsed = previous === undefined ? 0 : Math.min(timestamp - previous, 32);
      previous = timestamp;
      if (!touching.current && !dragging.current && Date.now() >= pausedUntil.current) {
        position.current = wrapHeroRailOffset(position.current + (direction === 'left' ? 1 : -1) * SPEED * elapsed / 1000, span);
        ref.current?.scrollTo({ x: position.current, y: 0, animated: false });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoPlaying, span, direction]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (touching.current || dragging.current || Date.now() < pausedUntil.current) position.current = event.nativeEvent.contentOffset.x;
  };
  const onTouchStart = () => { touching.current = true; };
  const onTouchEnd = () => { touching.current = false; pausedUntil.current = Date.now() + RESUME_DELAY; };
  const onScrollBeginDrag = () => { dragging.current = true; };
  const onScrollEndDrag = () => { dragging.current = false; pausedUntil.current = Date.now() + RESUME_DELAY; };
  return { ref, onScroll, onTouchStart, onTouchEnd, onScrollBeginDrag, onScrollEndDrag, autoPlaying };
}
