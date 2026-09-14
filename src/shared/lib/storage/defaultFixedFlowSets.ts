import type {
  FixedFlowSet,
  FixedFlowSetApplyRule,
  FixedFlowSetsState,
} from './fixedFlowSetsStorage';
import {
  defaultWeekdaysForApplyRule,
  normalizeApplyWeekdays,
  type WeekdayIndex,
} from './fixedFlowWeekdays';
import {
  BUILTIN_DAILY_CLEAN_FLOW_ID,
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_DAILY_RECYCLE_FLOW_ID,
  BUILTIN_FOCUS_FLOW_ID,
} from './defaultPriorityCatalog';

function items(categoryKeys: string[]) {
  return categoryKeys.map((categoryKey) => ({ categoryKey, enabled: true }));
}

type DefaultSetTemplate = {
  id: string;
  name: string;
  applyRule: FixedFlowSetApplyRule;
  categoryKeys: string[];
  titleMarkColor?: string | null;
};

/** 나만의 루틴 — 예시 그룹 (레거시: 기본 세트) */
export const EXAMPLE_CUSTOM_FLOW_SET_NAME = '예시 세트';
export const LEGACY_CUSTOM_FLOW_SET_NAME = '기본 세트';

/** 나만의 루틴에서 뺀 기본 예시 그룹 — 기존 저장 데이터 제거·표시명용 */
export const BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS = [
  'set_example_health',
  'set_example_focus',
] as const;

export const BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES: Record<
  (typeof BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS)[number],
  string
> = {
  set_example_health: '건강 루틴 예시',
  set_example_focus: '집중 루틴 예시',
};

export const EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS = [
  'healthIntake',
  'fasting',
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
] as const;

/** 집중 루틴 예시 — 생산성 기본 루틴 (reading/work는 CATALOG_REMOVED) */
export const EXAMPLE_FOCUS_FLOW_SET_ITEM_KEYS = [BUILTIN_FOCUS_FLOW_ID] as const;

const BUILTIN_EXAMPLE_CUSTOM_SET_TEMPLATES: DefaultSetTemplate[] = [
  {
    id: 'set_example_health',
    name: BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES.set_example_health,
    applyRule: 'manual',
    categoryKeys: [...EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS],
  },
  {
    id: 'set_example_focus',
    name: BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES.set_example_focus,
    applyRule: 'manual',
    categoryKeys: [...EXAMPLE_FOCUS_FLOW_SET_ITEM_KEYS],
  },
];

export function createExampleCustomFlowSetItems(): { categoryKey: string; enabled: true }[] {
  return EXAMPLE_CUSTOM_FLOW_SET_ITEM_KEYS.map((categoryKey) => ({
    categoryKey,
    enabled: true as const,
  }));
}

export function isBuiltinExampleCustomFlowSet(
  set: Pick<FixedFlowSet, 'id'>,
): boolean {
  return (BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS as readonly string[]).includes(set.id);
}

export function createBuiltinExampleCustomFlowSets(): FixedFlowSet[] {
  return BUILTIN_EXAMPLE_CUSTOM_SET_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    applyRule: 'manual',
    applyWeekdays: defaultWeekdaysForApplyRule('manual') as WeekdayIndex[],
    items: items(template.categoryKeys),
  }));
}

const RETIRED_EXAMPLE_OR_LEGACY_DEFAULT_IDS = new Set<string>([
  ...BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS,
  'default',
]);

/** 건강·집중 루틴 예시와 레거시 `default` 세트를 목록에서 뺀다 */
export function mergeBuiltInExampleCustomSets(
  sets: FixedFlowSet[],
  _options?: { dismissedIds?: readonly string[] },
): FixedFlowSet[] {
  const presetIds = new Set(BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]);
  const presets = sets.filter((set) =>
    presetIds.has(set.id as (typeof BUILTIN_PRESET_SCHEDULE_SET_IDS)[number]),
  );
  const others = sets.filter(
    (set) =>
      !presetIds.has(set.id as (typeof BUILTIN_PRESET_SCHEDULE_SET_IDS)[number]) &&
      !RETIRED_EXAMPLE_OR_LEGACY_DEFAULT_IDS.has(set.id),
  );
  return [...presets, ...others];
}

/** 레거시 — 평일 루틴 → 데일리 루틴으로 통합 */
export const LEGACY_WEEKDAY_SET_ID = 'set_weekday';

/** 데일리·주말 빌트인 프리셋 id — 스케줄 규칙(daily/weekend) 식별용 */
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
const LEGACY_DAILY_SET_WITH_CLEAN_KEYS = [
  'healthIntake',
  'fasting',
  BUILTIN_DAILY_CLEAN_FLOW_ID,
] as const;

