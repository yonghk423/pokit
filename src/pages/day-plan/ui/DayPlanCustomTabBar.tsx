import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

/** DayPlan 스크롤 하단 여백과 맞출 때 사용 */
export const DAY_PLAN_TAB_BAR_ROW_HEIGHT = 52;

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);
  const bridge = useDayPlanTabBridge();

  const focusedRoute = state.routes[state.index]?.name;
  /**
   * Expo Router에서 탭 초기 진입 시 `index`가 포커스로 남는 케이스가 있어
   * 가운데 액션 버튼이 눌리지 않는 문제를 막기 위해 동일 화면으로 취급한다.
   */
  const isDayPlanFocused = focusedRoute === 'day-plan' || focusedRoute === 'index';
  const isSettingsFocused = focusedRoute === 'settings';

  const centerDisabled = !isDayPlanFocused || bridge.primaryDisabled;

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
      style={[
        styles.wrapper,
        {
          backgroundColor: c.containerLow,
          borderTopColor: c.border,
        },
      ]}>
      <View style={[styles.row, { minHeight: DAY_PLAN_TAB_BAR_ROW_HEIGHT + insets.bottom }]}>
        {/* 추후 재사용 예정: 홈(오늘) 탭 버튼 임시 비노출
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isDayPlanFocused }}
          accessibilityLabel="오늘"
          onPress={() => navigation.navigate('day-plan')}
          style={({ pressed }) => [styles.sideTab, pressed && { opacity: 0.7 }]}>
          <IconSymbol name="house.fill" size={24} color={isDayPlanFocused ? PRIMARY : c.onVariant} />
          <ThemedText
            style={[styles.tabLabel, { color: isDayPlanFocused ? PRIMARY : c.onVariant }]}
            lightColor={isDayPlanFocused ? PRIMARY : c.onVariant}
            darkColor={isDayPlanFocused ? PRIMARY : c.onVariant}>
            오늘
          </ThemedText>
        </Pressable>
        */}
        <View style={styles.sidePlaceholder} />

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
          {bridge.primaryLabel === '정지' ? (
            <View style={styles.centerStopRow}>
              <IconSymbol name="stop.fill" size={14} color={centerDisabled ? c.onVariant : '#fff'} />
              <ThemedText
                style={[styles.centerLabel, { color: centerDisabled ? c.onVariant : '#fff' }]}
                lightColor={centerDisabled ? c.onVariant : '#fff'}
                darkColor={centerDisabled ? c.onVariant : '#fff'}
                numberOfLines={1}>
                정지
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              style={[styles.centerLabel, { color: centerDisabled ? c.onVariant : '#fff' }]}
              lightColor={centerDisabled ? c.onVariant : '#fff'}
              darkColor={centerDisabled ? c.onVariant : '#fff'}
              numberOfLines={1}>
              {bridge.primaryLabel}
            </ThemedText>
          )}
        </Pressable>

        {/* 추후 재사용 예정: 설정 탭 버튼 임시 비노출
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isSettingsFocused }}
          accessibilityLabel="설정"
          onPress={() => navigation.navigate('settings')}
          style={({ pressed }) => [styles.sideTab, pressed && { opacity: 0.7 }]}>
          <IconSymbol
            name="gearshape.fill"
            size={24}
            color={isSettingsFocused ? PRIMARY : c.onVariant}
          />
          <ThemedText
            style={[styles.tabLabel, { color: isSettingsFocused ? PRIMARY : c.onVariant }]}
            lightColor={isSettingsFocused ? PRIMARY : c.onVariant}
            darkColor={isSettingsFocused ? PRIMARY : c.onVariant}>
            설정
          </ThemedText>
        </Pressable>
        */}
        <View style={styles.sidePlaceholder} />
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
    paddingHorizontal: 12,
    gap: 8,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  sidePlaceholder: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  centerStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
