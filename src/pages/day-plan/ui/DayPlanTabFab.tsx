import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PokitIconPalette } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

const FAB_PLAY_ICON = '#FAFAFA';

export function DayPlanTabFab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bridge = useDayPlanTabBridge();

  const isMainTab = pathname === '/day-plan' || pathname === '/';
  const showFab = isMainTab && bridge.routineStartFab.visible && !bridge.routineStartFab.disabled;
  const fabPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showFab) {
      fabPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.06,
          duration: 780,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fabPulse, showFab]);

  if (!showFab) return null;

  const onPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bridge.invokeRoutineStartFab();
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 58,
          transform: [{ scale: fabPulse }],
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bridge.routineStartFab.label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: PokitIconPalette.teal,
            shadowColor: PokitIconPalette.teal,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}>
        <IconSymbol name="play.fill" size={22} color={FAB_PLAY_ICON} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    zIndex: 900,
    elevation: 900,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
  },
});
