import { parseHHmmToMinutes } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  ensureLocalNotificationPermission,
  getLocalNotificationPermissionSnapshot,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadGoalDetailIncompleteReminderRule,
  loadGoalDetailIncompleteReminderScheduled,
  saveGoalDetailIncompleteReminderScheduled,
} from '@shared/lib/storage';

const MAX_SLOTS = 20;

/**
 * 설정에 저장된 시각대로, 상세 설정 미완·기록 체크 등을 떠올리게 하는 **매일 로컬 알림**을 예약합니다.
 * (집중 실행을 막지 않으며, 카테고리 알림과 동일한 방식입니다.)
 *
 * @returns 규칙이 꺼져 있거나 예약할 시각이 없으면 true. 켜 두었는데 예약에 실패하면 false.
 */
export async function syncGoalDetailIncompleteReminderNotifications(): Promise<boolean> {
  const prev = loadGoalDetailIncompleteReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  saveGoalDetailIncompleteReminderScheduled([]);

  const rule = loadGoalDetailIncompleteReminderRule();
  if (!rule.enabled || !Array.isArray(rule.times) || rule.times.length === 0) {
    await useLocalNotificationsStore.getState().refreshPermission();
    return true;
  }

  /** 부트 직후 스토어가 `unknown`인 채로 막히는 것을 막기 위해 OS 스냅샷·요청을 직접 사용 */
  let permitted = (await getLocalNotificationPermissionSnapshot()) === 'granted';
  if (!permitted) {
    permitted = await ensureLocalNotificationPermission();
  }
  await useLocalNotificationsStore.getState().refreshPermission();
  if ((await getLocalNotificationPermissionSnapshot()) !== 'granted') {
    return false;
  }

  const seen = new Set<string>();
  const slots: { slotKey: string; hour: number; minute: number }[] = [];

  for (const hhmm of rule.times) {
    if (typeof hhmm !== 'string') continue;
    const m = parseHHmmToMinutes(hhmm.trim());
    if (m === null || m >= 24 * 60) continue;
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const slotKey = `incomplete:${hhmm.trim()}`;
    if (seen.has(slotKey)) continue;
    seen.add(slotKey);
    slots.push({
      slotKey,
      hour,
      minute,
    });
  }

  const capped = slots.slice(0, MAX_SLOTS);
  if (capped.length === 0) {
    return false;
  }

  const nextRows: { slotKey: string; notificationId: string }[] = [];

  const title = '목표 상세 알림';
  const body =
    '상세 설정을 아직 하지 않았거나 기록을 남기지 않은 항목이 있을 수 있어요.';

  for (const s of capped) {
    const nid = await scheduleDailyLocalNotification({
      title,
      body,
      hour: s.hour,
      minute: s.minute,
      data: { eventType: 'goalDetailIncompleteReminder' },
    });
    if (nid) {
      nextRows.push({ slotKey: s.slotKey, notificationId: nid });
    }
  }

  saveGoalDetailIncompleteReminderScheduled(nextRows);
  return nextRows.length > 0;
}
