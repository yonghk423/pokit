import '@app/silenceKnownLogs';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { useAppAlertStore } from '@shared/lib/app-alert';
import { useAppSessionStore } from '@shared/lib/app-session';
import { AppAlertRoot } from '@shared/ui/app-alert';
import { prepareIllustrations } from '@shared/ui/icon-symbol/illustrationCache';
import { prepareRhythmArtwork } from '@pages/day-plan/lib/mateArtworkCache';
import { prepareSurfaceTextures } from '@shared/ui/surface-texture/textureCache';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperGrain } from '@shared/ui/paper-grain';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsScreenTracker } from '@app/AnalyticsScreenTracker';
import { resolveStatusBarStyle } from '@app/AppStatusBar';
import { SPLASH_BACKGROUND_COLOR, useAppBootstrap, useCityPopFonts } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { i18n } from '@shared/lib/i18n';
import { requestAppReviewIfDue } from '@shared/lib/support';

import { RetroFlatColors } from '@shared/config/retroFlat';

/** day-plan `palette`의 `c.bg`와 동일 — Stack 기본 `card` 배경 */
const APP_SURFACE_LIGHT = RetroFlatColors.light.bg;
const APP_SURFACE_DARK = RetroFlatColors.dark.bg;

/** 네이티브 시작 화면의 최소 표시 시간. */
const MIN_SPLASH_MS = 1000;

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* 이미 숨겨진 경우 무시 */
});

export default function RootLayout() {
  const hasPendingAlert = useAppAlertStore((state) => state.queue.length > 0);
  const sessionEpoch = useAppSessionStore((state) => state.epoch);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [splashMinimumElapsed, setSplashMinimumElapsed] = useState(false);

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
    const timer = setTimeout(() => setSplashMinimumElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // The native launch screen is the only splash artwork; drawing it again in JS doubles it during the hand-off.
  useEffect(() => {
    if (showSplash) return;
    void SplashScreen.hideAsync().catch(() => {});
    void requestAppReviewIfDue();
  }, [showSplash]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: showSplash ? SPLASH_BACKGROUND_COLOR : rootBg }}>
        <SafeAreaProvider>
          <AppAlertRoot enabled={contentReady && !showSplash}>
            {contentReady ? (
              <ThemeProvider key={sessionEpoch} value={navigationTheme}><TutorialGuideLayer>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: rootBg },
                    statusBarStyle: resolveStatusBarStyle(isDark),
                    gestureEnabled: !hasPendingAlert,
                  }}>
                  {/* Horizontal drags belong to card decks, never to an interactive pop of the tab host. */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
                  <Stack.Screen name="day-plan" options={{ headerShown: false, presentation: 'card', gestureEnabled: false }} />
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
                    name="daily-mate-settings"
                    options={{ headerShown: false, presentation: 'card', gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="guide-book"
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
              </TutorialGuideLayer></ThemeProvider>
            ) : null}
            {contentReady && !showSplash && !isDark ? (
              <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { zIndex: 100, mixBlendMode: 'multiply' }]}>
                <PaperGrain opacity={0.24} />
              </View>
            ) : null}
          </AppAlertRoot>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
