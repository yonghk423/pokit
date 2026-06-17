import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { DayPlanTabBridgeProvider, DayPlanTabFab } from '@pages/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';
import { IconSymbol } from '@shared/ui/icon-symbol';

const TAB_ICONS: Record<string, string> = {
  'day-plan': 'calendar',
  'priority-catalog': 'list.bullet.rectangle',
  'fixed-routines': 'bookmark',
  'day-plan-statistics': 'clock.arrow.circlepath',
  'pokit-story': 'book',
};

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <DayPlanTabBridgeProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          initialRouteName="day-plan"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
            tabBarInactiveTintColor: isDark ? '#8E8E93' : '#999999',
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
          <Tabs.Screen name="pokit-story" options={{ title: '스토리' }} />
          <Tabs.Screen name="settings" options={{ href: null, title: '설정' }} />
        </Tabs>
        <DayPlanTabFab />
      </View>
    </DayPlanTabBridgeProvider>
  );
}
