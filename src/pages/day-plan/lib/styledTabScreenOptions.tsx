import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CityPopSpacing, RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
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
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    containerBg: c.surface,
    containerBorder: c.border,
    activeBg: c.bgMint,
    activeIcon: c.tertiary,
    inactiveIcon: c.textMuted,
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
            <View
              style={[
                styles.iconPill,
                focused && {
                  backgroundColor: colors.activeBg,
                  borderWidth: RETRO_BORDER_WIDTH,
                  borderColor: colors.containerBorder,
                },
              ]}>
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
    marginHorizontal: CityPopSpacing.marginMobile,
    marginBottom: CityPopSpacing.xs,
    height: 68,
    paddingTop: CityPopSpacing.xs,
    paddingBottom: CityPopSpacing.xs,
  },
  tabBarBackground: {
    flex: 1,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
  },
  tabItem: {
    height: 48,
    paddingVertical: 0,
  },
  iconPill: {
    width: '100%',
    maxWidth: 68,
    height: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
