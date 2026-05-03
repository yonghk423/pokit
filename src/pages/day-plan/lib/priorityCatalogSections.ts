import {
  isSystemCatalogGroupKey,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  SYSTEM_CATALOG_GROUP_SUBTITLE_KO,
} from '@entities/day-plan';
import type {
  CustomCatalogGroup,
  CustomFlowCatalogEntry,
} from '@shared/lib/storage';

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
  /** 단일 `other` 대신 사용자 플로우(`customFlow:…`)를 반복 생성 */
  'other',
]);

export function filterCatalogPickerCategories(cats: PickerCategoryItem[]): PickerCategoryItem[] {
  return cats.filter((c) => !CATALOG_REMOVED_KEYS.has(c.key));
}

/** 시스템 그룹 「건강·몸 관리」에 속하는 표준 카탈로그 키 순서 */
export const HEALTH_GROUP_SYSTEM_ORDER = [
  'water',
  'medicine',
  'fasting',
  'stretching',
  'straightenBack',
  'neckPosture',
] as const satisfies ReadonlyArray<PickerCategoryItem['key']>;

/** 시스템 그룹 「생산성을 높이는 도구」에 속하는 표준 카탈로그 키 순서 */
export const PRODUCTIVITY_GROUP_SYSTEM_ORDER = [
  'reading',
  'study',
  'planning',
] as const satisfies ReadonlyArray<PickerCategoryItem['key']>;

const HEALTH_GROUP_KEYS = new Set<string>(HEALTH_GROUP_SYSTEM_ORDER);
const PRODUCTIVITY_GROUP_KEYS = new Set<string>(PRODUCTIVITY_GROUP_SYSTEM_ORDER);

/** 표준 카탈로그 키 → 기본 시스템 그룹 매핑 */
export function defaultSystemGroupForCatalogKey(key: string): 'health' | 'productivity' {
  if (HEALTH_GROUP_KEYS.has(key)) return 'health';
  return 'productivity';
}

function orderByKeys(cats: PickerCategoryItem[], order: readonly string[]): PickerCategoryItem[] {
  const byKey = new Map(cats.map((c) => [c.key, c]));
  const out: PickerCategoryItem[] = [];
  for (const k of order) {
    const c = byKey.get(k);
    if (c) out.push(c);
  }
  return out;
}

/** 고정 루틴 순서 — 표준 카탈로그와 `customFlow:…` 항목을 같은 키 맵에서 조회 */
function orderFixedFlows(
  visibleAvailable: PickerCategoryItem[],
  customFlowPickerItems: PickerCategoryItem[],
  order: string[],
): PickerCategoryItem[] {
  const byKey = new Map<string, PickerCategoryItem>();
  for (const c of visibleAvailable) byKey.set(c.key, c);
  for (const c of customFlowPickerItems) {
    if (c.key) byKey.set(c.key, c);
  }
  const out: PickerCategoryItem[] = [];
  for (const k of order) {
    const c = byKey.get(k);
    if (c) out.push(c);
  }
  return out;
}

export type PriorityCatalogGroupSection = {
  groupKey: string;
  title: string;
  subtitle?: string;
  items: PickerCategoryItem[];
  /** 사용자 정의 그룹은 비어 있어도 노출(편집 가능) */
  isCustomGroup: boolean;
};

export type PriorityCatalogSectionsResult = {
  fixedFlows: PickerCategoryItem[];
  groupSections: PriorityCatalogGroupSection[];
};

export type PriorityCatalogSectionsInput = {
  available: PickerCategoryItem[];
  userFixedRoutineOrder: string[];
  customFlowPickerItems: PickerCategoryItem[];
  customFlowEntries: CustomFlowCatalogEntry[];
  customGroups: CustomCatalogGroup[];
};

/**
 * 담기 카탈로그를 「내 고정 루틴」과 「상위 그룹별 항목」으로 분리한다.
 *
 * - 시스템 그룹(`health`, `productivity`)은 항목이 없어도 노출(생성성을 높이는 도구는 「루틴 만들기」 행을 항상 둠)
 * - 사용자 정의 그룹은 항목이 없어도 노출(이름·항목 편집을 위해)
 * - 표준 카탈로그 항목은 시스템 그룹에만 표시되며, `customFlow:` 항목은 자기 `groupKey` 섹션에 표시
 */
export function buildPriorityCatalogSections(
  input: PriorityCatalogSectionsInput,
): PriorityCatalogSectionsResult {
  const visibleAvailable = filterCatalogPickerCategories(input.available);
  const visibleFixedOrder = input.userFixedRoutineOrder.filter((k) => !CATALOG_REMOVED_KEYS.has(k));
  const fixedSet = new Set(visibleFixedOrder);

  const fixedFlows = orderFixedFlows(visibleAvailable, input.customFlowPickerItems, visibleFixedOrder);
  const afterFixed = visibleAvailable.filter((c) => !fixedSet.has(c.key));

  /** customFlow id → 소속 group key */
  const groupByCustomFlowId = new Map<string, string>();
  for (const e of input.customFlowEntries) {
    if (!fixedSet.has(e.id)) groupByCustomFlowId.set(e.id, e.groupKey);
  }

  const customByGroup = new Map<string, PickerCategoryItem[]>();
  const orphanCustomFlows: PickerCategoryItem[] = [];
  for (const item of input.customFlowPickerItems) {
    if (!item.key || fixedSet.has(item.key)) continue;
    const groupKey = groupByCustomFlowId.get(item.key) ?? 'productivity';
    if (
      !isSystemCatalogGroupKey(groupKey) &&
      !input.customGroups.some((g) => g.key === groupKey)
    ) {
      orphanCustomFlows.push(item);
      continue;
    }
    const list = customByGroup.get(groupKey) ?? [];
    list.push(item);
    customByGroup.set(groupKey, list);
  }

  const sections: PriorityCatalogGroupSection[] = [];

  const healthSystemItems = orderByKeys(afterFixed, HEALTH_GROUP_SYSTEM_ORDER);
  const healthCustomItems = customByGroup.get('health') ?? [];
  sections.push({
    groupKey: 'health',
    title: SYSTEM_CATALOG_GROUP_LABEL_KO.health,
    subtitle: SYSTEM_CATALOG_GROUP_SUBTITLE_KO.health,
    items: [...healthSystemItems, ...healthCustomItems],
    isCustomGroup: false,
  });

  const productivitySystemItems = orderByKeys(afterFixed, PRODUCTIVITY_GROUP_SYSTEM_ORDER);
  const productivityCustomItems = customByGroup.get('productivity') ?? [];
  /** 표준에도 시스템 그룹에도 속하지 않은 키(레거시·정의 변경 등)는 생산성 끝에 모음 */
  const productivityOrphans = afterFixed.filter(
    (c) => !HEALTH_GROUP_KEYS.has(c.key) && !PRODUCTIVITY_GROUP_KEYS.has(c.key),
  );
  sections.push({
    groupKey: 'productivity',
    title: SYSTEM_CATALOG_GROUP_LABEL_KO.productivity,
    subtitle: SYSTEM_CATALOG_GROUP_SUBTITLE_KO.productivity,
    items: [
      ...productivitySystemItems,
      ...productivityCustomItems,
      ...productivityOrphans,
      ...orphanCustomFlows,
    ],
    isCustomGroup: false,
  });

  for (const g of input.customGroups) {
    sections.push({
      groupKey: g.key,
      title: g.label,
      subtitle: undefined,
      items: customByGroup.get(g.key) ?? [],
      isCustomGroup: true,
    });
  }

  return { fixedFlows, groupSections: sections };
}

