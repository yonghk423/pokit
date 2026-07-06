import {
  getInitialOtherDataConfig,
  getOtherCategoryResolvedDisplayLabel,
  normalizeOtherDetailConfig,
  readTrimmedOtherCustomDisplayNameFromRaw,
  registerCategoryKeyByDisplayNameResolver,
  resolveCustomFlowCategoryLabelKo,
} from '@entities/day-plan';
import {
  listCustomFlowCatalogIds,
  loadGoalDetailCategoryConfig,
} from '@shared/lib/storage';

function resolvedLabelForCategoryStorageKey(categoryKey: string, raw: unknown | null): string {
  if (categoryKey.startsWith('customFlow:')) {
    const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
    const d = cfg.displayName.trim();
    return d.length > 0 ? d : resolveCustomFlowCategoryLabelKo(categoryKey);
  }
  return getOtherCategoryResolvedDisplayLabel(raw);
}

/** 블록·일정의 표시명 문자열과 저장소 카테고리 키를 맞춘다(사용자 플로우·`other`). */
export function registerOtherCategoryResolverFromStorage(): void {
  registerCategoryKeyByDisplayNameResolver((label) => {
    const t = label.trim();
    if (!t) return null;
    for (const id of listCustomFlowCatalogIds()) {
      const raw = loadGoalDetailCategoryConfig(id);
      if (resolvedLabelForCategoryStorageKey(id, raw) === t) return id;
    }
    const otherRaw = loadGoalDetailCategoryConfig('other');
    const oc = readTrimmedOtherCustomDisplayNameFromRaw(otherRaw);
    if (oc && oc === t) return 'other';
    if (resolvedLabelForCategoryStorageKey('other', otherRaw) === t) return 'other';
    return null;
  });
}
