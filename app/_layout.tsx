import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStatusBar } from '@app/AppStatusBar';
import { AppUpdateNoticeHost } from '@app/AppUpdateNoticeHost';
import { useAppBootstrap, useCityPopFonts } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { RetroFlatColors } from '@shared/config/retroFlat';

/** day-plan `palette`의 `c.bg`와 동일 — Stack 기본 `card` 배경 */
const APP_SURFACE_LIGHT = RetroFlatColors.light.bg;
const APP_SURFACE_DARK = RetroFlatColors.dark.bg;

/** 네이티브 스플래시 최소 표시 시간 */
const MIN_SPLASH_MS = 1000;

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* 이미 숨겨진 경우 무시 */
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const splashStartedAtRef = useRef(Date.now());

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
  const contentReady = appReady && fontsReady;

  useEffect(() => {
    if (!contentReady) return;
    const elapsed = Date.now() - splashStartedAtRef.current;
    const remainMs = Math.max(0, MIN_SPLASH_MS - elapsed);
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, remainMs);
    return () => clearTimeout(timer);
  }, [contentReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBg }}>
      <SafeAreaProvider>
        {contentReady ? (
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
              <Stack.Screen
                name="routine-template-detail"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="flow-review" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen
                name="widget-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="daily-rhythm-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="guide-book"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="welcome-intro"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="appearance-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="font-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="day-plan-view-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen
                name="notification-settings"
                options={{ headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen
                name="activity-session"
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
            </Stack>
            <AppUpdateNoticeHost appReady={appReady} />
            <AppStatusBar />
          </ThemeProvider>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
