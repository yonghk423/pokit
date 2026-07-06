import { DEFAULT_BUILTIN_CUSTOM_FLOWS } from '../defaultPriorityCatalog';

/** dev mock seed — 히스토리·호라이즌용 카테고리 풀(기본 카탈로그 + 표준 키) */

/** 히스토리 seed에 쓰는 표준 카탈로그 키 */
export const SEED_STANDARD_CATEGORIES = [
  'healthIntake',
  'fasting',
  'reading',
  'work',
] as const;

export const SEED_CATEGORY_POOL = [
  ...SEED_STANDARD_CATEGORIES,
  ...DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => f.id),
] as const;

export const SEED_CATEGORY_LABEL_KO: Record<string, string> = {
  water: '수분섭취',
  medicine: '약 복용',
  fasting: '체중관리',
  reading: '독서',
  work: '노트',
  ...Object.fromEntries(DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => [f.id, f.displayName])),
};
