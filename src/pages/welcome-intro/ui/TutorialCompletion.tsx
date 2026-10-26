import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, InteractionManager, Modal, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import type { ServiceMode } from '../model/serviceTutorial';

/** Two quiet completion beats over the real service, before introducing the tray tool or finishing. */
export function TutorialCompletion({ mode, completedCount, onComplete }: {
  mode: ServiceMode; completedCount: number; onComplete: () => void;
}) {
  const { locale } = useTranslation();
  const [card] = useState(() => new Animated.Value(0));
  const [bridge] = useState(() => new Animated.Value(0));
  const [message] = useState(() => new Animated.Value(0));
  const ko = locale === 'ko'; const ja = locale === 'ja';
  const title = mode === 'rhythm'
    ? (ko ? '첫 메이트, 완성했어요!' : ja ? '最初のカードができました！' : 'Your first mate is ready!')
    : (ko ? '첫 장면을 담았어요!' : ja ? '最初の場面を残せました！' : 'Your first scene is here!');
  const body = mode === 'rhythm'
    ? (ko ? '직접 만들고 열어봤네요. 잘했어요.' : ja ? '自分で作って開けました。よくできました。' : 'You made it and opened it. Well done.')
    : (ko ? '나만의 이야기를 시작했네요. 잘했어요.' : ja ? '自分だけの物語が始まりました。よくできました。' : 'You started your own story. Well done.');
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
          <CompletionRadioButton checked isDark={false} appearance="ink" size={64} accessibilityLabel="" onPress={() => undefined} />
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
              <CompletionRadioButton checked isDark={false} appearance="ink" size={32} accessibilityLabel="" onPress={() => undefined} />
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
