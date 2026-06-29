import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';
import { IconSymbol } from '@shared/ui/icon-symbol';

const TAB_ICONS: Record<string, string> = {
  'day-plan': 'calendar',
  'priority-catalog': 'list.bullet.rectangle',
  'fixed-routines': 'figure.walk',
  'day-plan-statistics': 'clock.arrow.circlepath',
  settings: 'person',
};

function tabBarColors(isDark: boolean) {
  return isDark
    ? {
      containerBg: '#1C1C1E',
      containerBorder: 'rgba(255,255,255,0.10)',
      activeBg: '#3A3A3C',
      activeIcon: '#FAFAFA',
      inactiveIcon: '#8E8E93',
    }
    : {
      containerBg: '#FFFFFF',
      containerBorder: '#E5E5E5',
      activeBg: '#E8E5E0',
      activeIcon: '#1A1A1A',
      inactiveIcon: '#999999',
    };
}

export function useDayPlanStyledTabScreenOptions(): ({
  route,
}: {
  route: { name: string };
}) => BottomTabNavigationOptions {
  const isDark = useColorScheme() === 'dark';
  const colors = useMemo(() => tabBarColors(isDark), [isDark]);

  return useMemo(
    () =>
      ({ route }) => ({
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.activeIcon,
        tabBarInactiveTintColor: colors.inactiveIcon,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <View
            style={[
              styles.tabBarBackground,
              {
                backgroundColor: colors.containerBg,
                borderColor: colors.containerBorder,
              },
            ]}
          />
        ),
        tabBarIcon: ({ focused, color }) => {
          const icon = TAB_ICONS[route.name] ?? 'circle';

          return (
            <View style={[styles.iconPill, focused && { backgroundColor: colors.activeBg }]}>
              <IconSymbol name={icon as any} size={22} color={color} />
            </View>
          );
        },
      }),
    [colors],
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    marginHorizontal: 16,
    marginBottom: 4,
    height: 64,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabBarBackground: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabItem: {
    height: 44,
    paddingVertical: 0,
  },
  iconPill: {
    width: '100%',
    maxWidth: 64,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
