import { Tabs } from 'expo-router';
import React from 'react';

import { DayPlanTabBridgeProvider } from '@pages/day-plan';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';
import { IconSymbol } from '@shared/ui/icon-symbol';

const TAB_ICONS: Record<string, string> = {
  'day-plan': 'calendar',
  'priority-catalog': 'list.bullet.rectangle',
  'fixed-routines': 'star',
  'day-plan-statistics': 'clock.arrow.circlepath',
  settings: 'person',
};

export default function TabLayout() {
  return (
    <DayPlanTabBridgeProvider>
      <Tabs
        initialRouteName="day-plan"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#999999',
          tabBarIcon: ({ color }) => {
            const icon = TAB_ICONS[route.name] ?? 'circle';
            return <IconSymbol name={icon as any} size={24} color={color} />;
          },
        })}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="day-plan" options={{ title: '오늘' }} />
        <Tabs.Screen name="priority-catalog" options={{ title: '루틴' }} />
        <Tabs.Screen name="fixed-routines" options={{ title: '나만의 루틴' }} />
        <Tabs.Screen name="day-plan-statistics" options={{ title: '히스토리' }} />
        <Tabs.Screen name="settings" options={{ title: '설정' }} />
      </Tabs>
    </DayPlanTabBridgeProvider>
  );
}
