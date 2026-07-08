import {
  listAllCustomFlowCatalogEntries,
  loadHiddenStandardCatalogKeys,
} from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';

/** 담기·나만의 탭 공통 — 카탈로그에서 숨기는 표준 키 */
export const CATALOG_REMOVED_KEYS = new Set<string>(['other']);

/** 제거된 표준 키 — 기존 저장 데이터 마이그레이션용 */
export const RETIRED_STANDARD_CATALOG_KEYS = new Set<string>([
  'meditation',
  'medicine',
  'water',
]);

/** 표준 카테고리 전체 정의. UI 메타는 `dayPlanEditorShared` */
export const PRIORITY_CATALOG_ALL_STANDARD_KEYS = [
  'healthIntake',
  'fasting',
  'reading',
  'work',
  'other',
] as const;

/** 담기 카탈로그에 노출되는 표준 키 */
export function getPriorityCatalogStandardKeys(): string[] {
  return PRIORITY_CATALOG_ALL_STANDARD_KEYS.filter((k) => !CATALOG_REMOVED_KEYS.has(k));
}

/** 담기 + 나만의에서 허용하는 카테고리 키(표준 + 사용자 customFlow) */
export function getPriorityCatalogAllowedKeySet(): Set<string> {
  const allowed = new Set<string>(getPriorityCatalogStandardKeys());
  for (const hidden of loadHiddenStandardCatalogKeys()) {
    allowed.delete(hidden);
  }
  for (const entry of listAllCustomFlowCatalogEntries()) {
    const id = entry.id?.trim();
    if (id) allowed.add(id);
  }
  return allowed;
}

export function isPriorityCatalogAllowedKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  return getPriorityCatalogAllowedKeySet().has(trimmed);
}

/** 저장된 키 배열을 담기 카탈로그 기준으로 정리(순서 유지·중복 제거) */
export function filterKeysToPriorityCatalog(keys: string[]): string[] {
  const allowed = getPriorityCatalogAllowedKeySet();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key || seen.has(key) || !allowed.has(key)) continue;
    if (!isCustomFlowCategoryKey(key) && CATALOG_REMOVED_KEYS.has(key)) continue;
    if (RETIRED_STANDARD_CATALOG_KEYS.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** 저장·연동 목록용 — 레거시 water/medicine 제거 후 담기 카탈로그 기준 정리 */
export function sanitizePriorityCategoryOrderKeys(keys: readonly string[]): string[] {
  const withoutRetired = [...keys]
    .map((raw) => (typeof raw === 'string' ? raw.trim() : ''))
    .filter((key) => key && !RETIRED_STANDARD_CATALOG_KEYS.has(key));
  return filterKeysToPriorityCatalog(withoutRetired);
}

/**
 * 타임라인·시간대 연동용 — 사용자가 담기 탭에서 직접 고른 루틴만.
 * `routineCatalogSelectionKeys`가 있으면 그것을 우선하고, 없으면 담기 순서를 쓴다.
 */
export function resolveUserBagRoutineCatalogKeys(input: {
  priorityCategoryOrder: readonly string[];
  routineCatalogSelectionKeys?: readonly string[];
}): string[] {
  const catalogKeys = sanitizePriorityCategoryOrderKeys(input.routineCatalogSelectionKeys ?? []);
  if (catalogKeys.length > 0) return catalogKeys;
  return sanitizePriorityCategoryOrderKeys(input.priorityCategoryOrder);
}
