import { categoryReminderLabelKo } from './categoryReminderCatalog';
import { isInternalAutoRoutineLabel } from './customFlowDisplayLabel';
import { PRIORITY_CATALOG_PICKER_LABELS } from './priorityCatalogPickerLabels';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import type { DayPlanBlock } from '../model/types';

/** categoryKey·영문 키·customFlow: 원문이 title로 저장된 경우 */
export function looksLikeRawCategoryKeyTitle(title: string, categoryKey?: string): boolean {
  const t = title.trim();
  if (!t) return true;
  const key = categoryKey?.trim();
  if (key && t === key) return true;
  if (t.startsWith('customFlow:')) return true;
  if (Object.prototype.hasOwnProperty.call(PRIORITY_CATALOG_PICKER_LABELS, t)) return true;
  if (isInternalAutoRoutineLabel(t)) return true;
  return false;
}

/** 카테고리 키 → 사용자 대면 한글 라벨 */
export function resolveCategoryKeyDisplayLabelKo(categoryKey: string): string {
  const key = resolvePriorityRoutineCategoryKey(categoryKey);
  if (!key) return '루틴';
  return categoryReminderLabelKo(key);
}

/** 타임라인·세션 등에서 블록 제목 표시 — 깨진 저장값을 카탈로그 라벨로 폴백 */
export function resolveDayPlanBlockDisplayTitle(
  block: Pick<DayPlanBlock, 'title' | 'categoryKey'>,
): string {
  const key = block.categoryKey?.trim();
  const title = typeof block.title === 'string' ? block.title.trim() : '';
  if (key && looksLikeRawCategoryKeyTitle(title, key)) {
    return resolveCategoryKeyDisplayLabelKo(key);
  }
  if (title) return title;
  if (key) return resolveCategoryKeyDisplayLabelKo(key);
  return '루틴';
}
