import {
  getOtherCategoryResolvedDisplayLabel,
  getPriorityCatalogPickerLabel,
  isCustomFlowCategoryKey,
  isInternalAutoRoutineLabel,
  resolveCustomFlowCategoryLabelKo,
} from '@entities/day-plan';

import type { GoalDetailCategoryKey } from '../../../model/types';

/** 편집 UI에 쓸 기본 이름 — 저장된 `displayName`이 비어 있을 때 표시·수정 시작점 */
export function resolveRoutineTitleFallback(
  categoryKey: GoalDetailCategoryKey | undefined,
  rhythmTitle: string,
): string {
  const fromRhythm = rhythmTitle.trim();
  if (fromRhythm && !isInternalAutoRoutineLabel(fromRhythm)) return fromRhythm;
  if (!categoryKey || categoryKey === 'other') {
    return getOtherCategoryResolvedDisplayLabel(null);
  }
  if (isCustomFlowCategoryKey(categoryKey)) {
    return resolveCustomFlowCategoryLabelKo(categoryKey);
  }
  return getPriorityCatalogPickerLabel(categoryKey);
}
