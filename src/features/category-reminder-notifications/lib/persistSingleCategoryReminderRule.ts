import type { CategoryReminderRuleRow } from '@shared/lib/storage';
import { loadCategoryReminderRules, saveCategoryReminderRules } from '@shared/lib/storage';

import { syncCategoryReminderNotifications } from '../model/syncCategoryReminderNotifications';

/** 한 카테고리만 갱신하고 나머지 규칙은 유지한 뒤 OS 예약을 다시 맞춘다. */
export async function persistSingleCategoryReminderRule(
  categoryKey: string,
  row: CategoryReminderRuleRow,
): Promise<void> {
  const prev = loadCategoryReminderRules();
  saveCategoryReminderRules({ ...prev, [categoryKey]: row });
  await syncCategoryReminderNotifications();
}
