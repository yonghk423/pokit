import {
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';
import {
  listCustomFlowCatalogEntries,
  loadCategoryReminderRules,
  loadGoalDetailCategoryConfig,
  saveCategoryReminderRules,
  type CategoryReminderRuleRow,
} from '@shared/lib/storage';

import { persistSingleCategoryReminderRule } from './persistSingleCategoryReminderRule';

/** 시간 알림 템플릿에서 실제로 울릴 시각. 템플릿이 아니면 null. */
export function enabledReminderTemplateTimes(raw: unknown): string[] | null {
  if (resolveCustomFlowTemplateKey(raw) !== 'reminder') return null;
  const cfg = normalizeReminderDetailConfig(raw);
  return cfg.reminderItems.filter((item) => item.enabled !== false).map((item) => item.time);
}

function ruleFromTimes(times: string[]): CategoryReminderRuleRow {
  if (times.length === 0) return { enabled: false, times: [] };
  return { enabled: true, times };
}

function sameRule(row: CategoryReminderRuleRow | undefined, next: CategoryReminderRuleRow): boolean {
  if (!row || row.enabled !== next.enabled || row.times.length !== next.times.length) return false;
  return row.times.every((time, index) => time === next.times[index]);
}

/** 시간 알림 템플릿 — 켜 둔 reminderItems 시각만 OS 알림 규칙에 반영 */
export async function persistReminderTemplateNotificationRule(
  categoryKey: string,
  rawConfig: unknown,
): Promise<void> {
  const times = enabledReminderTemplateTimes(rawConfig);
  if (!times) return;
  await persistSingleCategoryReminderRule(categoryKey, ruleFromTimes(times));
}

/**
 * 저장된 시간 알림 템플릿 시각으로 OS 규칙을 다시 맞춘다.
 * 오늘 탭에서 시각만 바꾸고 규칙 저장이 빠지면, 화면과 다른 시각에 울린다.
 */
export function reconcileReminderTemplateNotificationRules(): void {
  const prev = loadCategoryReminderRules();
  let next = prev;
  let changed = false;

  for (const entry of listCustomFlowCatalogEntries()) {
    const times = enabledReminderTemplateTimes(loadGoalDetailCategoryConfig(entry.id));
    if (!times) continue;
    const row = ruleFromTimes(times);
    if (sameRule(next[entry.id], row)) continue;
    next = { ...next, [entry.id]: row };
    changed = true;
  }

  if (changed) saveCategoryReminderRules(next);
}
