/** 시스템 그룹 「건강·몸 관리」에 속하는 표준 카탈로그 키 순서 */
export const HEALTH_GROUP_SYSTEM_ORDER = [
  'water',
  'medicine',
  'fasting',
  'stretching',
  'straightenBack',
  'neckPosture',
  'meditation',
] as const;

/** 시스템 그룹 「생산성을 높이는 도구」에 속하는 표준 카탈로그 키 순서 */
export const PRODUCTIVITY_GROUP_SYSTEM_ORDER = [
  'reading',
  'study',
  'planning',
  'writing',
  'deepwork',
  'journal',
] as const;

const HEALTH_GROUP_KEYS = new Set<string>(HEALTH_GROUP_SYSTEM_ORDER);
const PRODUCTIVITY_GROUP_KEYS = new Set<string>(PRODUCTIVITY_GROUP_SYSTEM_ORDER);

/** 표준 카탈로그 키 → 기본 시스템 그룹 매핑 */
export function defaultSystemGroupForCatalogKey(key: string): 'health' | 'productivity' {
  if (HEALTH_GROUP_KEYS.has(key)) return 'health';
  return 'productivity';
}

export function isDefaultHealthCatalogKey(key: string): boolean {
  return HEALTH_GROUP_KEYS.has(key);
}

export function isDefaultProductivityCatalogKey(key: string): boolean {
  return PRODUCTIVITY_GROUP_KEYS.has(key);
}
