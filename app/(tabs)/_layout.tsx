import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import {
  DayPlanTabBridgeProvider,
} from '@pages/day-plan';
import { DayPlanTabFab } from '@pages/day-plan/ui/DayPlanTabFab';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <DayPlanTabBridgeProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          initialRouteName="day-plan"
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
            tabBarInactiveTintColor: isDark ? '#A1A1AA' : '#666666',
          }}>
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen
            name="day-plan"
            options={{
              title: '오늘',
              tabBarIcon: ({ color }) => <IconSymbol name="book.closed.fill" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="priority-catalog"
            options={{
              title: '담기',
              tabBarIcon: ({ color }) => <IconSymbol name="square.grid.2x2.fill" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="day-plan-statistics"
            options={{
              title: '통계',
              tabBarIcon: ({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={color} />,
            }}
          />
          <Tabs.Screen name="discover" options={{ href: null }} />
          <Tabs.Screen name="routines" options={{ href: null }} />
          <Tabs.Screen
            name="settings"
            options={{
              title: '설정',
              tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={24} color={color} />,
            }}
          />
        </Tabs>
        <DayPlanTabFab />
      </View>
    </DayPlanTabBridgeProvider>
  );
}
