import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

export const DAY_PLAN_TAB_BAR_ROW_HEIGHT = 56;
const TAB_BAR_SHADOW = 3;

const IOS_HOME_INDICATOR_FALLBACK = 34;

export function tabBarScrollBottomInset(_safeBottomInset: number, endGapPx = 6): number {
  return endGapPx;
}

type TabDef = {
  route: string;
  icon: string;
  size: number;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { route: 'day-plan', icon: 'calendar', size: 22, labelKey: 'tabs.dayPlan' },
  { route: 'fixed-routines', icon: 'list.bullet.rectangle', size: 22, labelKey: 'tabs.routines' },
  { route: 'priority-catalog', icon: 'figure.walk', size: 22, labelKey: 'tabs.myRoutines' },
  { route: 'day-plan-statistics', icon: 'clock.arrow.circlepath', size: 22, labelKey: 'tabs.history' },
  { route: 'pokit-story', icon: 'book', size: 22, labelKey: 'tabs.story' },
];

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
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
          containerBg: RetroFlatColors.dark.surfaceAlt,
          shadow: RetroFlatColors.dark.solidShadow,
          activeBg: RetroFlatColors.dark.bgMint,
          activeIcon: RetroFlatColors.dark.tertiary,
          inactiveIcon: RetroFlatColors.dark.textMuted,
        }
        : {
          containerBg: '#FFFFFF',
          shadow: '#000000',
          activeBg: RetroFlatColors.light.bgMint,
          activeIcon: RetroFlatColors.light.tertiary,
          inactiveIcon: RetroFlatColors.light.textMuted,
        },
    [isDark],
  );

  return (
    <View
      onLayout={handleBarLayout}
      style={[styles.outerWrap, { paddingBottom: safeBottom }]}>
      <View
        style={[
          styles.shell,
          { marginRight: TAB_BAR_SHADOW, marginBottom: TAB_BAR_SHADOW },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              backgroundColor: colors.shadow,
              transform: [{ translateX: TAB_BAR_SHADOW }, { translateY: TAB_BAR_SHADOW }],
            },
          ]}
        />
        <View
          style={[
            styles.container,
            { backgroundColor: colors.containerBg },
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
                accessibilityLabel={t(tab.labelKey)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  shell: {
    position: 'relative',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: DAY_PLAN_TAB_BAR_ROW_HEIGHT,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 6,
    gap: 4,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 0,
  },
});
