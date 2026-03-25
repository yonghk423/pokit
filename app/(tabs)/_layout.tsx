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
      {/* 보류 기능: 둘러보기/내 리듬/설정 탭은 추후 개발 시 다시 노출 */}
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
