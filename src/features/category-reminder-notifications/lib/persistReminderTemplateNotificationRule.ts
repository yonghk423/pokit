import {
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

const DISABLED_RULE: CategoryReminderRuleRow = { enabled: false, times: [] };

/** 시간 알림 템플릿 여부 (신규 생성은 중단됨). */
export function enabledReminderTemplateTimes(raw: unknown): string[] | null {
  if (resolveCustomFlowTemplateKey(raw) !== 'reminder') return null;
  return [];
}

/**
 * 시간 알림 OS 예약은 사용하지 않음. 호출 시 해당 카테고리 규칙만 끈다.
 */
export async function persistReminderTemplateNotificationRule(
  categoryKey: string,
  rawConfig: unknown,
): Promise<void> {
  if (resolveCustomFlowTemplateKey(rawConfig) !== 'reminder') return;
  await persistSingleCategoryReminderRule(categoryKey, DISABLED_RULE);
}

/**
 * 저장된 시간 알림 템플릿의 OS 규칙을 모두 끈다.
 */
export function reconcileReminderTemplateNotificationRules(): void {
  const prev = loadCategoryReminderRules();
  let next = prev;
  let changed = false;

  for (const entry of listCustomFlowCatalogEntries()) {
    const raw = loadGoalDetailCategoryConfig(entry.id);
    if (resolveCustomFlowTemplateKey(raw) !== 'reminder') continue;
    const row = prev[entry.id];
    if (row && !row.enabled && row.times.length === 0) continue;
    next = { ...next, [entry.id]: DISABLED_RULE };
    changed = true;
  }

  if (changed) saveCategoryReminderRules(next);
}