/** 레거시 주말 루틴 기본 항목 — reading은 CATALOG_REMOVED라 비워짐 */
const LEGACY_WEEKEND_SET_DEFAULT_KEYS = ['reading'] as const;
const LEGACY_WEEKEND_SET_WITH_RECYCLE_KEYS = [
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_DAILY_RECYCLE_FLOW_ID,
] as const;

function isSameCategoryKeySet(keys: string[], expected: readonly string[]): boolean {
  if (keys.length !== expected.length) return false;
  const set = new Set(keys);
  return expected.every((key) => set.has(key));
}

const DEFAULT_SET_TEMPLATES: DefaultSetTemplate[] = [
  {
    id: 'set_daily',
    name: '데일리 고정 루틴',
    applyRule: 'daily',
    categoryKeys: ['healthIntake', 'fasting'],
    titleMarkColor: 'yellow',
  },
  {
    id: 'set_weekend',
    name: '주말 고정 루틴',
    applyRule: 'weekend',
    categoryKeys: [BUILTIN_DAILY_EXERCISE_FLOW_ID],
    titleMarkColor: 'lavender',
  },
];

export function isBuiltinPresetScheduleSet(
  set: Pick<FixedFlowSet, 'id' | 'applyRule'>,
): boolean {
  return (BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]).includes(set.id);
}

/** 레거시 요일 그룹(set_always·weekday 등) — 목표 상세로 이전 후 제거. custom은 유지 */
export function shouldMigrateAwayScheduledSet(
  set: Pick<FixedFlowSet, 'id' | 'applyRule'>,
): boolean {
  if (set.applyRule === 'manual' || set.applyRule === 'custom') return false;
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
    ...(template.titleMarkColor !== undefined
      ? { titleMarkColor: template.titleMarkColor }
      : {}),
  }));
  return {
    activeSetIds: [],
    activeMealSlotsBySetId: {},
    activeSetIdsByLayoutMode: { bag: [], sections: [], spine: [] },
    activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
    sets,
    scheduledMealSlotLayoutEnabled: false,
    fixedRoutinePerModeApplyMigrated: true,
  };
}

/** 데일리·주말 빌트인 병합 — 사용자 항목·이름·적용 요일 유지, 규칙은 프리셋 고정 */
export function mergeBuiltInPresetSets(
  sets: FixedFlowSet[],
  options?: { dismissedIds?: readonly string[] },
): FixedFlowSet[] {
  const dismissedIds = new Set(options?.dismissedIds ?? []);
  const defaults = createDefaultFixedFlowSetsState().sets.filter(
    (set) => !dismissedIds.has(set.id),
  );
  const byId = new Map(sets.map((set) => [set.id, set]));
  const mergedBuiltIns = defaults.map((defaultSet) => {
    const existing = byId.get(defaultSet.id);
    if (!existing) return defaultSet;
    const existingKeys = existing.items.map((item) => item.categoryKey);
    const shouldResetDailyItems =
      defaultSet.id === 'set_daily' &&
      (isSameCategoryKeySet(existingKeys, LEGACY_DAILY_SET_DEFAULT_KEYS) ||
        isSameCategoryKeySet(existingKeys, LEGACY_DAILY_SET_WITH_CLEAN_KEYS));
    const shouldResetWeekendItems =
      defaultSet.id === 'set_weekend' &&
      (existing.items.length === 0 ||
        isSameCategoryKeySet(existingKeys, LEGACY_WEEKEND_SET_DEFAULT_KEYS) ||
        isSameCategoryKeySet(existingKeys, LEGACY_WEEKEND_SET_WITH_RECYCLE_KEYS));
    const shouldResetEmptyPreset = existing.items.length === 0;
    const storedName = existing.name.trim();
    const hasExplicitTitleMark = Object.prototype.hasOwnProperty.call(
      existing,
      'titleMarkColor',
    );
    return {
      ...existing,
      name: storedName.length > 0 ? storedName : defaultSet.name,
      applyRule: defaultSet.applyRule,
      // 사용자가 고른 적용 요일 유지 (비어 있을 때만 프리셋 기본)
      applyWeekdays:
        normalizeApplyWeekdays(existing.applyWeekdays).length > 0
          ? normalizeApplyWeekdays(existing.applyWeekdays)
          : defaultSet.applyWeekdays,
      titleMarkColor: hasExplicitTitleMark
        ? existing.titleMarkColor ?? null
        : (defaultSet.titleMarkColor ?? null),
      ...(shouldResetDailyItems || shouldResetWeekendItems || shouldResetEmptyPreset
        ? { items: defaultSet.items }
        : {}),
    };
  });
  const builtInIds = new Set(
    (BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]).map((id) => id),
  );
  const customSets = sets.filter((set) => !builtInIds.has(set.id));
  return [...mergedBuiltIns, ...customSets];
}
