import {
  listAllCustomFlowCatalogEntries,
} from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';

/** 담기·나만의 탭 공통 — 카탈로그에서 숨기는 표준 키 */
export const CATALOG_REMOVED_KEYS = new Set<string>([
  'other',
  'vitamins',
  'posture',
  'workout',
  'walking',
  'yoga',
  'sleep',
  'breathing',
  'skincare',
  'eyerest',
  'language',
  'creative',
  'pomodoro',
  'review',
  'news',
  'organize',
  'podcast',
  'inbox',
  'work',
  'coding',
]);

/** 표준 카테고리 전체 정의(레거시 키 포함). UI 메타는 `dayPlanEditorShared` */
export const PRIORITY_CATALOG_ALL_STANDARD_KEYS = [
  'water',
  'medicine',
  'vitamins',
  'fasting',
  'stretching',
  'straightenBack',
  'neckPosture',
  'posture',
  'meditation',
  'workout',
  'walking',
  'yoga',
  'sleep',
  'breathing',
  'skincare',
  'eyerest',
  'reading',
  'study',
  'planning',
  'writing',
  'language',
  'creative',
  'deepwork',
  'journal',
  'pomodoro',
  'review',
  'news',
  'organize',
  'podcast',
  'inbox',
  'work',
  'coding',
  'other',
] as const;

/** 담기 카탈로그에 노출되는 표준 키 */
export function getPriorityCatalogStandardKeys(): string[] {
  return PRIORITY_CATALOG_ALL_STANDARD_KEYS.filter((k) => !CATALOG_REMOVED_KEYS.has(k));
}

/** 담기 + 나만의에서 허용하는 카테고리 키(표준 + 사용자 customFlow) */
export function getPriorityCatalogAllowedKeySet(): Set<string> {
  const allowed = new Set<string>(getPriorityCatalogStandardKeys());
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
    seen.add(key);
    out.push(key);
  }
  return out;
}
