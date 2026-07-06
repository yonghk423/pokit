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
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
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

/** 레거시 — 평일 루틴 → 데일리 루틴으로 통합 */
export const LEGACY_WEEKDAY_SET_ID = 'set_weekday';

/** 삭제·이름 변경 불가 — 데일리·주말·단식·수분·일상·금지 프리셋 */
export const BUILTIN_FIXED_FLOW_SET_IDS = [
  'set_daily',
  'set_weekend',
  'set_fasting',
  'set_water',
  'set_daily_life',
  'set_abstain',
] as const;

export const BUILTIN_PRESET_SCHEDULE_SET_IDS = [
  'set_daily',
  'set_weekend',
  'set_fasting',
  'set_water',
  'set_daily_life',
  'set_abstain',
] as const;

export const BUILTIN_WATER_SET_ID = 'set_water';

/** 제거 대상 — 요일별 루틴(그룹) */
export const REMOVED_SCHEDULED_SET_IDS = ['set_always'] as const;

const DEFAULT_SET_TEMPLATES: DefaultSetTemplate[] = [
  {
    id: 'set_daily',
    name: '데일리 루틴',
    applyRule: 'daily',
    categoryKeys: ['healthIntake', 'reading', 'work'],
  },
  {
    id: 'set_weekend',
    name: '주말 루틴',
    applyRule: 'weekend',
    categoryKeys: ['reading'],
  },
  {
    id: 'set_fasting',
    name: '체중조절',
    applyRule: 'daily',
    categoryKeys: ['fasting'],
  },
  {
    id: 'set_water',
    name: '수분 섭취',
    applyRule: 'daily',
    categoryKeys: ['water'],
  },
  {
    id: 'set_daily_life',
    name: '일상 루틴',
    applyRule: 'daily',
    categoryKeys: [...BUILTIN_DAILY_LIFE_FLOW_IDS],
  },
  {
    id: 'set_abstain',
    name: '금지 루틴',
    applyRule: 'daily',
    categoryKeys: [BUILTIN_ABSTAIN_FLOW_ID],
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
    return {
      ...existing,
      name: defaultSet.name,
      applyRule: defaultSet.applyRule,
      applyWeekdays: defaultSet.applyWeekdays,
    };
  });
  const builtInIds = new Set(defaults.map((set) => set.id));
  const customSets = sets.filter((set) => !builtInIds.has(set.id));
  return [...mergedBuiltIns, ...customSets];
}
