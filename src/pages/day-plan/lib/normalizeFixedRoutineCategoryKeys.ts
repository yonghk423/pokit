import { filterKeysToPriorityCatalog } from '@entities/day-plan';

/** 담기 카탈로그와 동일한 허용 키만 남기고 중복·공백 제거 */
export function normalizeFixedRoutineCategoryKeys(keys: string[]): string[] {
  return filterKeysToPriorityCatalog(keys);
}
