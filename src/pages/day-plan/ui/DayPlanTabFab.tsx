import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PokitIconPalette } from '@shared/config/theme';
import { CityPopSpacing, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

const FAB_PLAY_ICON = '#FFFFFF';

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
          bottom: insets.bottom + 62,
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
            opacity: pressed ? 0.92 : 1,
            transform: pressed
              ? [{ translateX: 4 }, { translateY: 4 }]
              : [{ translateX: 0 }, { translateY: 0 }],
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
    right: CityPopSpacing.marginMobile,
    zIndex: 900,
    elevation: 0,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});
