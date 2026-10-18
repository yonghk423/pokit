import React from 'react';
import { DynamicColorIOS, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  resolveAppFontFamily,
  useAppFontSizeId,
  useEffectiveAppFontId,
} from '@shared/lib/ui-font';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';
import { IconSymbol } from '@shared/ui/icon-symbol';

const TAB_ICONS: Record<string, string> = {
  'day-plan': 'calendar',
  'fixed-routines': 'list.bullet.rectangle',
  /** 퍼즐 History — 기억/사진 스택 느낌 */
  'puzzle-history': 'rectangle.stack',
  /** 주간·월간 통계 History */
  'day-plan-statistics': 'clock.arrow.circlepath',
  'pokit-story': 'book',
};

/** 탭 라벨 고정 크기 — 글씨 크기 설정(sm/md/lg)과 무관 */
const TAB_LABEL_FONT_SIZE = 10;
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_TOP_GAP = 8;
const TAB_BAR_BOTTOM_GAP = 12;

export const unstable_settings = { initialRouteName: 'day-plan' };

export default function TabLayout() {
  return (
    <DayPlanTabBridgeProvider>
      {Platform.OS === 'ios' ? <IosTabLayout /> : <FloatingTabLayout />}
    </DayPlanTabBridgeProvider>
  );
}

function IosTabLayout() {
  const { t } = useTranslation();
  const foreground = DynamicColorIOS({ light: '#151518', dark: '#FAFAFA' });

  return (
    <NativeTabs
      tintColor={foreground}
      labelStyle={{ fontSize: 10, color: foreground }}
      minimizeBehavior="never">
      <NativeTabs.Trigger name="day-plan" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('tabs.dayPlan')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fixed-routines" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('tabs.routines')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="puzzle-history" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('tabs.puzzle')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="rectangle.stack" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pokit-story" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('tabs.story')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function FloatingTabLayout() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const bottomSpace = insets.bottom + TAB_BAR_BOTTOM_GAP;
  const { t } = useTranslation();
  const appFontId = useEffectiveAppFontId();
  const appFontSizeId = useAppFontSizeId();
  const tabLabelFontFamily = resolveAppFontFamily(appFontId, '600');

  return (
    <Tabs
        key={`${appFontId}-${appFontSizeId}`}
        initialRouteName="day-plan"
        detachInactiveScreens
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
          tabBarInactiveTintColor: isDark ? '#8E8E93' : '#999999',
          tabBarLabelPosition: 'below-icon',
          tabBarActiveBackgroundColor: isDark ? '#38383C' : '#EEEEF0',
          // Reserve the full footprint so lists, memo controls and WebViews stay above the bar.
          tabBarStyle: [
            styles.tabBar,
            {
              height: TAB_BAR_TOP_GAP + TAB_BAR_HEIGHT + bottomSpace,
              paddingBottom: bottomSpace + 5,
              paddingLeft: Math.max(insets.left, 16) + 7,
              paddingRight: Math.max(insets.right, 16) + 7,
            },
          ],
          tabBarItemStyle: styles.tabItem,
          tabBarBackground: () => (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View
                style={[
                  styles.capsule,
                  {
                    bottom: bottomSpace,
                    left: Math.max(insets.left, 16),
                    right: Math.max(insets.right, 16),
                    backgroundColor: isDark ? '#242427' : '#FAFAFC',
                    borderColor: isDark ? '#46464B' : '#FFFFFF',
                  },
                ]}
              />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: TAB_LABEL_FONT_SIZE,
            lineHeight: 14,
            ...(tabLabelFontFamily ? { fontFamily: tabLabelFontFamily } : null),
          },
          tabBarIcon: ({ color }) => {
            const icon = TAB_ICONS[route.name] ?? 'circle';
            return <IconSymbol name={icon as any} size={24} color={color as string} />;
          },
        })}>
        <Tabs.Screen name="day-plan" options={{ title: t('tabs.dayPlan') }} />
        <Tabs.Screen name="fixed-routines" options={{ title: t('tabs.routines') }} />
        <Tabs.Screen name="puzzle-history" options={{ title: t('tabs.puzzle') }} />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: TAB_BAR_TOP_GAP + 5,
  },
  capsule: {
    position: 'absolute',
    top: TAB_BAR_TOP_GAP,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 7,
  },
  tabItem: {
    borderRadius: 27,
    marginHorizontal: 2,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
