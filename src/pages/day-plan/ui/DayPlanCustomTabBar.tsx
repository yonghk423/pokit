import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCallback, useContext, useMemo } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
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

  const handleBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onTabBarHeightChange?.(e.nativeEvent.layout.height);
    },
    [onTabBarHeightChange],
  );

  const focusedRoute = state.routes[state.index]?.name;
  /**
   * Expo Router에서 탭 초기 진입 시 `index`가 포커스로 남는 케이스가 있어
   * 가운데 액션 버튼이 눌리지 않는 문제를 막기 위해 동일 화면으로 취급한다.
   */
  const isDayPlanFocused = focusedRoute === 'day-plan' || focusedRoute === 'index';
  const isCatalogFocused = focusedRoute === 'priority-catalog';
  const isSettingsFocused = focusedRoute === 'settings';
  const hideCenterButton = bridge.primaryHidden;

  const centerDisabled = !isDayPlanFocused || bridge.primaryDisabled;

  const onCenterPress = () => {
    if (centerDisabled) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bridge.invokePrimary();
  };

  const onRoutineFabPress = () => {
    if (!bridge.routineStartFab.visible || bridge.routineStartFab.disabled) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bridge.invokeRoutineStartFab();
  };

  const showRoutineFab =
    isDayPlanFocused && bridge.routineStartFab.visible && !bridge.routineStartFab.disabled;

  return (
    <View style={styles.tabShell}>
      <View
        onLayout={handleBarLayout}
        style={[
          styles.wrapper,
          {
            backgroundColor: c.containerLow,
            borderTopColor: c.border,
            /** 세이프는 행 밖으로만 — 행에 minHeight+insets를 같이 쓰면 아이콘이 세로 중앙에 뜨며 위쪽에 큰 빈 면이 생김 */
            paddingBottom: insets.bottom,
          },
        ]}>
      <View style={[styles.row, { minHeight: DAY_PLAN_TAB_BAR_ROW_HEIGHT }]}>
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
            name="bag.fill"
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

      {showRoutineFab ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={bridge.routineStartFab.label}
          onPress={onRoutineFabPress}
          style={({ pressed }) => [
            styles.routineStartFab,
            {
              bottom: insets.bottom + DAY_PLAN_TAB_BAR_ROW_HEIGHT + 10,
              backgroundColor: PRIMARY,
              opacity: pressed ? 0.92 : 1,
              shadowColor: '#000',
            },
          ]}>
          <ThemedText
            style={styles.routineStartFabLabel}
            lightColor="#fff"
            darkColor="#fff"
            numberOfLines={2}>
            {bridge.routineStartFab.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    position: 'relative',
  },
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    minWidth: 120,
    maxWidth: 160,
    paddingHorizontal: 16,
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
  routineStartFab: {
    position: 'absolute',
    right: 12,
    maxWidth: '56%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  routineStartFabLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.25,
    textAlign: 'center',
  },
});
