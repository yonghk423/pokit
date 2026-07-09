import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

export const DAY_PLAN_TAB_BAR_ROW_HEIGHT = 56;

const IOS_HOME_INDICATOR_FALLBACK = 34;

export function tabBarScrollBottomInset(_safeBottomInset: number, endGapPx = 6): number {
  return endGapPx;
}

type TabDef = {
  route: string;
  icon: string;
  size: number;
  label: string;
};

const TABS: TabDef[] = [
  { route: 'day-plan', icon: 'calendar', size: 22, label: '오늘' },
  { route: 'fixed-routines', icon: 'list.bullet.rectangle', size: 22, label: '루틴' },
  { route: 'priority-catalog', icon: 'figure.walk', size: 22, label: '나만의 루틴' },
  { route: 'day-plan-statistics', icon: 'clock.arrow.circlepath', size: 22, label: '히스토리' },
  { route: 'pokit-story', icon: 'book', size: 22, label: '스토리' },
];

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const onTabBarHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bridge = useDayPlanTabBridge();
  const registerTabBarHeight = bridge.registerTabBarHeight;

  const safeBottom = useMemo(() => {
    const b = insets.bottom;
    if (Number.isFinite(b) && b > 0) return b;
    return Platform.OS === 'ios' ? IOS_HOME_INDICATOR_FALLBACK : 0;
  }, [insets.bottom]);

  const estimatedHeight = DAY_PLAN_TAB_BAR_ROW_HEIGHT + safeBottom + 20;

  useEffect(() => {
    onTabBarHeightChange?.(estimatedHeight);
    registerTabBarHeight(estimatedHeight);
  }, [estimatedHeight, onTabBarHeightChange, registerTabBarHeight]);

  const handleBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      onTabBarHeightChange?.(height);
      registerTabBarHeight(height);
    },
    [onTabBarHeightChange, registerTabBarHeight],
  );

  const focusedRoute = state.routes[state.index]?.name;
  const registerIsDayPlanFocused = bridge.registerIsDayPlanFocused;
  const isDayPlanFocused = focusedRoute === 'day-plan' || focusedRoute === 'index';

  useEffect(() => {
    registerIsDayPlanFocused(isDayPlanFocused);
  }, [isDayPlanFocused, registerIsDayPlanFocused]);

  const colors = useMemo(
    () =>
      isDark
        ? {
          containerBg: '#1C1C1E',
          containerBorder: 'rgba(255,255,255,0.10)',
          activeBg: '#3A3A3C',
          activeIcon: '#FAFAFA',
          inactiveIcon: '#8E8E93',
        }
        : {
          containerBg: '#FFFFFF',
          containerBorder: '#E5E5E5',
          activeBg: '#E8E5E0',
          activeIcon: '#1A1A1A',
          inactiveIcon: '#999999',
        },
    [isDark],
  );

  return (
    <View
      onLayout={handleBarLayout}
      style={[styles.outerWrap, { paddingBottom: safeBottom }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.containerBg,
            borderColor: colors.containerBorder,
          },
        ]}>
        {TABS.map((tab) => {
          const isFocused =
            focusedRoute === tab.route ||
            (tab.route === 'day-plan' && focusedRoute === 'index');

          return (
            <Pressable
              key={tab.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(tab.route);
              }}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && { backgroundColor: colors.activeBg },
                pressed && { opacity: 0.8 },
              ]}>
              <IconSymbol
                name={tab.icon as any}
                size={tab.size}
                color={isFocused ? colors.activeIcon : colors.inactiveIcon}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: DAY_PLAN_TAB_BAR_ROW_HEIGHT,
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 6,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 0,
  },
});
