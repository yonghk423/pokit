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

/** 웹 등 비네이티브 — 스토어·UI에서 구분용 */
export type LocalNotificationPermissionSnapshot = 'unknown' | 'undetermined' | 'granted' | 'denied';

/**
 * OS에 질의만 하고 권한 요청 다이얼로그는 띄우지 않습니다.
 * (전역 스토어 동기화·설정 화면 표시용)
 */
export async function getLocalNotificationPermissionSnapshot(): Promise<LocalNotificationPermissionSnapshot> {
  if (!isNativeNotificationPlatform()) return 'unknown';
  await ensureConfigured();
  const res = await Notifications.getPermissionsAsync();
  if (res.granted) return 'granted';
  if (res.status === 'denied') return 'denied';
  return 'undetermined';
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

/** 매일 같은 시·분에 울리는 로컬 알림 (하루 시작 등). */
export async function scheduleDailyLocalNotification(params: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  data?: Record<string, unknown>;
  /** 동일 ID로 재예약하면 기존 알림을 대체합니다. */
  identifier?: string;
}): Promise<string | null> {
  if (!isNativeNotificationPlatform()) return null;
  await ensureConfigured();

  const hour = Math.max(0, Math.min(23, Math.floor(params.hour)));
  const minute = Math.max(0, Math.min(59, Math.floor(params.minute)));

  return Notifications.scheduleNotificationAsync({
    identifier: params.identifier,
    content: {
      title: params.title,
      body: params.body,
      sound: true,
      data: params.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelScheduledNotificationByIdentifier(
  identifier: string,
): Promise<void> {
  if (!isNativeNotificationPlatform() || !identifier) return;
  await ensureConfigured();
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/** `data.eventType`이 일치하는 예약 알림을 모두 취소(고아 알림 정리). */
export async function cancelScheduledNotificationsByEventType(
  eventType: string,
): Promise<void> {
  if (!isNativeNotificationPlatform() || !eventType) return;
  await ensureConfigured();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((req) => {
        const data = req.content.data;
        return (
          data &&
          typeof data === 'object' &&
          (data as Record<string, unknown>).eventType === eventType
        );
      })
      .map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
  );
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
