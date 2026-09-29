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

/** 화면 전환 — GA에 RNSScreen 대신 의미 있는 screen_name이 보이도록 합니다. */
export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const name = screenName.trim().slice(0, 100);
  if (!name) return;
  try {
    const { logScreenView: firebaseLogScreenView } = await import(
      '@react-native-firebase/analytics'
    );
    const analytics = await getNativeAnalytics();
    await firebaseLogScreenView(analytics, {
      screen_name: name,
      screen_class: (screenClass ?? name).trim().slice(0, 100),
    });
  } catch (error) {
    console.warn('[analytics] logScreenView failed', error, name);
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
