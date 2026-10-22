import { useAppAlertStore } from '@shared/lib/app-alert';
import { AppAlertRoot } from '@shared/ui/app-alert';
import { prepareIllustrations } from '@shared/ui/icon-symbol/illustrationCache';
import { prepareRhythmArtwork } from '@pages/day-plan/lib/rhythmArtworkCache';
import { prepareSurfaceTextures } from '@shared/ui/surface-texture/textureCache';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperGrain } from '@shared/ui/paper-grain';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsScreenTracker } from '@app/AnalyticsScreenTracker';
import { resolveStatusBarStyle } from '@app/AppStatusBar';
import { LocalizedSplashOverlay, SPLASH_BACKGROUND_COLOR, useAppBootstrap, useCityPopFonts } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { i18n } from '@shared/lib/i18n';

import { RetroFlatColors } from '@shared/config/retroFlat';

/** day-plan `palette`의 `c.bg`와 동일 — Stack 기본 `card` 배경 */
const APP_SURFACE_LIGHT = RetroFlatColors.light.bg;
const APP_SURFACE_DARK = RetroFlatColors.dark.bg;

/** 언어별 이미지가 보이기 시작한 뒤 최소 표시 시간. */
const MIN_SPLASH_MS = 1000;

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* 이미 숨겨진 경우 무시 */
});

export default function RootLayout() {
  const hasPendingAlert = useAppAlertStore((state) => state.queue.length > 0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [splashImageReady, setSplashImageReady] = useState(false);
  const [splashMinimumElapsed, setSplashMinimumElapsed] = useState(false);
  const handleSplashReady = useCallback(() => setSplashImageReady(true), []);

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
  const [iconsReady, setIconsReady] = useState(false);
  useEffect(() => {
    let active = true;
    // Keep startup bounded even if an asset fails or a development server stalls.
    const timeout = setTimeout(() => { if (active) setIconsReady(true); }, 2000);
    void Promise.allSettled([prepareIllustrations(), prepareSurfaceTextures(), prepareRhythmArtwork()]).finally(() => {
      clearTimeout(timeout);
      if (active) setIconsReady(true);
    });
    return () => { active = false; clearTimeout(timeout); };
  }, []);
  const contentReady = appReady && fontsReady && iconsReady;
  const showSplash = !contentReady || !splashMinimumElapsed;

  useEffect(() => {
    if (!splashImageReady) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void SplashScreen.hideAsync().catch(() => {}).then(() => {
      if (cancelled) return;
      timer = setTimeout(() => setSplashMinimumElapsed(true), MIN_SPLASH_MS);
    });
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [splashImageReady]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: showSplash ? SPLASH_BACKGROUND_COLOR : rootBg }}>
        <SafeAreaProvider>
          <AppAlertRoot enabled={contentReady && !showSplash}>
            {contentReady ? (
              <ThemeProvider value={navigationTheme}>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: rootBg },
                    statusBarStyle: resolveStatusBarStyle(isDark),
                    gestureEnabled: !hasPendingAlert,
                  }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="reading-library" options={{ headerShown: false, presentation: 'card' }} />
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
                    name="daily-rhythm-settings"
                    options={{ headerShown: false, presentation: 'card', gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="guide-book"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="widget-guide"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="puzzle-guide"
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
                  <Stack.Screen
                    name="layout-settings"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
                  <Stack.Screen
                    name="notification-settings"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="announcements"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="release-notes"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="activity-session"
                    options={{ headerShown: false, presentation: 'fullScreenModal' }}
                  />
                  <Stack.Screen
                    name="puzzle-history-start"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="puzzle-history-detail"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                  <Stack.Screen
                    name="puzzle-history-album"
                    options={{ headerShown: false, presentation: 'card' }}
                  />
                </Stack>
                <AnalyticsScreenTracker />
              </ThemeProvider>
            ) : null}
            {contentReady && !showSplash && !isDark ? (
              <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { zIndex: 100, mixBlendMode: 'multiply' }]}>
                <PaperGrain opacity={0.24} />
              </View>
            ) : null}
            {showSplash ? <LocalizedSplashOverlay onReady={handleSplashReady} /> : null}
          </AppAlertRoot>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
