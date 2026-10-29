import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

export function HeroGenerationLoading({ completed, total }: { completed: number; total: number }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const motion = useAnimatedValue(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    let active = true;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(600), Animated.timing(motion, { toValue: 0, duration: 0, useNativeDriver: true }), Animated.delay(300),
    ]));
    const reduced = (value: boolean) => { animation.stop(); motion.setValue(value ? 1 : 0); if (!value && active) animation.start(); };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reduced(value); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced);
    return () => { active = false; clearInterval(timer); animation.stop(); sub.remove(); };
  }, [motion]);
  return <View testID="hero-generation-loading" style={s.root}>
    <View style={s.drawing} accessible={false}>
      <Animated.View style={{ opacity: 0.8, transform: [{ scaleX: motion }], transformOrigin: 'left center' }}><Svg width={156} height={14} viewBox="0 0 156 14"><Path d="M3 8Q44 5 83 7T152 6M5 9L55 8" stroke="#65704F" strokeWidth={1.5} strokeLinecap="round" fill="none" /></Svg></Animated.View>
      <Animated.View style={[s.pen, { transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, 150] }) }] }]}><Svg width={42} height={54} viewBox="0 0 42 54"><Path d="M2 50L9 31 31 3 39 10 17 39Z M2 50L15 34M9 31L17 39M29 6L36 13M12 35L14 37" stroke="#343B32" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="#F1EBDD" /></Svg></Animated.View>
    </View>
    <ThemedText style={s.title}>{t('comicDay.loading.title')}</ThemedText>
    <ThemedText accessibilityLiveRegion="polite" style={s.text}>{t('comicDay.ai.processing', { count: completed, total })}</ThemedText>
    <ThemedText style={s.time}>{t('comicDay.loading.elapsed', { time: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` })}</ThemedText>
    <ThemedText style={s.text}>{t(elapsed >= 90 ? 'comicDay.loading.longer' : 'comicDay.loading.hint')}</ThemedText>
    <ThemedText style={s.text}>{t('comicDay.loading.return')}</ThemedText>
  </View>;
}
const s = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 }, drawing: { width: 196, height: 72, paddingTop: 50, marginBottom: 20 }, pen: { position: 'absolute', top: 5, left: 0 }, title: { color: '#252822', fontSize: 22, lineHeight: 32 }, text: { color: '#73746E', fontSize: 14, lineHeight: 22, textAlign: 'center' }, time: { color: '#343B32', fontSize: 18, lineHeight: 28, fontVariant: ['tabular-nums'] } });
