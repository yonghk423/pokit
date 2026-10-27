import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, useAnimatedValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { completeHeroCharacterNameHint, isHeroCharacterNameHintPending, subscribeHeroCharacterNameHint } from '@shared/lib/storage/heroCharacterNameHintStorage';
import { ThemedText } from '@shared/ui/themed-text';
import { useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';

/** Content-sized name target; its ink hint never changes the header's layout. */
export function HeroCharacterNameButton({ name, ink, onPress, enabled = true, fontSize = 17, lineHeight = 23 }: {
  name: string; ink: string; onPress: () => void; enabled?: boolean; fontSize?: number; lineHeight?: number;
}) {
  const { t } = useTranslation();
  const pending = useSyncExternalStore(subscribeHeroCharacterNameHint, isHeroCharacterNameHintPending, () => false);
  const tutorialCompleted = useServiceTutorial(state => state.step === 'finish' || state.completed.includes('comic'));
  const showHint = pending && !tutorialCompleted;
  const [width, setWidth] = useState(0);
  const motion = useAnimatedValue(0);
  useEffect(() => {
    if (tutorialCompleted && pending) completeHeroCharacterNameHint();
  }, [tutorialCompleted, pending]);
  useEffect(() => {
    if (!showHint || !enabled) return;
    let live = true;
    let animation: Animated.CompositeAnimation | null = null;
    const update = (reduced: boolean) => {
      if (!live) return;
      animation?.stop();
      motion.setValue(reduced ? 0.5 : 0);
      if (reduced) return;
      animation = Animated.loop(Animated.timing(motion, {
        toValue: 1, duration: 3800, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
      }));
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then(update, () => update(false));
    return () => { live = false; subscription.remove(); animation?.stop(); motion.setValue(0); };
  }, [enabled, showHint, motion]);
  const draw = motion.interpolate({ inputRange: [0.12, 0.43], outputRange: [-width, 0], extrapolate: 'clamp' });
  const counterDraw = motion.interpolate({ inputRange: [0.12, 0.43], outputRange: [width, 0], extrapolate: 'clamp' });
  return <Pressable testID="comic-character-name-button" accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')}
    onPress={() => { completeHeroCharacterNameHint(); tapHaptic(); onPress(); }}
    onLayout={({ nativeEvent: { layout } }) => setWidth(previous => previous === layout.width ? previous : layout.width)} style={s.button}>
    <ThemedText numberOfLines={1} style={{ color: ink, fontSize, lineHeight }}>{name}</ThemedText>
    {showHint && width > 0 ? <View testID="comic-character-name-underline" pointerEvents="none" accessible={false} style={[s.line, { width }]}>
      <Animated.View style={{ width, height: 8, overflow: 'hidden',
        opacity: motion.interpolate({ inputRange: [0, 0.12, 0.16, 0.43, 0.79, 0.95, 1], outputRange: [0, 0, 1, 1, 1, 0, 0] }),
        transform: [{ translateX: draw }],
      }}>
        <Animated.View style={{ width, height: 8, transform: [{ translateX: counterDraw }] }}>
          <Svg width={width} height={8} viewBox={`0 0 ${width} 8`} accessible={false}>
            <Path d={`M1 4.25C${width * 0.3} 4.02 ${width * 0.65} 3.96 ${width - 1} 4.12Q${width - 0.25} 4.33 ${width - 1} 4.62C${width * 0.65} 4.55 ${width * 0.3} 4.65 1 4.9Q0.2 4.63 1 4.25Z`} fill={ink} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View> : null}
  </Pressable>;
}
const s = StyleSheet.create({
  button: { flexShrink: 1, maxWidth: '100%', justifyContent: 'center' },
  line: { position: 'absolute', left: 0, bottom: -6, height: 8, overflow: 'hidden' },
});
