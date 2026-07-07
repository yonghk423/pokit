import type {
  FixedFlowSet,
  FixedFlowSetApplyRule,
  FixedFlowSetsState,
} from './fixedFlowSetsStorage';
import {
  defaultWeekdaysForApplyRule,
  type WeekdayIndex,
} from './fixedFlowWeekdays';
import { BUILTIN_DAILY_LIFE_FLOW_IDS } from './defaultPriorityCatalog';

function items(categoryKeys: string[]) {
  return categoryKeys.map((categoryKey) => ({ categoryKey, enabled: true }));
}

type DefaultSetTemplate = {
  id: string;
  name: string;
  applyRule: FixedFlowSetApplyRule;
  categoryKeys: string[];
};

/** 나만의 루틴 — 예시 그룹 (레거시: 기본 세트) */
export const EXAMPLE_CUSTOM_FLOW_SET_NAME = '예시 세트';
export const LEGACY_CUSTOM_FLOW_SET_NAME = '기본 세트';

export const EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS = [
  'healthIntake',
  'fasting',
  BUILTIN_DAILY_LIFE_FLOW_IDS[1],
] as const;

export function createExampleCustomFlowSetItems(): { categoryKey: string; enabled: true }[] {
  return EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS.map((categoryKey) => ({
    categoryKey,
    enabled: true as const,
  }));
}

/** 레거시 — 평일 루틴 → 데일리 루틴으로 통합 */
export const LEGACY_WEEKDAY_SET_ID = 'set_weekday';

/** 삭제·이름 변경 불가 — 데일리·주말 프리셋 */
export const BUILTIN_FIXED_FLOW_SET_IDS = ['set_daily', 'set_weekend'] as const;

export const BUILTIN_PRESET_SCHEDULE_SET_IDS = ['set_daily', 'set_weekend'] as const;

/** 제거 대상 — 요일별 루틴(그룹) */
export const REMOVED_SCHEDULED_SET_IDS = ['set_always'] as const;

/** 제거 대상 — 레거시 빌트인 프리셋(체중조절·수분·일상·금지) */
export const REMOVED_BUILTIN_PRESET_SET_IDS = [
  'set_fasting',
  'set_water',
  'set_daily_life',
  'set_abstain',
] as const;

/** 레거시 데일리 루틴 기본 항목 — 미수정 저장 데이터 마이그레이션용 */
const LEGACY_DAILY_SET_DEFAULT_KEYS = ['healthIntake', 'reading', 'work'] as const;

function isSameCategoryKeySet(keys: string[], expected: readonly string[]): boolean {
  if (keys.length !== expected.length) return false;
  const set = new Set(keys);
  return expected.every((key) => set.has(key));
}

const DEFAULT_SET_TEMPLATES: DefaultSetTemplate[] = [
  {
    id: 'set_daily',
    name: '데일리 루틴',
    applyRule: 'daily',
    categoryKeys: ['healthIntake', 'fasting', BUILTIN_DAILY_LIFE_FLOW_IDS[1]],
  },
  {
    id: 'set_weekend',
    name: '주말 루틴',
    applyRule: 'weekend',
    categoryKeys: ['reading'],
  },
];

export function isBuiltinPresetScheduleSet(
  set: Pick<FixedFlowSet, 'id' | 'applyRule'>,
): boolean {
  return (BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]).includes(set.id);
}

/** 요일별 그룹(set_always·custom 등) — 목표 상세로 이전 후 제거 */
export function shouldMigrateAwayScheduledSet(
  set: Pick<FixedFlowSet, 'id' | 'applyRule'>,
): boolean {
  if (set.applyRule === 'manual') return false;
  if (isBuiltinPresetScheduleSet(set)) return false;
  if (set.applyRule === 'daily' || set.applyRule === 'weekend') return false;
  return true;
}

/** 저장소가 비어 있을 때 넣을 기본 나만의 루틴 세트 */
export function createDefaultFixedFlowSetsState(): FixedFlowSetsState {
  const sets: FixedFlowSet[] = DEFAULT_SET_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    applyRule: template.applyRule,
    applyWeekdays: defaultWeekdaysForApplyRule(template.applyRule) as WeekdayIndex[],
    items: items(template.categoryKeys),
  }));
  return {
    activeSetIds: [],
    sets,
    scheduledMealSlotLayoutEnabled: false,
  };
}

/** 데일리·주말 빌트인 병합 — 사용자 항목은 유지, 이름·규칙은 프리셋 고정 */
export function mergeBuiltInPresetSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  const defaults = createDefaultFixedFlowSetsState().sets;
  const byId = new Map(sets.map((set) => [set.id, set]));
  const mergedBuiltIns = defaults.map((defaultSet) => {
    const existing = byId.get(defaultSet.id);
    if (!existing) return defaultSet;
    const existingKeys = existing.items.map((item) => item.categoryKey);
    const shouldResetDailyItems =
      defaultSet.id === 'set_daily' &&
      isSameCategoryKeySet(existingKeys, LEGACY_DAILY_SET_DEFAULT_KEYS);
    return {
      ...existing,
      name: defaultSet.name,
      applyRule: defaultSet.applyRule,
      applyWeekdays: defaultSet.applyWeekdays,
      ...(shouldResetDailyItems ? { items: defaultSet.items } : {}),
    };
  });
  const builtInIds = new Set(defaults.map((set) => set.id));
  const customSets = sets.filter((set) => !builtInIds.has(set.id));
  return [...mergedBuiltIns, ...customSets];
}
