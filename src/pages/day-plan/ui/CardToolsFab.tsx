import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import type { ServiceStep } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';

export type CardToolAction = { key: string; testID: string; label: string; selected?: boolean; tutorialSteps?: ServiceStep[]; onPress: () => void; icon: ReactNode };
const SIZE = 40;
const STEP = 40;

function FilmReelIcon({ progress, isDark }: { progress: Animated.Value; isDark: boolean }) {
  const ink = isDark ? '#E8E9DF' : '#354139';
  const paper = isDark ? '#363D36' : '#F7F6F4';
  return <View pointerEvents="none" accessible={false} style={{ width: 30, height: 30 }}>
    <Svg width={30} height={30} viewBox="0 0 30 30" style={StyleSheet.absoluteFill}>
      <Path d="M20.2 19.6C22.7 21.1 24.1 20.4 26.6 22C29.1 23.5 28.1 26.1 27.1 27.8C27.6 25.8 26.6 25.1 24.8 24.9L20.1 23.4Z" fill={ink} stroke={ink} strokeWidth={0.45} strokeLinejoin="round" />
      <Path d="M23.1 22.1L25.2 22.8L24.8 24.1L22.8 23.5Z" fill={paper} />
    </Svg>
    <Animated.View style={{ width: 26, height: 26, transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }] }}>
      <Svg width={26} height={26} viewBox="0 0 26 26" stroke={ink} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M13.1 1.6C18.7 .8 24.5 6.4 24.4 12.7C24.8 19.7 19.2 24.8 12.8 24.5C6.1 24.9 .8 19.4 1.4 12.9C1.1 6.9 6.7 1.5 13.1 1.6Z" fill={paper} strokeWidth={0.8} />
        <Path d="M2.5 7.9C.9 11.3 1.2 16.7 3.9 20.1C6 22.8 8.6 24.2 12.3 24.4C7.6 24.9 4.9 22.9 3.1 20.3C.3 16.1 .5 11.4 2.5 7.9Z" fill={ink} stroke="none" />
        <Path d="M14.1 1.5C18.5 1.8 21.5 4.5 23 7.8C21.6 5.2 18.3 2.9 14.4 2.3Z" fill={ink} stroke="none" />
        <Path d="M6.9 5.3C11.2 1.9 17.7 2.2 21.1 6.9C24.1 11 23.9 16.4 20.6 20C17.2 23.6 11.1 24 7 21.1C3.1 18.3 2.2 12.6 4.3 8.3" strokeWidth={0.55} />
        <Path d="M22.2 13.9C22.1 17.7 19.5 21.4 15.5 22.3" strokeWidth={0.95} />
        {[{ x: 12.9, y: 6.5, angle: -4 }, { x: 19.1, y: 12.9, angle: 20 }, { x: 12.8, y: 19.1, angle: -12 }, { x: 6.7, y: 13, angle: 10 }].map((hole, index) => <G key={index} transform={`translate(${hole.x} ${hole.y}) rotate(${hole.angle})`}>
          <Path d="M-.4-2.5C1.2-2.9 2.6-1.5 2.6 .1C2.4 1.8 1.3 2.8-.3 2.5C-2 2.8-2.9 1.3-2.6-.2C-2.8-1.6-1.7-2.5-.4-2.5Z" fill={ink} strokeWidth={0.35} />
          <Path d="M-1.1-1.7L-1.6 .5M-.1-1.9L-.8 .4" stroke={paper} strokeWidth={0.3} opacity={0.8} />
        </G>)}
        <Path d="M12.8 11.3C15 10.9 15.5 14.2 13.6 14.8C11.4 15.3 10.5 12.2 12.8 11.3Z" strokeWidth={0.55} />
        <Path d="M13 12.3L13.1 13.8" strokeWidth={0.7} />
        <Path d="M6.9 2.9L8.8 2.3M18.7 23.2L20.1 22.1" strokeWidth={0.25} opacity={0.7} />
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
