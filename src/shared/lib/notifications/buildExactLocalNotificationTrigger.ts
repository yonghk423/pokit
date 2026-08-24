import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** 일정 알림 전용 채널 — 기존 `default`(DEFAULT importance)는 기기에서 중요도를 바꿀 수 없음 */
export const REMINDER_NOTIFICATION_CHANNEL_ID = 'pokit-reminders';

/**
 * 지정한 절대 시각에 맞춰 로컬 알림 트리거를 만든다.
 *
 * iOS `DATE` 트리거는 네이티브에서 `UNTimeIntervalNotificationTrigger`(몇 초 뒤)로
 * 변환되어, 시스템이 15분 단위로 미루는 경우가 있다. 시각을 지키려면
 * 연·월·일·시·분이 있는 캘린더 트리거가 필요하다.
 */
export function buildExactLocalNotificationTrigger(
  triggerAt: Date,
): Notifications.NotificationTriggerInput {
  if (Platform.OS === 'ios') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      repeats: false,
      year: triggerAt.getFullYear(),
      month: triggerAt.getMonth() + 1,
      day: triggerAt.getDate(),
      hour: triggerAt.getHours(),
      minute: triggerAt.getMinutes(),
      second: triggerAt.getSeconds(),
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerAt,
    channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
  };
}
