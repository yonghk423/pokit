import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useAppBootstrap } from '@app/index';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useAppBootstrap();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="day-plan" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen
            name="goal-detail-settings"
            options={{ headerShown: false, presentation: 'card' }}
          />
          <Stack.Screen name="flow-standby" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="widget-settings" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen
            name="activity-session"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
