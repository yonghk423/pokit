import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import type { ServiceStep } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';

export type CardToolAction = { key: string; testID: string; label: string; selected?: boolean; tutorialSteps?: ServiceStep[]; onPress: () => void; icon: ReactNode };
const SIZE = 40;
const STEP = 40;

function FilmReelIcon({ progress, isDark }: { progress: Animated.Value; isDark: boolean }) {
  const ink = isDark ? '#E8E9DF' : '#4C5149';
  const paper = isDark ? '#363D36' : '#F7F6F4';
  return <View pointerEvents="none" accessible={false} style={{ width: 30, height: 30 }}>
    <Svg width={30} height={30} viewBox="0 0 30 30" style={StyleSheet.absoluteFill}>
      <Path d="M21 18.5Q22.5 20.5 26.4 21.2Q30 23 27 28Q28.2 24.8 24.5 24L19 22Z" fill={ink} />
      <Path d="M24.2 21.8 26.4 22.5 25.8 24.3 23.7 23.6Z" fill={paper} />
    </Svg>
    <Animated.View style={{ width: 26, height: 26, transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }] }}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Path d="M13 1.4C19.2 1.1 24.4 6.6 24.5 12.8C24.8 19.4 19.3 24.5 13 24.6C6.5 24.9 1.3 19.4 1.5 13C1.2 6.7 6.7 1.6 13 1.4Z" fill={paper} stroke={ink} strokeWidth={1.2} strokeLinecap="round" />
        <Circle cx={13.1} cy={13} r={10.4} fill="none" stroke={ink} strokeWidth={0.65} />
        {[{ x: 13, y: 6.7 }, { x: 19.2, y: 13 }, { x: 13, y: 19.2 }, { x: 6.7, y: 13 }].map((hole, i) => <Circle key={i} cx={hole.x} cy={hole.y} r={2.65} fill={ink} fillOpacity={1} stroke={ink} strokeWidth={0.45} />)}
        <Circle cx={13} cy={13} r={2} fill="none" stroke={ink} strokeWidth={0.65} />
        <Circle cx={13} cy={13} r={0.65} fill={ink} />
      </Svg>
    </Animated.View>
  </View>;
}

/** Shared floating tools, with a paper tray for mates and a film reel for scenes. */
export function CardToolsFab({ isDark, overview, actions, belowAction, testID = 'rhythm-card-tools-fab', bottom = 72, concept = 'bag' }: {
  isDark: boolean; overview: boolean; actions: CardToolAction[]; belowAction?: CardToolAction; testID?: string; bottom?: number; concept?: 'bag' | 'film';
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const motion = Animated.timing(progress, { toValue: open ? 1 : 0, duration: open ? 280 : 220, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [open, progress]);
  const [previousOverview, setPreviousOverview] = useState(overview);
  if (previousOverview !== overview) { setPreviousOverview(overview); setOpen(false); }
  const toggle = () => { tapHaptic(); setOpen(value => !value); };
  return <View pointerEvents="box-none" style={s.layer}>
    {open ? <Pressable accessibilityRole="button" accessibilityLabel={t('dayPlan.cardToolsFabClose')} onPress={toggle} style={StyleSheet.absoluteFill} /> : null}
    <View pointerEvents="box-none" style={[s.root, { bottom, height: SIZE + (belowAction ? STEP : 0) }]}>
      {actions.map((action, index) => <Animated.View key={action.key} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[s.action, { bottom: belowAction ? STEP : 0, opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -(index + 1) * STEP] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>
        <Pressable testID={action.testID} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={action.selected != null ? { selected: action.selected, expanded: action.selected } : undefined} onPress={() => { tapHaptic(); setOpen(false); action.onPress(); }} style={({ pressed }) => [s.face, { opacity: pressed ? 0.6 : 1 }]}>{action.icon}</Pressable>
      </Animated.View>)}
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={open ? t('dayPlan.cardToolsFabClose') : t('dayPlan.cardToolsFab')} accessibilityState={{ expanded: open }} onPress={toggle} style={[s.face, s.trigger]}>
        {concept === 'film' ? <FilmReelIcon progress={progress} isDark={isDark} /> : <MateBagIcon progress={progress} isDark={isDark} />}
      </Pressable>
      {belowAction ? <ServiceTutorialTarget steps={belowAction.tutorialSteps ?? []} style={{ position: 'absolute', top: STEP }}><Pressable testID={belowAction.testID} accessibilityRole="button" accessibilityLabel={belowAction.label} onPress={() => { tapHaptic(); setOpen(false); belowAction.onPress(); }} style={({ pressed }) => [s.face, { opacity: pressed ? 0.6 : 1 }]}>{belowAction.icon}</Pressable></ServiceTutorialTarget> : null}
    </View>
  </View>;
}
const s = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 4 },
  root: { position: 'absolute', right: 14, width: SIZE, height: SIZE },
  action: { position: 'absolute', right: 0, bottom: 0, width: SIZE, height: SIZE, zIndex: 1 },
  trigger: { zIndex: 2, borderRadius: SIZE / 2 },
  face: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
