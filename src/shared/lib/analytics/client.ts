import { Platform } from 'react-native';

/**
 * Firebase Analytics 공용 클라이언트.
 * 네이티브 모듈이 없는 빌드(Expo Go 등)에서도 앱 시작을 막지 않도록 try/catch.
 */
async function getNativeAnalytics() {
  const { getAnalytics, setAnalyticsCollectionEnabled } = await import(
    '@react-native-firebase/analytics'
  );
  const analytics = getAnalytics();
  await setAnalyticsCollectionEnabled(analytics, true);
  return analytics;
}

export async function logAppOpen(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { logAppOpen: firebaseLogAppOpen } = await import('@react-native-firebase/analytics');
    const analytics = await getNativeAnalytics();
    await firebaseLogAppOpen(analytics);
  } catch (error) {
    console.warn('[analytics] logAppOpen failed', error);
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { logEvent } = await import('@react-native-firebase/analytics');
    const analytics = await getNativeAnalytics();
    logEvent(analytics, name, params);
  } catch (error) {
    console.warn('[analytics] logEvent failed', error, name);
  }
}
