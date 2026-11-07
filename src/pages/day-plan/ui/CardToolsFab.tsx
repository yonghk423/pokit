import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import type { ServiceStep } from '../../welcome-intro/model/serviceTutorial';
import { MateBagIcon } from './MateBagIcon';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HeroCardToolsInkContext } from '../model/heroCardToolsPortal';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';

export type CardToolAction = { key: string; testID: string; label: string; selected?: boolean; tutorialSteps?: ServiceStep[]; onPress: () => void; icon: ReactNode };
const SIZE = 40;
const STEP = 40;

function FilmStripIcon({ isDark }: { isDark: boolean }) {
  const cardInk = useContext(HeroCardToolsInkContext);
  const ink = cardInk ?? (isDark ? '#E8E9DF' : '#343B32');
  return <Svg pointerEvents="none" accessible={false} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4.2 2h15.6A2.2 2.2 0 0 1 22 4.2v15.6a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 19.8V4.2A2.2 2.2 0 0 1 4.2 2Z" />
    <Path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
  </Svg>;
}

/** Shared floating tools, with a paper tray for mates and a small film strip for scenes. */
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
      }} style={[s.face, compact && { width: 32, height: 28 }]}><FilmStripIcon isDark={isDark} /></Pressable>
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
        {concept === 'film' ? <FilmStripIcon isDark={isDark} /> : <MateBagIcon progress={progress} isDark={isDark} />}
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
