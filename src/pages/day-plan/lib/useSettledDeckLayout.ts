import { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';

export type DeckSize = { width: number; height: number };

/** Preserve the last painted geometry until native tab attachment finishes laying out. */
export function useSettledDeckLayout(initial: DeckSize, remember: (size: DeckSize) => void) {
  const focused = useContext(DayPlanTabFocusContext);
  const [size, setSize] = useState(initial);
  const pending = useRef(initial);
  const firstFrame = useRef<number | null>(null);
  const secondFrame = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (firstFrame.current !== null) cancelAnimationFrame(firstFrame.current);
    if (secondFrame.current !== null) cancelAnimationFrame(secondFrame.current);
    firstFrame.current = null; secondFrame.current = null;
  }, []);
  const updateSize = useCallback((width: number, height: number) => {
    if (!focused || width <= 0 || height <= 0) return;
    pending.current = { width, height };
    cancel();
    firstFrame.current = requestAnimationFrame(() => {
      firstFrame.current = null;
      secondFrame.current = requestAnimationFrame(() => {
        secondFrame.current = null;
        const next = pending.current;
        remember(next);
        setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
      });
    });
  }, [focused, cancel, remember]);
  useLayoutEffect(() => {
    if (focused) updateSize(pending.current.width, pending.current.height);
    return cancel;
  }, [focused, updateSize, cancel]);
  return { size, updateSize, focused };
}
