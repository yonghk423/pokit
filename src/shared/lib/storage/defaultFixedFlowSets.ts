import type {
  FixedFlowSet,
  FixedFlowSetApplyRule,
  FixedFlowSetsState,
} from './fixedFlowSetsStorage';
import {
  defaultWeekdaysForApplyRule,
  type WeekdayIndex,
} from './fixedFlowWeekdays';
import {
  BUILTIN_DAILY_LIFE_FLOW_IDS,
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
};

/** 나만의 루틴 — 예시 그룹 (레거시: 기본 세트) */
export const EXAMPLE_CUSTOM_FLOW_SET_NAME = '예시 세트';
export const LEGACY_CUSTOM_FLOW_SET_NAME = '기본 세트';

/** 나만의 루틴 기본 예시 그룹 — 삭제 시 dismissedExampleCustomFlowSetIds에 기록 */
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
  BUILTIN_DAILY_LIFE_FLOW_IDS[1],
] as const;

/** 집중 루틴 예시 — 생산성 기본 루틴 (reading/work는 CATALOG_REMOVED) */
export const EXAMPLE_FOCUS_FLOW_SET_ITEM_KEYS = [BUILTIN_FOCUS_FLOW_ID] as const;

/** 레거시 집중 예시 기본 항목 — sanitize로 비워지던 reading/work */
const LEGACY_FOCUS_SET_DEFAULT_KEYS = ['reading', 'work'] as const;

/** 레거시 집중 예시 — reading/work 제거 후 임시로 넣었던 건강·금지 항목 */
const LEGACY_FOCUS_SET_HEALTH_FALLBACK_KEYS = [
  'customFlow:preset_stretching',
  'customFlow:preset_abstain',
] as const;

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

/** 나만의 루틴 예시 그룹 2개 — 없으면 추가, 이름·빈 항목은 기본값으로 보강 */
export function mergeBuiltInExampleCustomSets(
  sets: FixedFlowSet[],
  options?: { dismissedIds?: readonly string[] },
): FixedFlowSet[] {
  const dismissedIds = new Set(options?.dismissedIds ?? []);
  const defaults = createBuiltinExampleCustomFlowSets().filter((set) => !dismissedIds.has(set.id));
  const exampleIds = new Set(BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS as readonly string[]);
  const byId = new Map(sets.map((set) => [set.id, set]));

  const legacyDefault = byId.get('default');
  if (legacyDefault?.applyRule === 'manual' && !byId.has('set_example_health')) {
    byId.set('set_example_health', {
      ...legacyDefault,
      id: 'set_example_health',
      name: defaults[0]!.name,
      applyRule: 'manual',
      items:
        legacyDefault.items.length > 0 ? legacyDefault.items : defaults[0]!.items,
    });
    byId.delete('default');
  }

  const mergedExamples = defaults.map((defaultSet) => {
    const existing = byId.get(defaultSet.id);
    if (!existing) return defaultSet;
    const existingKeys = existing.items.map((item) => item.categoryKey);
    const shouldResetFocusItems =
      defaultSet.id === 'set_example_focus' &&
      (existing.items.length === 0 ||
        isSameCategoryKeySet(existingKeys, LEGACY_FOCUS_SET_DEFAULT_KEYS) ||
        isSameCategoryKeySet(existingKeys, LEGACY_FOCUS_SET_HEALTH_FALLBACK_KEYS));
    return {
      ...existing,
      name: defaultSet.name,
      applyRule: 'manual' as const,
      items:
        existing.items.length > 0 && !shouldResetFocusItems
          ? existing.items
          : defaultSet.items,
    };
  });

  const presetIds = new Set(BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]);
  const presets = sets.filter((set) => presetIds.has(set.id as (typeof BUILTIN_PRESET_SCHEDULE_SET_IDS)[number]));
  const others = sets.filter(
    (set) =>
      !presetIds.has(set.id as (typeof BUILTIN_PRESET_SCHEDULE_SET_IDS)[number]) &&
      !exampleIds.has(set.id) &&
      set.id !== 'default',
  );

  return [...presets, ...mergedExamples, ...others];
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

/** 레거시 주말 루틴 기본 항목 — reading은 CATALOG_REMOVED라 비워짐 */
const LEGACY_WEEKEND_SET_DEFAULT_KEYS = ['reading'] as const;

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
    categoryKeys: ['healthIntake', 'fasting', BUILTIN_DAILY_LIFE_FLOW_IDS[1]],
  },
  {
    id: 'set_weekend',
    name: '주말 고정 루틴',
    applyRule: 'weekend',
    categoryKeys: [
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    ],
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
    activeMealSlotsBySetId: {},
    activeSetIdsByLayoutMode: { bag: [], sections: [], spine: [] },
    activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
    sets,
    scheduledMealSlotLayoutEnabled: false,
    fixedRoutinePerModeApplyMigrated: true,
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
    const shouldResetWeekendItems =
      defaultSet.id === 'set_weekend' &&
      (existing.items.length === 0 ||
        isSameCategoryKeySet(existingKeys, LEGACY_WEEKEND_SET_DEFAULT_KEYS));
    const shouldResetEmptyPreset = existing.items.length === 0;
    return {
      ...existing,
      name: defaultSet.name,
      applyRule: defaultSet.applyRule,
      applyWeekdays: defaultSet.applyWeekdays,
      ...(shouldResetDailyItems || shouldResetWeekendItems || shouldResetEmptyPreset
        ? { items: defaultSet.items }
        : {}),
    };
  });
  const builtInIds = new Set(defaults.map((set) => set.id));
  const customSets = sets.filter((set) => !builtInIds.has(set.id));
  return [...mergedBuiltIns, ...customSets];
}
