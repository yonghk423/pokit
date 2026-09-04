import React from 'react';

import { Tabs } from 'expo-router';

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
  'priority-catalog': 'figure.walk',
  'fixed-routines': 'list.bullet.rectangle',
  'day-plan-statistics': 'clock.arrow.circlepath',
  'pokit-story': 'book',
};

/** 탭 라벨 고정 크기 — 글씨 크기 설정(sm/md/lg)과 무관 */
const TAB_LABEL_FONT_SIZE = 10;

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const { t } = useTranslation();
  const appFontId = useEffectiveAppFontId();
  const appFontSizeId = useAppFontSizeId();
  const tabLabelFontFamily = resolveAppFontFamily(appFontId, '600');

  return (
    <DayPlanTabBridgeProvider>
      <Tabs
        key={`${appFontId}-${appFontSizeId}`}
        initialRouteName="day-plan"
        screenOptions={({ route }) => ({
          headerShown: false,
          freezeOnBlur: true,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
          tabBarInactiveTintColor: isDark ? '#8E8E93' : '#999999',
          tabBarLabelStyle: {
            fontSize: TAB_LABEL_FONT_SIZE,
            ...(tabLabelFontFamily ? { fontFamily: tabLabelFontFamily } : null),
          },
          tabBarIcon: ({ color }) => {
            const icon = TAB_ICONS[route.name] ?? 'circle';
            return <IconSymbol name={icon as any} size={24} color={color} />;
          },
        })}>
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="day-plan" options={{ title: t('tabs.dayPlan') }} />
          <Tabs.Screen name="fixed-routines" options={{ title: t('tabs.routines') }} />
          <Tabs.Screen name="priority-catalog" options={{ title: t('tabs.myRoutines') }} />
          <Tabs.Screen name="day-plan-statistics" options={{ title: t('tabs.history') }} />
          <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
        </Tabs>
    </DayPlanTabBridgeProvider>
  );
}
