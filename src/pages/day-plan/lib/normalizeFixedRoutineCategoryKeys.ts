import { isCustomFlowCategoryKey } from '@entities/day-plan';

import { PICKER_CATEGORIES } from './dayPlanEditorShared';

const pickerKeySet = new Set(PICKER_CATEGORIES.map((c) => c.key));

/** 담기에 존재하는 키만 남기고 중복·공백 제거 */
export function normalizeFixedRoutineCategoryKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const t = typeof k === 'string' ? k.trim() : '';
    if (!t || seen.has(t)) continue;
    if (isCustomFlowCategoryKey(t) || pickerKeySet.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
