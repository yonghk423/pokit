import { PICKER_CATEGORIES } from './dayPlanEditorShared';

const pickerKeySet = new Set(PICKER_CATEGORIES.map((c) => c.key));

/** 담기에 존재하는 키만 남기고 중복·공백 제거 */
export function normalizeFixedRoutineCategoryKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const t = typeof k === 'string' ? k.trim() : '';
    if (!t || !pickerKeySet.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
