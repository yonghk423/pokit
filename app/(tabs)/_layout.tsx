import { Tabs } from 'expo-router';
import React from 'react';

import { DayPlanCustomTabBar, DayPlanTabBridgeProvider } from '@pages/day-plan';

export default function TabLayout() {
  return (
    <DayPlanTabBridgeProvider>
      <Tabs
        initialRouteName="day-plan"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
        tabBar={(props) => <DayPlanCustomTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="day-plan" options={{ title: '오늘' }} />
        <Tabs.Screen name="priority-catalog" options={{ title: '담기' }} />
        <Tabs.Screen name="discover" options={{ href: null }} />
        <Tabs.Screen name="routines" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ title: '설정' }} />
      </Tabs>
    </DayPlanTabBridgeProvider>
  );
}
