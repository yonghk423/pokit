import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

/** DayPlan 탭 행 `minHeight` 기준(레이아웃·타이핑용) */
export const DAY_PLAN_TAB_BAR_ROW_HEIGHT = 56;

const IOS_HOME_INDICATOR_FALLBACK = 34;

/**
 * Bottom tabs 네비게이터가 씬과 탭바를 이미 나누므로, 스크롤 `paddingBottom`에 탭 높이·세이프를
 * 한 번 더 넣으면 리스트 아래에 큰 빈 면이 생긴다. 끝에서 숨 쉴 여백만 둔다.
 */
export function tabBarScrollBottomInset(_safeBottomInset: number, endGapPx = 6): number {
  return endGapPx;
}

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const onTabBarHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);
  const bridge = useDayPlanTabBridge();
  const registerTabBarHeight = bridge.registerTabBarHeight;

  const safeBottom = useMemo(() => {
    const b = insets.bottom;
    if (Number.isFinite(b) && b > 0) return b;
    return Platform.OS === 'ios' ? IOS_HOME_INDICATOR_FALLBACK : 0;
  }, [insets.bottom]);

  const estimatedHeight = DAY_PLAN_TAB_BAR_ROW_HEIGHT + safeBottom + StyleSheet.hairlineWidth;

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
  const isDayPlanFocused = focusedRoute === 'day-plan' || focusedRoute === 'index';
  const registerIsDayPlanFocused = bridge.registerIsDayPlanFocused;
  const isCatalogFocused = focusedRoute === 'priority-catalog';
  const isStatisticsFocused = focusedRoute === 'day-plan-statistics';
  const isSettingsFocused = focusedRoute === 'settings';
  const hideCenterButton = bridge.primaryHidden;

  const centerDisabled = !isDayPlanFocused || bridge.primaryDisabled;

  useEffect(() => {
    registerIsDayPlanFocused(isDayPlanFocused);
  }, [isDayPlanFocused, registerIsDayPlanFocused]);

  const onCenterPress = () => {
    if (centerDisabled) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bridge.invokePrimary();
  };

  return (
    <View
      onLayout={handleBarLayout}
      style={[
        styles.wrapper,
        {
          backgroundColor: isDark ? c.containerLow : '#fff',
          borderTopColor: c.border,
          paddingBottom: safeBottom,
        },
      ]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isDayPlanFocused }}
          accessibilityLabel="오늘"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('day-plan');
          }}
          style={({ pressed }) => [
            styles.tabPill,
            {
              backgroundColor: isDayPlanFocused ? tabColors.activeBg : tabColors.inactiveBg,
              borderColor: isDayPlanFocused ? tabColors.activeBorder : tabColors.inactiveBorder,
            },
            pressed && { opacity: 0.92 },
          ]}>
          <IconSymbol
            name="book.closed.fill"
            size={24}
            color={isDayPlanFocused ? tabColors.activeIcon : tabColors.inactiveIcon}
          />
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isCatalogFocused }}
          accessibilityLabel="담기, 오늘 집중할 것 고르기"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('priority-catalog');
          }}
          style={({ pressed }) => [
            styles.tabPill,
            {
              backgroundColor: isCatalogFocused ? tabColors.activeBg : tabColors.inactiveBg,
              borderColor: isCatalogFocused ? tabColors.activeBorder : tabColors.inactiveBorder,
            },
            pressed && { opacity: 0.92 },
          ]}>
          <IconSymbol
            name="square.grid.2x2.fill"
            size={22}
            color={isCatalogFocused ? tabColors.activeIcon : tabColors.inactiveIcon}
          />
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isStatisticsFocused }}
          accessibilityLabel="통계"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('day-plan-statistics');
          }}
          style={({ pressed }) => [
            styles.tabPill,
            {
              backgroundColor: isStatisticsFocused ? tabColors.activeBg : tabColors.inactiveBg,
              borderColor: isStatisticsFocused ? tabColors.activeBorder : tabColors.inactiveBorder,
            },
            pressed && { opacity: 0.92 },
          ]}>
          <IconSymbol
            name="chart.bar.fill"
            size={22}
            color={isStatisticsFocused ? tabColors.activeIcon : tabColors.inactiveIcon}
          />
        </Pressable>

        {hideCenterButton ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bridge.primaryLabel}
            accessibilityState={{ disabled: centerDisabled }}
            onPress={onCenterPress}
            style={({ pressed }) => [
              styles.centerBtn,
              {
                backgroundColor: centerDisabled ? c.containerHigh : PRIMARY,
                opacity: pressed && !centerDisabled ? 0.92 : 1,
              },
            ]}>
            <ThemedText
              style={[styles.centerLabel, { color: centerDisabled ? c.onVariant : '#fff' }]}
              lightColor={centerDisabled ? c.onVariant : '#fff'}
              darkColor={centerDisabled ? c.onVariant : '#fff'}
              numberOfLines={1}>
              {bridge.primaryLabel}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isSettingsFocused }}
          accessibilityLabel="설정"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('settings');
          }}
          style={({ pressed }) => [
            styles.tabPill,
            {
              backgroundColor: isSettingsFocused ? tabColors.activeBg : tabColors.inactiveBg,
              borderColor: isSettingsFocused ? tabColors.activeBorder : tabColors.inactiveBorder,
            },
            pressed && { opacity: 0.92 },
          ]}>
          <IconSymbol
            name="person.fill"
            size={24}
            color={isSettingsFocused ? tabColors.activeIcon : tabColors.inactiveIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: DAY_PLAN_TAB_BAR_ROW_HEIGHT,
    paddingHorizontal: 10,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  centerBtn: {
    flexShrink: 0,
    minWidth: 100,
    maxWidth: 148,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
