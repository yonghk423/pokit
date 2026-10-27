import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, InteractionManager, Modal, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@shared/lib/i18n';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import type { ServiceMode } from '../model/serviceTutorial';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function PenCheckMark({ size, animate }: { size: number; animate: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let live = true;
    let motion: Animated.CompositeAnimation | undefined;
    if (!animate) { progress.setValue(0); return; }
    const start = (reduce: boolean) => {
      if (!live) return;
      progress.setValue(reduce ? 1 : 0);
      if (reduce) return;
      motion = Animated.sequence([
        Animated.timing(progress, { toValue: 0.46, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(progress, { toValue: 1, duration: 390, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]);
      motion.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(start, () => start(false));
    return () => { live = false; motion?.stop(); };
  }, [animate, progress]);
  const ringOffset = progress.interpolate({ inputRange: [0, 0.46, 1], outputRange: [176, 0, 0] });
  const checkOffset = progress.interpolate({ inputRange: [0, 0.46, 1], outputRange: [44, 44, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.46, 1], outputRange: [0.88, 0.96, 1] });
  return <Animated.View testID="tutorial-completion-pen-check" style={{ width: size, height: size, transform: [{ scale }] }}>
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <AnimatedCircle cx="32" cy="32" r="27.5" fill="#ECE9E1" stroke="#62645F" strokeWidth="4.2" strokeDasharray="176" strokeDashoffset={ringOffset} />
      <Path d="M10 22 C12 14 18 9 25 7" fill="none" stroke="#A5A198" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M39 57 C47 55 53 50 56 43" fill="none" stroke="#A5A198" strokeWidth="1.3" strokeLinecap="round" />
      <AnimatedPath d="M19 33 C22 35 27 41 29 44 C35 35 42 25 49 19" fill="none" stroke="#202A35" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44" strokeDashoffset={checkOffset as unknown as number} />
    </Svg>
  </Animated.View>;
}

/** Two quiet completion beats over the real service, before introducing the tray tool or finishing. */
export function TutorialCompletion({ mode, completedCount, onComplete }: {
  mode: ServiceMode; completedCount: number; onComplete: () => void;
}) {
  const { locale } = useTranslation();
  const [card] = useState(() => new Animated.Value(0));
  const [bridge] = useState(() => new Animated.Value(0));
  const [message] = useState(() => new Animated.Value(0));
  const ko = locale === 'ko'; const ja = locale === 'ja'; const zh = locale === 'zh-TW';
  const title = mode === 'rhythm'
    ? (ko ? '첫 메이트, 완성했어요!' : ja ? '最初のカードができました！' : zh ? '第一個夥伴完成了！' : 'Your first mate is ready!')
    : (ko ? '첫 장면을 담았어요!' : ja ? '最初の場面を残せました！' : zh ? '留下了第一個場景！' : 'Your first scene is here!');
  const body = mode === 'rhythm'
    ? (ko ? '직접 만들고 열어봤네요. 잘했어요.' : ja ? '自分で作って開けました。よくできました。' : zh ? '你自己做好並打開了。做得好。' : 'You made it and opened it. Well done.')
    : (ko ? '나만의 이야기를 시작했네요. 잘했어요.' : ja ? '自分だけの物語が始まりました。よくできました。' : zh ? '你開始了自己的故事。做得好。' : 'You started your own story. Well done.');
  const [open, setOpen] = useState(false);
  const [presented, setPresented] = useState(false);
  const [closing, setClosing] = useState(false);
  const completed = useRef(false);
  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);
  // iOS drops a Modal presented while the scene sheet is still dismissing, leaving a silent wait.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => { timer = setTimeout(() => setOpen(true), 120); });
    return () => { task.cancel(); if (timer) clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!open || presented || closing) return;
    const fallback = setTimeout(() => setClosing(true), 1200);
    return () => clearTimeout(fallback);
  }, [open, presented, closing]);
  // Unmounting a presented Modal can leave an invisible iOS presenter that swallows every touch,
  // so the next step only starts once the Modal has actually dismissed.
  useEffect(() => {
    if (!closing) return;
    // A presented iOS modal owns native touch routing until onDismiss fires.
    // A timer must never unmount its presenter while dismissal is still running.
    if (presented && Platform.OS === 'ios') return;
    const fallback = setTimeout(complete, presented ? 700 : 0);
    return () => clearTimeout(fallback);
  }, [closing, presented, complete]);
  useEffect(() => {
    if (!presented) return;
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    const run = (reduce: boolean) => {
      if (!live) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      const motion = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, {
        toValue, duration: reduce ? 0 : duration, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
      animation = Animated.sequence([
        motion(card, 1, 320),
        Animated.delay(1200),
        motion(bridge, 1, 450),
        motion(message, 1, 280),
        Animated.delay(1500),
      ]);
      animation.start(({ finished }) => { if (live && finished) setClosing(true); });
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(run, () => run(false));
    return () => { live = false; animation?.stop(); };
  }, [presented, card, bridge, message]);
  return <Modal visible={open && !closing} transparent animationType="fade" statusBarTranslucent onShow={() => setPresented(true)} onDismiss={complete} onRequestClose={() => undefined}>
    <View style={s.overlay} testID="tutorial-completion" accessibilityViewIsModal>
      <Animated.View style={[s.scrim, { opacity: card }]} />
      <Animated.View style={[s.completionCard, {
        opacity: Animated.multiply(card, bridge.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
        transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          { scale: bridge.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }],
      }]}>
        <PaperGrain opacity={0.24} />
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <PenCheckMark size={64} animate={presented} />
        </View>
        <ThemedText accessibilityRole="header" style={s.title}>{title}</ThemedText>
        <ThemedText style={s.body}>{body}</ThemedText>
        <View style={s.rule} />
        <ThemedText style={s.count}>{ko ? '주인공의 하루를 채워가요' : ja ? '主人公の一日をつくりましょう' : 'Make your character’s day your own'}</ThemedText>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[s.bridge, { opacity: bridge }]} testID="tutorial-completion-bridge">
        <PaperGrain opacity={0.3} />
        <Animated.View style={{ alignItems: 'center', gap: 22, opacity: message, transform: [{ translateY: message.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
          <View style={s.illustration}>
            <Image source={require('../../../../assets/tutorial-guide/celebrate.webp')} style={s.image} resizeMode="contain" />
            <View pointerEvents="none" style={s.badge} accessibilityElementsHidden>
              <PenCheckMark size={32} animate={presented} />
            </View>
          </View>
          <ThemedText style={s.bridgeTitle}>{ko ? '좋아요, 하나 해냈어요.' : ja ? 'いいですね、ひとつできました。' : 'You did it. One lovely start.'}</ThemedText>
          <ThemedText style={s.body}>{completedCount < 2
            ? (mode === 'rhythm'
              ? (ko ? '오늘의 주인공도 만나볼까요?' : ja ? '今日の主人公も体験してみませんか？' : 'Shall we meet Today’s Protagonist, too?')
              : (ko ? '이제 주인공 화면의 수납장 도구를 열어볼까요?' : ja ? '主人公画面の収納トレイを開いてみましょう。' : 'Now let’s open the tray tool on your character’s screen.'))
            : (ko ? '이제 나만의 하루를 채워가요.' : ja ? '自分らしい一日をつくりましょう。' : 'Now, make the day your own.')}</ThemedText>
        </Animated.View>
      </Animated.View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(49,48,39,0.16)' },
  completionCard: { width: '86%', maxWidth: 420, borderRadius: 22, overflow: 'hidden', paddingHorizontal: 24, paddingVertical: 30, alignItems: 'center', gap: 15, backgroundColor: '#FBF8F0', borderWidth: 0.6, borderColor: '#DDDCD1' },
  title: { color: '#000000', fontSize: 26, lineHeight: 38, textAlign: 'center', marginTop: 8 },
  body: { color: '#617169', fontSize: 17, lineHeight: 27, textAlign: 'center' },
  count: { color: '#617169', fontSize: 16, lineHeight: 24 },
  rule: { height: 1, alignSelf: 'stretch', backgroundColor: '#DEDFD4', marginTop: 3 },
  bridge: { ...StyleSheet.absoluteFill, backgroundColor: '#F7F4EC', justifyContent: 'center', alignItems: 'center', padding: 24 },
  illustration: { width: 160, height: 210, marginBottom: 20, transform: [{ rotate: '-1deg' }] },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', bottom: 0, right: -5 },
  bridgeTitle: { color: '#000000', fontSize: 29, lineHeight: 42, textAlign: 'center' },
});
