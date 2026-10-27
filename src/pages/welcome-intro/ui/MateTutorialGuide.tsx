import { useEffect, useId, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { setTutorialHole } from '@shared/ui/tutorial-guide-layer';

export const MATE_GUIDE_HEIGHT = 156;
/** Touch-through guide artwork. The layer positions it without changing service layout. */
export function MateTutorialGuide({ text, progress, later, onPause, end, onEnd, thinking = false, compact = false }: {
  text: string; progress: string; later: string; onPause: () => void; end?: string; onEnd?: () => void; thinking?: boolean; compact?: boolean;
}) {
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const [keyboard, setKeyboard] = useState(false);
  const [breath] = useState(() => new Animated.Value(0));
  const row = useRef<View>(null);
  const holeId = useId();
  useEffect(() => {
    let live = true;
    const measure = () => {
      const node = row.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (!live) return;
        setTutorialHole(holeId, width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    };
    measure();
    const timer = setInterval(measure, 250);
    return () => { live = false; clearInterval(timer); setTutorialHole(holeId, null); };
  }, [holeId]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  useEffect(() => {
    let live = true;
    let motion: Animated.CompositeAnimation | undefined;
    const start = (reduce: boolean) => {
      motion?.stop(); breath.setValue(0);
      if (!live || reduce) return;
      const move = (toValue: number, duration: number) => Animated.timing(breath, { toValue, duration, useNativeDriver: true });
      motion = Animated.loop(Animated.sequence([move(1, 900), move(0, 900), Animated.delay(1800)]));
      motion.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(start, () => start(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', start);
    return () => { live = false; motion?.stop(); subscription.remove(); };
  }, [breath]);
  return <View ref={row} collapsable={false} pointerEvents="box-none" testID="mate-tutorial-guide" style={[s.row, (keyboard || compact) && s.compact, compact && { minHeight: 112 }]}>
    <View collapsable={false} pointerEvents="auto" style={[s.bubble, (keyboard || compact) && { paddingTop: 10, paddingBottom: 8, paddingLeft: 20, paddingRight: 26 }]} onLayout={event => { const { width, height } = event.nativeEvent.layout; setBubbleSize(prior => prior.width === width && prior.height === height ? prior : { width, height }); }}>
      <Svg pointerEvents="none" width={bubbleSize.width} height={bubbleSize.height} viewBox="0 0 260 140" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={false}>
        <Path d="M128 3 C191 1 235 17 238 61 C240 74 247 82 256 87 C246 90 241 87 236 85 C228 125 186 137 126 136 C58 137 4 120 3 71 C1 25 53 3 128 3 Z" fill="#FCFAF3" fillOpacity={0.65} stroke="#292C2A" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text pointerEvents="none" accessibilityLiveRegion="polite" style={[s.words, (keyboard || compact) && { fontSize: 14, lineHeight: 20 }]}>{text}</Text>
      <View collapsable={false} style={s.footer}>
        <Text pointerEvents="none" accessibilityLabel={progress} style={s.meta}>{progress}</Text>
        <View collapsable={false} style={s.actions}>
          {end && onEnd ? <Pressable accessibilityRole="button" accessibilityLabel={end} onPress={() => { tapHaptic(); onEnd(); }} hitSlop={4} style={s.later}><Text style={s.meta}>{end}</Text></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={later} onPress={() => { tapHaptic(); onPause(); }} hitSlop={4} style={s.later}><Text style={s.meta}>{later}</Text></Pressable>
        </View>
      </View>
    </View>
    <Animated.View pointerEvents="none" style={[s.character, (keyboard || compact) && { width: 60, height: 96 }, { transform: [{ translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) }] }]}>
      <Image source={thinking ? require('../../../../assets/tutorial-guide/thinking.webp') : require('../../../../assets/tutorial-guide/neutral-coffee.webp')} resizeMode="contain" style={s.image} accessible={false} />
    </Animated.View>
  </View>;
}
const s = StyleSheet.create({
  // Long translations must grow the native hit-test bounds along with the bubble.
  row: { minHeight: MATE_GUIDE_HEIGHT, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', flexShrink: 0 },
  compact: { minHeight: 140 },
  bubble: { flex: 1, alignSelf: 'stretch', paddingLeft: 28, paddingRight: 36, paddingTop: 22, paddingBottom: 16, justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 8, flexShrink: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  later: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  meta: { fontFamily: 'OwnglyphCorncorn_400Regular', fontSize: 12, lineHeight: 18, color: '#575F59' },
  words: { fontFamily: 'OwnglyphCorncorn_400Regular', fontSize: 16, lineHeight: 23, color: '#292C2A', textAlign: 'center', paddingBottom: 2 },
  character: { width: 88, height: MATE_GUIDE_HEIGHT - 16, marginLeft: -6 },
  image: { width: '100%', height: '100%' },
});
