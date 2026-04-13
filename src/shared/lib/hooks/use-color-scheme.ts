import { Platform } from 'react-native';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * 네이티브(iOS·Android)는 시스템 다크/라이트와 무관하게 앱 UI(배경·팔레트)를 고정한다.
 * 웹은 기존처럼 브라우저/시스템 테마를 따른다.
 */
const NATIVE_APP_COLOR_SCHEME: 'light' | 'dark' = 'light';

export function useColorScheme() {
  const system = useRNColorScheme();
  if (Platform.OS === 'web') {
    return system;
  }
  return NATIVE_APP_COLOR_SCHEME;
}
