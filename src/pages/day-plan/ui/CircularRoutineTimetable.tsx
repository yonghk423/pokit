import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDecay, Easing, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ThemedText } from '@shared/ui/themed-text';
import { orderCircularRoutines } from '../lib/circularRoutineLayout';

export type CircularRoutineItem = {
  key: string; label: string; icon: string; timeLabel?: string;
  startMinutes?: number; startsNextDay?: boolean; completed: boolean;
  faceColor?: string; inkColor?: string;
};
type Props = {
  items: CircularRoutineItem[]; ink: string; muted: string; isDark: boolean;
  renderDetail: (item: CircularRoutineItem) => ReactNode;
  onComplete: (key: string) => void;
  onFinish: (key: string, label: string) => void;
  onAdd: () => void;
};

function RoutineSector({ item, angle, radius, orbitRadius, rotation, ink, onPress, onComplete }: {
  item: CircularRoutineItem; angle: number; radius: number; orbitRadius: number; rotation: SharedValue<number>;
  ink: string; onPress: () => void; onComplete: () => void;
}) {
  const routineInk = item.inkColor ?? ink;
  const radians = angle * Math.PI / 180;
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotation.value}deg` }] }));
  return (
    <Animated.View style={[s.item, {
      left: radius + Math.cos(radians) * orbitRadius - 70,
      top: radius + Math.sin(radians) * orbitRadius - 58,
    }, upright]}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={onPress} style={s.itemMain}>
        <IconSymbol name={item.icon} size={32} color={routineInk} />
        <ThemedText numberOfLines={2} style={[s.itemTitle, { color: routineInk }]}>{item.label}</ThemedText>
        {item.timeLabel ? <ThemedText style={[s.time, { color: routineInk }]}>{item.timeLabel}</ThemedText> : null}
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.completed }} accessibilityLabel={item.label} onPress={onComplete} hitSlop={7} style={[s.complete, { borderColor: routineInk, backgroundColor: 'transparent' }]}>
        {item.completed ? <ThemedText style={{ color: routineInk, fontSize: 16, lineHeight: 21 }}>✓</ThemedText> : null}
      </Pressable>
    </Animated.View>
  );
}

export function CircularRoutineTimetable({ items, ink, muted, isDark, renderDetail, onComplete, onFinish, onAdd }: Props) {
  const { t } = useTranslation();
  const [size, setSize] = useState({ width: 340, height: 600 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = items.find(item => item.key === selectedKey);
  const rotation = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const drawer = useSharedValue(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ordered = orderCircularRoutines(items);
  const count = Math.max(8, ordered.length);
  // A larger wheel keeps each sector readable even when many routines are added.
  const radius = Math.max(size.width - 16, count * 31);
  // Fit the full semicircle within both available width and height on every phone.
  const visibleRadius = Math.max(1, Math.min(size.width - 16, size.height / 2));
  const wheelScale = visibleRadius / radius;
  const orbitRadius = Math.max(0, Math.min(
    radius - 100,
    (size.height / 2 - 20) / wheelScale - 58,
  ));
  const step = 360 / count;
  const close = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    drawer.set(withTiming(0, { duration: 220 }));
    closeTimer.current = setTimeout(() => setSelectedKey(null), 220);
  }, [drawer]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!selected) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => listener.remove();
  }, [selected, close]);
  // Start only after the newly mounted drawer has painted at its off-screen position.
  useEffect(() => {
    if (!selectedKey) return;
    let animationFrame: number | undefined;
    const mountFrame = requestAnimationFrame(() => {
      animationFrame = requestAnimationFrame(() => {
        drawer.set(withTiming(1, { duration: 360, easing: Easing.bezier(0.22, 0.61, 0.36, 1) }));
      });
    });
    return () => {
      cancelAnimationFrame(mountFrame);
      if (animationFrame != null) cancelAnimationFrame(animationFrame);
    };
  }, [selectedKey, drawer]);
  const openDetail = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    cancelAnimation(rotation);
    drawer.set(0);
    setSelectedKey(key);
  };
  const pan = Gesture.Pan().enabled(!selected).minDistance(8)
    .onStart(() => { cancelAnimation(rotation); dragStart.value = rotation.value; })
    .onUpdate(event => { rotation.value = dragStart.value + event.translationY / (radius * wheelScale) * 100; })
    .onEnd(event => { rotation.value = withDecay({ velocity: event.velocityY / (radius * wheelScale) * 100, deceleration: 0.995 }); });
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }, { scale: wheelScale }] }));
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - drawer.value) * size.width }] }));
  const dismissGesture = Gesture.Pan().runOnJS(true).activeOffsetX(15).failOffsetY([-20, 20])
    // Gesture Handler invokes this callback after a gesture, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onEnd(event => { if (event.translationX > 45 || event.velocityX > 400) close(); });
  const paper = isDark ? '#262B28' : '#FCFBF7';
  return (
    <View style={s.root} onLayout={event => setSize(event.nativeEvent.layout)}>
      <ThemedText pointerEvents="none" style={[s.hint, { color: muted }]}>{t('circularTimetable.dragHint')}</ThemedText>
      <GestureDetector gesture={pan}>
        <View style={s.viewport}>
          <Animated.View style={[{ position: 'absolute', width: radius * 2, height: radius * 2, left: -radius, top: size.height / 2 - radius }, wheelStyle]}>
            <Svg width={radius * 2} height={radius * 2}>
              <Circle cx={radius} cy={radius} r={radius - 2} fill={paper} stroke={muted} strokeWidth={1} />
              {ordered.map((item, index) => {
                const start = (-67.5 + index * step - step / 2) * Math.PI / 180;
                const end = start + step * Math.PI / 180;
                const x = radius + Math.cos(start) * (radius - 2);
                const y = radius + Math.sin(start) * (radius - 2);
                return <Path key={item.key} d={`M${radius} ${radius} L${x} ${y} A${radius - 2} ${radius - 2} 0 0 1 ${radius + Math.cos(end) * (radius - 2)} ${radius + Math.sin(end) * (radius - 2)} Z`} fill={item.faceColor ?? 'transparent'} onPress={() => openDetail(item.key)} accessibilityLabel={item.label} stroke={muted} strokeOpacity={0.35} strokeWidth={0.7} />;
              })}
            </Svg>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
              <PaperGrain opacity={0.22} />
            </View>
            {ordered.map((item, index) => <RoutineSector key={item.key} item={item} angle={-67.5 + index * step} radius={radius} orbitRadius={orbitRadius} rotation={rotation} ink={ink} onComplete={() => onComplete(item.key)} onPress={() => openDetail(item.key)} />)}
          </Animated.View>
        </View>
      </GestureDetector>
      <Pressable accessibilityRole="button" onPress={onAdd} style={[s.add, { backgroundColor: paper }]}>
        <HanddrawnFrame color={muted} /><ThemedText style={{ color: ink }}>＋ {t('dayPlan.addMoreRoutine')}</ThemedText>
      </Pressable>
      {selected ? <>
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 2 }]} onPress={close} accessibilityLabel={t('common.close')} />
        <Animated.View accessibilityViewIsModal style={[s.drawer, { backgroundColor: selected.faceColor ?? paper }, drawerStyle]}>
          <PaperGrain />
          <GestureDetector gesture={dismissGesture}>
          <View style={s.drawerHead}>
            <ThemedText style={[s.drawerTitle, { color: selected.inkColor ?? ink }]}>{selected.label}</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.closeButton} hitSlop={8} onPress={close}><ThemedText style={{ color: selected.inkColor ?? ink, fontSize: 26 }}>×</ThemedText></Pressable>
          </View>
          </GestureDetector>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail}>{renderDetail(selected)}</ScrollView>
          <View style={s.drawerFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dayPlan.endTodayA11y', { label: selected.label })}
              onPress={() => onFinish(selected.key, selected.label)}
              style={({ pressed }) => [s.detailFinish, { opacity: pressed ? 0.7 : 1 }]}>
              <HanddrawnFrame color={selected.inkColor ?? ink} />
              <ThemedText style={{ color: selected.inkColor ?? ink, textAlign: 'center', fontSize: 16 }}>
                {t('dayPlan.endTodayConfirm')}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </> : null}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  viewport: { flex: 1, overflow: 'hidden' },
  hint: { position: 'absolute', top: 8, right: 12, fontSize: 11, zIndex: 1 },
  item: { position: 'absolute', width: 140, height: 116, alignItems: 'center', justifyContent: 'center' },
  itemMain: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  itemTitle: { fontSize: 16, textAlign: 'center', lineHeight: 21 },
  time: { fontSize: 12 },
  complete: { marginTop: 5, width: 25, height: 25, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  add: { position: 'absolute', bottom: 14, right: 14, paddingVertical: 10, paddingHorizontal: 16 },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  drawer: { zIndex: 3, position: 'absolute', top: 0, bottom: 0, right: 0, width: '90%', borderLeftWidth: StyleSheet.hairlineWidth, borderColor: '#9CA79B', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  drawerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  drawerTitle: { flex: 1, fontSize: 20 },
  detail: { paddingHorizontal: 16, paddingBottom: 24 },
  drawerFooter: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  detailFinish: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
});
