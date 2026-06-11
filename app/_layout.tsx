import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppBootstrap } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

/** day-plan `palette`의 `c.bg`와 동일 — Stack 기본 `card` 순백이면 스크롤 바운스 시 뒤가 하얗게 보임 */
const APP_SURFACE_LIGHT = '#fafafa';
const APP_SURFACE_DARK = '#09090b';

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

  if (!appReady) return null;

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
            <Stack.Screen
              name="activity-session"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
