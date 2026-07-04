import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppUpdateNoticeHost } from '@app/AppUpdateNoticeHost';
import { useAppBootstrap, useCityPopFonts } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { RetroFlatColors } from '@shared/config/retroFlat';

/** day-plan `palette`의 `c.bg`와 동일 — Stack 기본 `card` 배경 */
const APP_SURFACE_LIGHT = RetroFlatColors.light.bg;
const APP_SURFACE_DARK = RetroFlatColors.dark.bg;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    SplashScreen.setOptions({
      fade: false,
      duration: 0,
    });
  }, []);

  const navigationTheme = isDark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: APP_SURFACE_DARK,
        card: APP_SURFACE_DARK,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: APP_SURFACE_LIGHT,
        card: APP_SURFACE_LIGHT,
      },
    };

  const rootBg = isDark ? APP_SURFACE_DARK : APP_SURFACE_LIGHT;

  const appReady = useAppBootstrap();
  const fontsReady = useCityPopFonts();

  if (!appReady || !fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: rootBg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="goal-detail-settings"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen name="flow-review" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="widget-settings" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen
              name="daily-rhythm-settings"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="appearance-settings"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen
              name="notification-settings"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="incomplete-routine-reminder-settings"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="activity-session"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </Stack>
          <AppUpdateNoticeHost appReady={appReady} />
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
