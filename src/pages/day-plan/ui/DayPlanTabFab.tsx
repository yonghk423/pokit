import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

export function DayPlanTabFab() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const tabColors = tabPillColors(isDark);
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
            backgroundColor: tabColors.activeBg,
            borderColor: tabColors.activeBorder,
            shadowColor: '#000',
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}>
        <IconSymbol name="play.fill" size={20} color={tabColors.activeIcon} />
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
  },
});
