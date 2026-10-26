import { useEffect, useState, type ReactNode } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';

import { DAY_PLAN_DECK_TOP, DAY_PLAN_MATE_CARD_TOP } from '../lib/dayPlanDeckMetrics';

type Props = {
  children: ReactNode;
  kind: 'mate' | 'hero';
  backgroundColor: string;
  isDark: boolean;
};

/** Keep the real tree mounted so it can measure and load beneath the placeholder. */
export function InitialDeckSurface({ children, kind, backgroundColor, isDark }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || size.width <= 0 || size.height <= 0) return;
    let cancelled = false;
    let frame = 0;
    let nextFrame = 0;
    // Insets can arrive after the first layout. Restart this quiet period whenever
    // dimensions change, then wait for navigation and two committed frames.
    const timer = setTimeout(() => {
      task = InteractionManager.runAfterInteractions(() => {
        frame = requestAnimationFrame(() => {
          nextFrame = requestAnimationFrame(() => {
            if (!cancelled) setReady(true);
          });
        });
      });
    }, 120);
    let task: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
    };
  }, [ready, size.width, size.height]);

  const width = Math.max(1, Math.min(size.width - 84, kind === 'mate' ? 300 : size.width));
  const top = kind === 'mate' ? DAY_PLAN_MATE_CARD_TOP : DAY_PLAN_DECK_TOP;
  const height = Math.max(1, Math.min(kind === 'mate' ? width * 1.38 : width * 1.7, size.height - top - 96));
  const fill = isDark ? '#424641' : '#E5E3DF';

  return (
    <View style={styles.root} onLayout={({ nativeEvent: { layout } }) => {
      if (!ready) setSize(previous => previous.width === layout.width && previous.height === layout.height
        ? previous : { width: layout.width, height: layout.height });
    }}>
      <View style={[styles.root, !ready && styles.hidden]} pointerEvents={ready ? 'auto' : 'none'}
        accessibilityElementsHidden={!ready} importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}>
        {children}
      </View>
      {!ready && <View testID="initial-deck-skeleton" pointerEvents="none" accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, { backgroundColor }]}>
        {size.width > 0 && <View style={[styles.card, { width, height, top, alignSelf: 'center', backgroundColor: isDark ? '#30352F' : '#F1F0ED' }]}>
          <View style={{ height: kind === 'hero' ? height * 0.65 : 48, width: kind === 'hero' ? '100%' : 48, borderRadius: 6, backgroundColor: fill }} />
          <View style={[styles.line, { width: '56%', backgroundColor: fill }]} />
          <View style={[styles.line, { width: '86%', height: 10, backgroundColor: fill }]} />
          <View style={[styles.line, { width: '72%', height: 10, backgroundColor: fill }]} />
        </View>}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  hidden: { opacity: 0 },
  card: { borderRadius: 12, padding: 22, overflow: 'hidden' },
  line: { height: 18, borderRadius: 5, marginTop: 22 },
});
