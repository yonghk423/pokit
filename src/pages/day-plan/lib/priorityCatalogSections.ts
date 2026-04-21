import { PICKER_CATEGORIES, type PickerCategoryItem } from './dayPlanEditorShared';

export type { PickerCategoryItem };

/** 카탈로그에서 숨길 항목(요청 반영) */
export const CATALOG_REMOVED_KEYS = new Set<string>([
  'inbox',
  'creative',
  'writing',
  'language',
  /** 담기 카탈로그에서 제외(모호한 구분) — 기존 일정에 키가 남아 있으면 그대로 표시될 수 있음 */
  'work',
  'review',
]);

export function filterCatalogPickerCategories(cats: PickerCategoryItem[]): PickerCategoryItem[] {
  return cats.filter((c) => !CATALOG_REMOVED_KEYS.has(c.key));
}

/**
 * 고정 루틴에 넣지 않은 항목 중 「건강·몸 관리」 묶음(수분·복약·체중·스트레칭·자세).
 * 사용자 고정 루틴과 겹치지 않을 때만 이 섹션에 노출된다.
 */
export const CATALOG_HEALTH_BODY_ORDER = [
  'water',
  'medicine',
  'fasting',
  'stretching',
  'straightenBack',
  'neckPosture',
] as const satisfies ReadonlyArray<PickerCategoryItem['key']>;

/**
 * 고정·건강 묶음에 넣지 않은 나머지 — 「생산성을 높이는 도구」 권장 순서.
 */
export const CATALOG_PRODUCTIVITY_ORDER = [
  'work',
  'reading',
  'study',
  'planning',
  'writing',
  'language',
  'creative',
  'inbox',
  'other',
] as const satisfies ReadonlyArray<PickerCategoryItem['key']>;

const healthBodyOrderSet = new Set<string>(CATALOG_HEALTH_BODY_ORDER);
const productivityOrderSet = new Set<string>(CATALOG_PRODUCTIVITY_ORDER);

function orderByKeys(cats: PickerCategoryItem[], order: readonly string[]): PickerCategoryItem[] {
  const byKey = new Map(cats.map((c) => [c.key, c]));
  const out: PickerCategoryItem[] = [];
  for (const k of order) {
    const c = byKey.get(k);
    if (c) out.push(c);
  }
  return out;
}

/**
 * `PICKER_CATEGORIES` 중 아직 담기지 않은 항목을 묶는다.
 * 1) 사용자 고정 루틴 순 · 2) 건강·몸 · 3) 생산성(나머지).
 * @param userFixedRoutineOrder — 사용자가 저장한 고정 루틴 키 순서
 */
export function splitAvailableCatalogCategories(
  available: PickerCategoryItem[],
  userFixedRoutineOrder: string[],
): {
  fixedFlows: PickerCategoryItem[];
  healthBodyFlows: PickerCategoryItem[];
  productivityTools: PickerCategoryItem[];
} {
  const visibleAvailable = filterCatalogPickerCategories(available);
  const visibleFixedOrder = userFixedRoutineOrder.filter((k) => !CATALOG_REMOVED_KEYS.has(k));
  const fixedSet = new Set(visibleFixedOrder);
  const fixedFlows = orderByKeys(visibleAvailable, visibleFixedOrder);

  const afterFixed = visibleAvailable.filter((c) => !fixedSet.has(c.key));
  const healthBodyFlows = orderByKeys(afterFixed, CATALOG_HEALTH_BODY_ORDER);

  const healthSet = healthBodyOrderSet;
  const productivityCandidates = afterFixed.filter((c) => !healthSet.has(c.key));
  const productivityOrdered = orderByKeys(productivityCandidates, CATALOG_PRODUCTIVITY_ORDER);
  const orphan = productivityCandidates.filter((c) => !productivityOrderSet.has(c.key));

  return {
    fixedFlows,
    healthBodyFlows,
    productivityTools: [...productivityOrdered, ...orphan],
  };
}
