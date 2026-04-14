import type { DayPlanBlock, DayPlanNotificationSettings } from '@entities/day-plan';
import { blockEndWallTimeMs, filterDayPlanFlowBlocks } from '@entities/day-plan';
import {
  cancelLocalNotificationsById,
  ensureLocalNotificationPermission,
  scheduleLocalNotification,
  sendImmediateNotification,
} from '@shared/lib/notifications';
import {
  loadDayPlanScheduledNotifications,
  saveDayPlanScheduledNotifications,
  type DayPlanScheduledNotification,
} from '@shared/lib/storage';

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function minuteOffsetToDate(dateKey: string, minuteOffset: number): Date | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const base = new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  return new Date(base.getTime() + minuteOffset * 60 * 1000);
}

function makeStartBody(block: DayPlanBlock): string {
  const title = block.title.trim();
  if (!title) return `${block.category} 플로우를 시작할 시간이에요.`;
  return `${title} 플로우를 시작할 시간이에요.`;
}

function makeEndBody(block: DayPlanBlock): string {
  const title = block.title.trim();
  if (!title) return `${block.category} 플로우 종료 시각입니다.`;
  return `${title} 플로우 종료 시각입니다.`;
}

function isFutureDate(dt: Date): boolean {
  return dt.getTime() > Date.now();
}

export async function rescheduleDayPlanNotifications(input: {
  dateKey: string;
  blocks: DayPlanBlock[];
  settings: DayPlanNotificationSettings;
  /** 완료·건너뛴 블록은 시작/종료 알림을 다시 잡지 않습니다. */
  completedBlockIds?: string[];
  skippedBlockIds?: string[];
}): Promise<boolean> {
  const prev = loadDayPlanScheduledNotifications();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((x) => x.notificationId));
  }
  saveDayPlanScheduledNotifications([]);

  if (!input.settings.startEnabled && !input.settings.endEnabled) {
    return true;
  }

  const permitted = await ensureLocalNotificationPermission();
  if (!permitted) return false;

  const rows: DayPlanScheduledNotification[] = [];
  const ordered = [...filterDayPlanFlowBlocks(input.blocks)].sort((a, b) => a.order - b.order);
  const done = new Set([...(input.completedBlockIds ?? []), ...(input.skippedBlockIds ?? [])]);

  for (const block of ordered) {
    if (done.has(block.id)) continue;

    if (input.settings.startEnabled) {
      const isReminder5m = input.settings.startTiming === '5min';
      const startOffset = isReminder5m ? block.startMinutes - 5 : block.startMinutes;
      const startAt = minuteOffsetToDate(input.dateKey, startOffset);
      if (startAt && isFutureDate(startAt)) {
        const id = await scheduleLocalNotification({
          title: '플로우 시작 알림',
          body: makeStartBody(block),
          triggerAt: startAt,
          data: {
            blockId: block.id,
            eventType: 'start',
            startNotifyKind: isReminder5m ? 'reminder5m' : 'exact',
          },
        });
        if (id) {
          rows.push({ notificationId: id, blockId: block.id, kind: 'start' });
        }
      }
    }

    if (input.settings.endEnabled) {
      const endMs = blockEndWallTimeMs(input.dateKey, block);
      const endAt = endMs != null ? new Date(endMs) : null;
      if (endAt && isFutureDate(endAt)) {
        const id = await scheduleLocalNotification({
          title: '플로우 종료 알림',
          body: makeEndBody(block),
          triggerAt: endAt,
          data: { blockId: block.id, eventType: 'end' },
        });
        if (id) {
          rows.push({ notificationId: id, blockId: block.id, kind: 'end' });
        }
      }
    }
  }

  saveDayPlanScheduledNotifications(rows);
  return true;
}

/**
 * 플로우가 "지금" 시작될 때 즉시 알림을 보냅니다.
 * (예약이 아닌 즉시 전달 — 앱 포그라운드·백그라운드 모두 배너 표시)
 */
export async function sendFlowStartNow(block: DayPlanBlock): Promise<void> {
  const permitted = await ensureLocalNotificationPermission();
  if (!permitted) return;
  const title = block.title.trim();
  const body = title
    ? `${title} 플로우가 시작됩니다.`
    : `${block.category} 플로우가 시작됩니다.`;
  await sendImmediateNotification({
    title: '플로우 시작',
    body,
    data: { blockId: block.id, eventType: 'start', startNotifyKind: 'exact' },
  });
}

export async function cancelDayPlanNotificationsForBlock(blockId: string): Promise<void> {
  if (!blockId) return;
  const prev = loadDayPlanScheduledNotifications();
  if (prev.length === 0) return;

  const remove = prev.filter((x) => x.blockId === blockId);
  if (remove.length === 0) return;

  await cancelLocalNotificationsById(remove.map((x) => x.notificationId));
  const next = prev.filter((x) => x.blockId !== blockId);
  saveDayPlanScheduledNotifications(next);
}
