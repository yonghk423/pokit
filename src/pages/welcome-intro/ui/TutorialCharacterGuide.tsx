import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { GuideFrame } from '@shared/ui/tutorial-guide-layer';
import { ThemedText } from '@shared/ui/themed-text';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { tutorialGuideLayout } from '../lib/tutorialGuideLayout';
const poses = {
  thinking: require('../../../../assets/tutorial-guide/thinking.webp'),
  coffee: require('../../../../assets/tutorial-guide/neutral-coffee.webp'),
  celebrate: require('../../../../assets/tutorial-guide/celebrate.webp'),
  welcome: require('../../../../assets/tutorial-guide/welcome.webp'),
};
/** A quiet two-beat invitation, followed by a rest. It never intercepts the target's touches. */
export function TutorialCharacterGuide({ frame, text, later, onPause, onContinue, mood = 'coffee', place = 'auto' }: { mood?: 'thinking' | 'welcome' | 'coffee'; frame: GuideFrame; text: string; later: string; onPause: () => void; onContinue?: () => void; place?: 'auto' | 'above' }) {
  const layout = tutorialGuideLayout(frame.width, frame.height, frame.target, place);
  const pose = mood;
  const [gesture] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let live = true;
    let motion: Animated.CompositeAnimation | undefined;
    const run = (reduce: boolean) => {
      motion?.stop(); gesture.setValue(0);
      if (!live || reduce) return;
      const beat = () => Animated.sequence([
        Animated.timing(gesture, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(gesture, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]);
      motion = Animated.loop(Animated.sequence([beat(), beat(), Animated.delay(2200)]));
      motion.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(run, () => run(false));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', run);
    return () => { live = false; motion?.stop(); subscription.remove(); };
  }, [gesture, pose]);
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const w = bubbleSize.width, h = bubbleSize.height;
  const characterWidth = place === 'above' ? 150 : layout.compact ? 94 : 136;
  const tailTip = place === 'above' ? { x: w + 36, y: 34 } : null;
  const bubblePath = tailTip
    ? `M ${w*.5} 2 C ${w*.82} 0 ${w-2} 10 ${w-2} ${h*.4} C ${w+2} ${tailTip.y-12} ${tailTip.x-8} ${tailTip.y-6} ${tailTip.x} ${tailTip.y} C ${tailTip.x-14} ${tailTip.y+14} ${w-4} ${h*.66} ${w-6} ${h*.74} C ${w*.55} ${h+2} 8 ${h-2} 3 ${h*.52} C 0 14 ${w*.16} 0 ${w*.5} 2 Z`
    : layout.compact
    ? `M ${w*.5} 2 C ${w*.82} 0 ${w-2} 12 ${w-2} ${h*.48} C ${w+3} ${h*.58} ${w+13} ${h*.66} ${w+18} ${h*.7} C ${w+8} ${h*.73} ${w+2} ${h*.71} ${w-4} ${h*.7} C ${w-10} ${h+7} 3 ${h+5} 2 ${h*.52} C 0 14 ${w*.14} 0 ${w*.5} 2 Z`
    : `M ${w*.5} 2 C ${w*.8} 0 ${w-2} 10 ${w-2} ${h*.47} C ${w+1} ${h*.76} ${w*.93} ${h-5} ${w*.8} ${h-5} C ${w*.78} ${h+6} ${w*.73} ${h+16} ${w*.69} ${h+20} C ${w*.72} ${h+9} ${w*.73} ${h+2} ${w*.72} ${h-3} C ${w*.4} ${h+7} 4 ${h-2} 2 ${h*.53} C 0 ${h*.2} ${w*.15} 0 ${w*.5} 2 Z`;
  return <View pointerEvents="box-none" style={[s.root, { left: layout.x, top: layout.y, width: layout.width, height: layout.height }]} testID="tutorial-character-guide">
    <Pressable accessibilityRole={onContinue ? 'button' : undefined} accessibilityLabel={onContinue ? text : undefined} pointerEvents={onContinue ? 'auto' : 'none'} onPress={onContinue ? () => { tapHaptic(); onContinue(); } : undefined} onLayout={event => { const { width, height } = event.nativeEvent.layout; setBubbleSize(prior => prior.width === width && prior.height === height ? prior : { width, height }); }} style={[s.bubble, (layout.compact || place === 'above') && { width: layout.width - (place === 'above' ? 132 : 92), alignSelf: 'flex-start' }]}>
      {w > 0 && h > 0 ? <Svg width={(tailTip?.x ?? w) + 12} height={h + 24} style={{ position: 'absolute', left: 0, top: 0 }} accessible={false}><Path d={bubblePath} fill="#FCFAF3" fillOpacity={0.65} stroke="#424D56" strokeWidth={1.15} strokeLinejoin="round" /></Svg> : null}
      <Text accessibilityLiveRegion="polite" style={s.words}>{text}</Text>
    </Pressable>
    <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: place === 'above' ? 0 : undefined, bottom: place === 'above' ? undefined : 0, width: characterWidth, height: characterWidth*1.34 }}>
        <Animated.View style={{ flex: 1, transform: [{ rotate: gesture.interpolate({ inputRange: [0, 1], outputRange: ['0deg', pose === 'thinking' ? '0.7deg' : '0.4deg'] }) }, { translateY: gesture.interpolate({ inputRange: [0, 1], outputRange: [0, pose === 'coffee' ? -1 : -3] }) }] }}>
        <Image source={poses[pose]} style={s.image} resizeMode="contain" accessible={false} />
      </Animated.View>
    </View>
    <Pressable accessibilityRole="button" hitSlop={6} onPress={() => { tapHaptic(); onPause(); }} style={s.pause}><ThemedText style={s.pauseText}>{later}</ThemedText></Pressable>
  </View>;
}
const s = StyleSheet.create({
  root: { position: 'absolute' },
  bubble: { alignSelf: 'stretch', paddingHorizontal: 24, paddingVertical: 22, marginBottom: 10, minHeight: 92 },
  words: { textAlign: 'center', color: '#000000', fontFamily: 'OwnglyphCorncorn_400Regular', fontSize: 16, lineHeight: 23 },
  tail: { position: 'absolute', right: 56, bottom: -17 },
  image: { width: '100%', height: '100%' },
  pause: { position: 'absolute', left: 12, top: -34, paddingHorizontal: 8, paddingVertical: 5, minHeight: 32, justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(252,250,243,0.65)' },
  pauseText: { color: '#697970', fontSize: 12, lineHeight: 18 },
});
