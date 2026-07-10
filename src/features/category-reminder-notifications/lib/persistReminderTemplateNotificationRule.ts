import {
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';

import { persistSingleCategoryReminderRule } from './persistSingleCategoryReminderRule';

function isDefaultReminderOnly(raw: unknown): boolean {
  const cfg = normalizeReminderDetailConfig(raw);
  return (
    cfg.reminderItems.length === 1 &&
    cfg.reminderItems[0]?.time === '09:00' &&
    !cfg.reminderItems[0]?.label.trim()
  );
}

/** 시간 알림 템플릿 — 설정한 reminderItems 시각을 OS 시작 알림 규칙에 반영 */
export async function persistReminderTemplateNotificationRule(
  categoryKey: string,
  rawConfig: unknown,
): Promise<void> {
  if (resolveCustomFlowTemplateKey(rawConfig) !== 'reminder') return;
  const cfg = normalizeReminderDetailConfig(rawConfig);
  const times = cfg.reminderItems.map((item) => item.time);
  if (times.length === 0 || isDefaultReminderOnly(cfg)) {
    await persistSingleCategoryReminderRule(categoryKey, { enabled: false, times: [] });
    return;
  }
  await persistSingleCategoryReminderRule(categoryKey, { enabled: true, times });
}
