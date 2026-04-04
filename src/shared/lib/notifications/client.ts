import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let isHandlerConfigured = false;
let isAndroidChannelConfigured = false;

function isNativeNotificationPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function ensureConfigured(): Promise<void> {
  if (!isNativeNotificationPlatform()) return;

  if (!isHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    isHandlerConfigured = true;
  }

  if (Platform.OS === 'android' && !isAndroidChannelConfigured) {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });
    isAndroidChannelConfigured = true;
  }
}

export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (!isNativeNotificationPlatform()) return false;
  await ensureConfigured();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  triggerAt: Date;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isNativeNotificationPlatform()) return null;
  await ensureConfigured();

  const triggerDate = params.triggerAt;
  if (!(triggerDate instanceof Date) || Number.isNaN(triggerDate.getTime())) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      sound: true,
      data: params.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function sendImmediateNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isNativeNotificationPlatform()) return null;
  await ensureConfigured();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      sound: true,
      data: params.data,
    },
    trigger: null,
  });
}

export async function cancelLocalNotificationsById(ids: string[]): Promise<void> {
  if (!isNativeNotificationPlatform()) return;
  for (const id of ids) {
    if (!id) continue;
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export function addLocalNotificationResponseListener(
  onResponse: (data: Record<string, unknown>) => void,
): () => void {
  if (!isNativeNotificationPlatform()) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    onResponse(data && typeof data === 'object' ? (data as Record<string, unknown>) : {});
  });
  return () => sub.remove();
}

/** 앱이 포그라운드일 때 전달된 로컬 알림(배너·시스템 트리거). */
export function addLocalNotificationReceivedListener(
  onReceived: (data: Record<string, unknown>) => void,
): () => void {
  if (!isNativeNotificationPlatform()) return () => {};
  const sub = Notifications.addNotificationReceivedListener((event) => {
    const data = event.request.content.data;
    onReceived(data && typeof data === 'object' ? (data as Record<string, unknown>) : {});
  });
  return () => sub.remove();
}
