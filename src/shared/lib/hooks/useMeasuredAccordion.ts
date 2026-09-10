import { useCallback, useEffect, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const OPEN_MS = 280;
const CLOSE_MS = 220;
const EASE = Easing.out(Easing.cubic);

/**
 * 높이 측정 기반 아코디언 — expand/collapse 시 opacity + height를 부드럽게.
 * (스케일 바운스 없음)
 */
export function useMeasuredAccordion(expanded: boolean) {
  const progress = useSharedValue(expanded ? 1 : 0);
  const contentHeight = useSharedValue(0);
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      if (contentHeight.value > 0) {
        progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE });
      }
      return;
    }
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: EASE }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [contentHeight, expanded, progress]);

  const panelStyle = useAnimatedStyle(() => {
    if (contentHeight.value <= 0) {
      return {
        opacity: expanded ? 1 : 0,
        overflow: 'hidden' as const,
        transform: [{ translateY: 0 }],
      };
    }
    return {
      opacity: progress.value,
      height: progress.value * contentHeight.value,
      overflow: 'hidden' as const,
      transform: [{ translateY: (1 - progress.value) * -6 }],
    };
  });

  const onContentLayout = useCallback(
    (height: number) => {
      if (height <= 0 || Math.abs(height - contentHeight.value) <= 0.5) return;
      const wasUnmeasured = contentHeight.value <= 0;
      contentHeight.value = height;
      if (!expanded) return;
      if (wasUnmeasured) {
        progress.value = 0;
        progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE });
        return;
      }
      if (progress.value < 1) {
        progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE });
      }
    },
    [contentHeight, expanded, progress],
  );

  return { mounted, panelStyle, onContentLayout };
}
