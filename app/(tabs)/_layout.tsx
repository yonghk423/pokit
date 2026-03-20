import { Tabs } from 'expo-router';
import React from 'react';

import { Colors } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { HapticTab } from '@shared/ui';
import { IconSymbol } from '@shared/ui/icon-symbol';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '둘러보기',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: '내 리듬',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
