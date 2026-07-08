import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { resolveStatusBarStyle } from '@shared/lib/status-bar/appStatusBar';

/** 앱 테마에 맞춰 OS 상태 표시줄(시간·배터리) 대비를 선언적으로 고정한다. */
export function AppStatusBar() {
  const isDark = useColorScheme() === 'dark';
  return <StatusBar style={resolveStatusBarStyle(isDark)} />;
}

export { resolveStatusBarStyle } from '@shared/lib/status-bar/appStatusBar';
