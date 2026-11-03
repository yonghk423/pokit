import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import type { ServiceStep } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import Svg, { G, Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';

export type CardToolAction = { key: string; testID: string; label: string; selected?: boolean; tutorialSteps?: ServiceStep[]; onPress: () => void; icon: ReactNode };
const SIZE = 40;
const STEP = 40;

function FilmReelIcon({ progress, isDark }: { progress: Animated.Value; isDark: boolean }) {
  const ink = isDark ? '#E8E9DF' : '#343B32';
  return <View pointerEvents="none" accessible={false} style={{ width: 30, height: 30 }}>
    <Svg width={30} height={30} viewBox="0 0 30 30" style={StyleSheet.absoluteFill}>
      <Path d="M21 21.5Q24 22 26.5 24L28 26M23.5 24L27.6 25.5" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
    <Animated.View style={{ width: 26, height: 26, transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }] }}>
      <Svg width={26} height={26} viewBox="0 0 26 26" stroke={ink} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M13 1.8C19.2 1.5 24.4 6.8 24.1 13C24.4 19.3 19 24.4 12.9 24.1C6.5 24.3 1.6 19 1.9 12.9C1.6 6.6 6.8 1.7 13 1.8Z" strokeWidth={1.4} />
        {[{ x: 13, y: 6.7 }, { x: 19.2, y: 13 }, { x: 13, y: 19.2 }, { x: 6.8, y: 13 }].map((hole, index) => <G key={index} transform={`translate(${hole.x} ${hole.y})`}>
          <Path d="M0-2.1C1.3-2.2 2.2-1.2 2.1 0C2.2 1.3 1.2 2.2 0 2.1C-1.3 2.2-2.2 1.2-2.1 0C-2.2-1.3-1.2-2.2 0-2.1Z" strokeWidth={1.25} />
        </G>)}
        <Path d="M13 11.7C14.7 11.5 14.8 14.3 13 14.3C11.3 14.4 11.2 11.6 13 11.7Z" strokeWidth={1.1} />
      </Svg>
    </Animated.View>
  </View>;
}

/** Shared floating tools, with a paper tray for mates and a film reel for scenes. */
export function CardToolsFab({ isDark, overview, actions, belowAction, testID = 'rhythm-card-tools-fab', bottom = 72, concept = 'bag', docked = false, compact = false }: {
  isDark: boolean; overview: boolean; actions: CardToolAction[]; belowAction?: CardToolAction; testID?: string; bottom?: number; concept?: 'bag' | 'film'; docked?: boolean; compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const triggerRef = useRef<View>(null);
  const window = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const motion = Animated.timing(progress, { toValue: open ? 1 : 0, duration: open ? 280 : 220, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true });
    motion.start(({ finished }) => { if (finished && !open) setMenuVisible(false); });
    return () => motion.stop();
  }, [open, progress]);
  const [previousOverview, setPreviousOverview] = useState(overview);
  if (previousOverview !== overview) { setPreviousOverview(overview); setOpen(false); }
  const toggle = () => { tapHaptic(); setOpen(value => !value); };
  if (docked) {
    const menuActions = belowAction ? [...actions, belowAction] : actions;
    const left = Math.min(window.width - 52, Math.max(8, anchor?.x ?? window.width - 60));
    const top = Math.max(12, (anchor?.y ?? window.height - 90) - menuActions.length * 48 - 10);
    return <View style={{ width: compact ? 32 : 40, height: compact ? 28 : 44, justifyContent: 'center' }}>
      <Pressable ref={triggerRef} testID={testID} accessibilityRole="button" accessibilityLabel={open ? t('dayPlan.cardToolsFabClose') : t('dayPlan.cardToolsFab')} accessibilityState={{ expanded: open }} onPress={() => {
        tapHaptic();
        triggerRef.current?.measureInWindow((x, y) => { setAnchor({ x, y }); setMenuVisible(true); setOpen(true); });
      }} style={[s.face, compact && { width: 32, height: 28 }]}><View style={compact ? { transform: [{ scale: 0.72 }] } : undefined}><FilmReelIcon progress={progress} isDark={isDark} /></View></Pressable>
      {menuVisible ? <AppModal transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1 }}>
          <Pressable testID="comic-tools-backdrop" accessibilityRole="button" accessibilityLabel={t('dayPlan.cardToolsFabClose')} onPress={() => { tapHaptic(); setOpen(false); }} style={StyleSheet.absoluteFill} />
          <Animated.View testID="comic-tools-vertical-menu" pointerEvents={open ? 'auto' : 'none'} accessibilityViewIsModal style={{ position: 'absolute', left, top, padding: 2, borderRadius: 8, backgroundColor: isDark ? 'rgba(38,43,40,0.65)' : 'rgba(247,246,244,0.65)', opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            {menuActions.map(action => <ServiceTutorialTarget key={action.key} steps={action.tutorialSteps ?? []}><Pressable testID={action.testID} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={action.selected == null ? undefined : { selected: action.selected }} onPress={() => { tapHaptic(); setOpen(false); action.onPress(); }} style={({ pressed }) => ({ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>{action.icon}</Pressable></ServiceTutorialTarget>)}
          </Animated.View>
        </View>
      </AppModal> : null}
    </View>;
  }
  return <View pointerEvents="box-none" style={s.layer}>
    {open ? <Pressable accessibilityRole="button" accessibilityLabel={t('dayPlan.cardToolsFabClose')} onPress={toggle} style={StyleSheet.absoluteFill} /> : null}
    <View pointerEvents="box-none" style={[s.root, { bottom, height: SIZE + (belowAction ? STEP : 0) }]}>
      {actions.map((action, index) => <Animated.View key={action.key} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[s.action, { bottom: belowAction ? STEP : 0, opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, concept === 'film' ? 0 : -(index + 1) * STEP] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, concept === 'film' ? -(index + 1) * STEP : 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>
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
