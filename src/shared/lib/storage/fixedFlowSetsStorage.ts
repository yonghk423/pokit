import { normalizeCategoryMealSlots, normalizeDayMealSlot, resolveFixedFlowItemMealSlot, type DayMealSlot } from './dayMealSlot';
import {
  BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS,
  LEGACY_WEEKDAY_SET_ID,
  LEGACY_CUSTOM_FLOW_SET_NAME,
  EXAMPLE_CUSTOM_FLOW_SET_NAME,
  REMOVED_BUILTIN_PRESET_SET_IDS,
  createExampleCustomFlowSetItems,
  isBuiltinExampleCustomFlowSet,
  isBuiltinPresetScheduleSet,
  mergeBuiltInExampleCustomSets,
  mergeBuiltInPresetSets,
  shouldMigrateAwayScheduledSet,
} from './defaultFixedFlowSets';
import {
  defaultWeekdaysForApplyRule,
  isApplyWeekdayMatchedToday,
  normalizeApplyWeekdays,
  resolveApplyWeekdays,
  type WeekdayIndex,
} from './fixedFlowWeekdays';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type { DayMealSlot } from './dayMealSlot';

export type FixedFlowSetApplyRule =
  | 'manual'
  | 'weekday'
  | 'weekend'
  | 'daily'
  | 'always'
  | 'custom';

export type FixedFlowSetItem = {
  categoryKey: string;
  enabled: boolean;
  /** 나만의 루틴 — 아침·점심·저녁 등 시간대 구간 (단일, 레거시) */
  mealSlot?: DayMealSlot;
  /** 나만의 루틴 — 복수 시간대 구간 */
  mealSlots?: DayMealSlot[];
  /** 타임라인 보기 — 시작·종료(분, 0~1440) */
  spineStartMinutes?: number;
  spineEndMinutes?: number;
  /** 종료가 다음 달력일인 경우 (시계 시각의 전후와 무관) */
  spineEndsNextCalendarDay?: boolean;
};

export type FixedFlowSet = {
  id: string;
  name: string;
  applyRule: FixedFlowSetApplyRule;
  applyWeekdays?: WeekdayIndex[];
  items: FixedFlowSetItem[];
  /** 데일리·주말 — 사용자가 연 빈 시간대 구간(아침 등) */
  pinnedMealSlots?: DayMealSlot[];
};

export type FixedRoutineApplyLayoutMode = 'bag' | 'sections' | 'spine';

export const FIXED_ROUTINE_APPLY_LAYOUT_MODES: readonly FixedRoutineApplyLayoutMode[] = [
  'bag',
  'sections',
  'spine',
] as const;

export type FixedRoutineActiveSetIdsByLayoutMode = Record<FixedRoutineApplyLayoutMode, string[]>;

export type FixedRoutineActiveMealSlotsByLayoutMode = Record<
  FixedRoutineApplyLayoutMode,
  Record<string, DayMealSlot[]>
>;

export type FixedFlowSetsState = {
  /**
   * 현재 `fixedRoutineApplyLayoutMode`에 대응하는 적용 세트.
   * 실제 저장 진실은 `activeSetIdsByLayoutMode` — 하위 호환용 미러.
   */
  activeSetIds: string[];
  /** 현재 모드의 preset 구간별 오늘 적용 슬롯 미러 */
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  /** 목록·시간대·타임라인 모드별 오늘 적용 그룹 */
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode;
  /** 모드별 preset 구간 오늘 적용 슬롯 */
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode;
  sets: FixedFlowSet[];
  /** 데일리·주말 고정 루틴 — 시간대 구간 레이아웃 (기본: 목록) */
  scheduledMealSlotLayoutEnabled?: boolean;
  /** 사용자가 삭제한 나만의 루틴 예시 그룹 id — 재생성 방지 */
  dismissedExampleCustomFlowSetIds?: string[];
  /** 고정 루틴 화면에서 편집 중인 보기 모드 */
  fixedRoutineApplyLayoutMode?: FixedRoutineApplyLayoutMode;
  /**
   * 모드별 적용 분리 마이그레이션 완료 여부.
   * 이전에는 단일 activeSetIds를 세 모드에 복제했음 → 한 번만 현재 모드로 축소.
   */
  fixedRoutinePerModeApplyMigrated?: boolean;
};

type PersistedShape = Partial<FixedFlowSetsState> & {
  /** 레거시 단일 적용 id — 읽기 전용 마이그레이션 */
  activeSetId?: string | null;
  activeSetIdsByLayoutMode?: Partial<FixedRoutineActiveSetIdsByLayoutMode> | unknown;
  activeMealSlotsBySetIdByLayoutMode?: Partial<FixedRoutineActiveMealSlotsByLayoutMode> | unknown;
};

const FALLBACK_SET_NAME = EXAMPLE_CUSTOM_FLOW_SET_NAME;

const VALID_APPLY_RULES = new Set<FixedFlowSetApplyRule>([
  'manual',
  'weekday',
  'weekend',
  'daily',
  'always',
  'custom',
]);

function normalizeApplyRule(raw: unknown): FixedFlowSetApplyRule {
  if (typeof raw !== 'string') return 'manual';
  const next = raw.trim() as FixedFlowSetApplyRule;
  return VALID_APPLY_RULES.has(next) ? next : 'manual';
}

function normalizeSpineMinutes(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  const m = Math.floor(raw);
  if (m < 0 || m > 24 * 60) return undefined;
  return m;
}

function normalizeItems(raw: unknown): FixedFlowSetItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedFlowSetItem[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const key = typeof r.categoryKey === 'string' ? r.categoryKey.trim() : '';
    if (!key || seen.has(key)) continue;
    const mealSlots = normalizeCategoryMealSlots(
      r.mealSlots !== undefined ? r.mealSlots : r.mealSlot,
    );
    const spineStartMinutes = normalizeSpineMinutes(r.spineStartMinutes);
    const spineEndMinutes = normalizeSpineMinutes(r.spineEndMinutes);
    const spineEndsNextCalendarDay = r.spineEndsNextCalendarDay === true;
    const hasValidSpine =
      spineStartMinutes !== undefined &&
      spineEndMinutes !== undefined &&
      (spineEndsNextCalendarDay
        ? spineStartMinutes < 24 * 60 &&
          spineEndMinutes < 24 * 60 &&
          24 * 60 - spineStartMinutes + spineEndMinutes > 0
        : spineEndMinutes > spineStartMinutes);
    out.push({
      categoryKey: key,
      enabled: r.enabled !== false,
      ...(mealSlots.length === 1 ? { mealSlot: mealSlots[0] } : {}),
      ...(mealSlots.length > 0 ? { mealSlots } : {}),
      ...(hasValidSpine
        ? {
            spineStartMinutes,
            spineEndMinutes,
            ...(spineEndsNextCalendarDay ? { spineEndsNextCalendarDay: true as const } : {}),
          }
        : {}),
    });
    seen.add(key);
  }
  return out;
}

function normalizePinnedMealSlots(raw: unknown): DayMealSlot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const slots = [
    ...new Set(raw.map((slot) => normalizeDayMealSlot(slot)).filter(Boolean)),
  ] as DayMealSlot[];
  return slots.length > 0 ? slots : undefined;
}

function normalizeSets(raw: unknown): FixedFlowSet[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedFlowSet[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    if (!id || seen.has(id)) continue;
    const nameRaw = typeof r.name === 'string' ? r.name.trim() : '';
    const name = nameRaw.length > 0 ? nameRaw.slice(0, 24) : FALLBACK_SET_NAME;
    const applyRule = normalizeApplyRule(r.applyRule);
    const applyWeekdaysRaw = normalizeApplyWeekdays(r.applyWeekdays);
    const applyWeekdays =
      applyWeekdaysRaw.length > 0 ? applyWeekdaysRaw : defaultWeekdaysForApplyRule(applyRule);
    const items = normalizeItems(r.items);
    const pinnedMealSlots =
      isBuiltinPresetScheduleSet({ id, applyRule }) && applyRule !== 'manual'
        ? normalizePinnedMealSlots(r.pinnedMealSlots)
        : undefined;
    out.push({
      id,
      name,
      applyRule,
      applyWeekdays: applyRule === 'manual' ? applyWeekdaysRaw : applyWeekdays,
      items,
      ...(pinnedMealSlots ? { pinnedMealSlots } : {}),
    });
    seen.add(id);
  }
  return out;
}

function mergeSetItems(
  primary: FixedFlowSetItem[],
  secondary: FixedFlowSetItem[],
): FixedFlowSetItem[] {
  const map = new Map<string, FixedFlowSetItem>();
  for (const item of [...primary, ...secondary]) {
    const key = item.categoryKey.trim();
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, {
      categoryKey: key,
      enabled: prev?.enabled !== false && item.enabled !== false,
      mealSlot: item.mealSlot ?? prev?.mealSlot,
      mealSlots: item.mealSlots ?? prev?.mealSlots,
      spineStartMinutes: item.spineStartMinutes ?? prev?.spineStartMinutes,
      spineEndMinutes: item.spineEndMinutes ?? prev?.spineEndMinutes,
      spineEndsNextCalendarDay:
        item.spineEndsNextCalendarDay ?? prev?.spineEndsNextCalendarDay,
    });
  }
  return [...map.values()];
}

/** 평일 루틴(set_weekday) → 데일리 루틴(set_daily) 통합 */
function migrateLegacyBuiltInSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  const weekdayLegacy = sets.find((set) => set.id === LEGACY_WEEKDAY_SET_ID);
  if (!weekdayLegacy) {
    return sets.filter((set) => set.id !== LEGACY_WEEKDAY_SET_ID);
  }

  const withoutWeekday = sets.filter((set) => set.id !== LEGACY_WEEKDAY_SET_ID);
  const dailyIdx = withoutWeekday.findIndex((set) => set.id === 'set_daily');
  if (dailyIdx < 0) {
    return withoutWeekday;
  }

  const daily = withoutWeekday[dailyIdx];
  withoutWeekday[dailyIdx] = {
    ...daily,
    name: '데일리 고정 루틴',
    applyRule: 'daily',
    applyWeekdays: defaultWeekdaysForApplyRule('daily'),
    items: mergeSetItems(daily.items, weekdayLegacy.items),
  };
  return withoutWeekday;
}

/** 나만의 루틴 예시 그룹 — 이름 변경·빈 항목 시 예시 채우기 */
function migrateExampleCustomFlowSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  return sets.map((set) => {
    if (set.applyRule !== 'manual') return set;
    const isLegacyName = set.name === LEGACY_CUSTOM_FLOW_SET_NAME;
    const isExampleName = set.name === EXAMPLE_CUSTOM_FLOW_SET_NAME;
    if (!isLegacyName && !isExampleName) return set;
    const name = isLegacyName ? EXAMPLE_CUSTOM_FLOW_SET_NAME : set.name;
    const items = set.items.length > 0 ? set.items : createExampleCustomFlowSetItems();
    if (name === set.name && items === set.items) return set;
    return { ...set, name, items };
  });
}

function hadExampleCustomFlowSetMigration(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    if (normalizeApplyRule(r.applyRule) !== 'manual') return false;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (name === LEGACY_CUSTOM_FLOW_SET_NAME) return true;
    if (name === EXAMPLE_CUSTOM_FLOW_SET_NAME && normalizeItems(r.items).length === 0) return true;
    return false;
  });
}

/** 레거시 빌트인 프리셋(체중조절·수분·일상·금지) 제거 */
function migrateRemovedBuiltinPresetSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  const removed = new Set(REMOVED_BUILTIN_PRESET_SET_IDS as readonly string[]);
  return sets.filter((set) => !removed.has(set.id));
}

function hadRemovedBuiltinPresetSets(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const id = typeof (row as Record<string, unknown>).id === 'string'
      ? (row as Record<string, unknown>).id.trim()
      : '';
    return (REMOVED_BUILTIN_PRESET_SET_IDS as readonly string[]).includes(id);
  });
}

/** 요일별 그룹(set_always·custom 등)만 제거 — 데일리·주말은 유지 */
function migrateRemovedScheduledSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  return sets.filter((set) => !shouldMigrateAwayScheduledSet(set));
}

function hadRemovedScheduledSets(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    const applyRule = normalizeApplyRule(r.applyRule);
    return shouldMigrateAwayScheduledSet({ id, applyRule });
  });
}

/** 레거시 자동 적용 id — activeSetIds에서 제외(마이그레이션용) */
const LEGACY_AUTO_ACTIVE_SET_IDS = new Set([
  LEGACY_WEEKDAY_SET_ID,
  'set_always',
]);

function normalizeActiveSetIds(raw: PersistedShape, sets: FixedFlowSet[]): string[] {
  const valid = new Set(sets.map((s) => s.id));
  const seen = new Set<string>();
  const out: string[] = [];

  const pushId = (id: string) => {
    if (!valid.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  if (Array.isArray(raw.activeSetIds)) {
    for (const row of raw.activeSetIds) {
      if (typeof row !== 'string') continue;
      const id = row.trim();
      if (!id || LEGACY_AUTO_ACTIVE_SET_IDS.has(id)) continue;
      pushId(id);
    }
    return out;
  }

  const legacy =
    typeof raw.activeSetId === 'string' ? raw.activeSetId.trim() : '';
  if (legacy && !LEGACY_AUTO_ACTIVE_SET_IDS.has(legacy)) {
    pushId(legacy);
  }
  return out;
}

function normalizeActiveMealSlotsBySetId(
  raw: PersistedShape,
  sets: FixedFlowSet[],
): Record<string, DayMealSlot[]> {
  const fromRaw = raw.activeMealSlotsBySetId;
  if (!fromRaw || typeof fromRaw !== 'object' || Array.isArray(fromRaw)) return {};

  const validPresetSetIds = new Set(
    sets.filter((set) => isBuiltinPresetScheduleSet(set)).map((set) => set.id),
  );
  const out: Record<string, DayMealSlot[]> = {};
  for (const [setId, slotsRaw] of Object.entries(fromRaw as Record<string, unknown>)) {
    if (!validPresetSetIds.has(setId)) continue;
    if (!Array.isArray(slotsRaw)) continue;
    const nextSlots = [...new Set(slotsRaw.map((slot) => normalizeDayMealSlot(slot)).filter(Boolean))];
    if (nextSlots.length > 0) out[setId] = nextSlots;
  }
  return out;
}

function normalizeFixedRoutineApplyLayoutMode(raw: unknown): FixedRoutineApplyLayoutMode {
  if (raw === 'bag' || raw === 'sections' || raw === 'spine') return raw;
  return 'bag';
}

function emptyActiveSetIdsByLayoutMode(): FixedRoutineActiveSetIdsByLayoutMode {
  return { bag: [], sections: [], spine: [] };
}

function emptyActiveMealSlotsByLayoutMode(): FixedRoutineActiveMealSlotsByLayoutMode {
  return { bag: {}, sections: {}, spine: {} };
}

function filterActiveSetIdsForSets(ids: readonly string[], sets: FixedFlowSet[]): string[] {
  const valid = new Set(sets.map((s) => s.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of ids) {
    const id = typeof row === 'string' ? row.trim() : '';
    if (!id || !valid.has(id) || seen.has(id) || LEGACY_AUTO_ACTIVE_SET_IDS.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function filterActiveMealSlotsForSets(
  slotsBySetId: Record<string, DayMealSlot[]>,
  sets: FixedFlowSet[],
): Record<string, DayMealSlot[]> {
  const validPresetSetIds = new Set(
    sets.filter((set) => isBuiltinPresetScheduleSet(set)).map((set) => set.id),
  );
  const out: Record<string, DayMealSlot[]> = {};
  for (const [setId, slots] of Object.entries(slotsBySetId)) {
    if (!validPresetSetIds.has(setId) || !Array.isArray(slots)) continue;
    const nextSlots = [...new Set(slots.map((slot) => normalizeDayMealSlot(slot)).filter(Boolean))];
    if (nextSlots.length > 0) out[setId] = nextSlots;
  }
  return out;
}

function normalizeActiveSetIdsByLayoutMode(
  raw: PersistedShape,
  sets: FixedFlowSet[],
  legacyActiveSetIds: string[],
  currentMode: FixedRoutineApplyLayoutMode,
): FixedRoutineActiveSetIdsByLayoutMode {
  const fromRaw = raw.activeSetIdsByLayoutMode;
  if (fromRaw && typeof fromRaw === 'object' && !Array.isArray(fromRaw)) {
    const row = fromRaw as Record<string, unknown>;
    const out = emptyActiveSetIdsByLayoutMode();
    for (const mode of FIXED_ROUTINE_APPLY_LAYOUT_MODES) {
      // 모드 키가 없으면 빈 배열 — 레거시 단일 목록을 다른 모드에 복제하지 않음
      const ids = Array.isArray(row[mode]) ? (row[mode] as unknown[]) : [];
      out[mode] = filterActiveSetIdsForSets(
        ids.map((id) => (typeof id === 'string' ? id : '')),
        sets,
      );
    }
    return out;
  }
  // 레거시: 단일 activeSetIds는 당시 편집 모드에만 두고 나머지는 비움
  const seed = filterActiveSetIdsForSets(legacyActiveSetIds, sets);
  const out = emptyActiveSetIdsByLayoutMode();
  out[currentMode] = [...seed];
  return out;
}

function normalizeActiveMealSlotsByLayoutMode(
  raw: PersistedShape,
  sets: FixedFlowSet[],
  legacySlots: Record<string, DayMealSlot[]>,
  currentMode: FixedRoutineApplyLayoutMode,
): FixedRoutineActiveMealSlotsByLayoutMode {
  const fromRaw = raw.activeMealSlotsBySetIdByLayoutMode;
  if (fromRaw && typeof fromRaw === 'object' && !Array.isArray(fromRaw)) {
    const row = fromRaw as Record<string, unknown>;
    const out = emptyActiveMealSlotsByLayoutMode();
    for (const mode of FIXED_ROUTINE_APPLY_LAYOUT_MODES) {
      const modeRaw = row[mode];
      const source =
        modeRaw && typeof modeRaw === 'object' && !Array.isArray(modeRaw)
          ? (modeRaw as Record<string, DayMealSlot[]>)
          : {};
      out[mode] = filterActiveMealSlotsForSets(source, sets);
    }
    return out;
  }
  const seed = filterActiveMealSlotsForSets(legacySlots, sets);
  const out = emptyActiveMealSlotsByLayoutMode();
  out[currentMode] = { ...seed };
  return out;
}

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function sameMealSlotsMaps(
  a: Record<string, DayMealSlot[]>,
  b: Record<string, DayMealSlot[]>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => sameIdList(a[key] ?? [], b[key] ?? []));
}

/** 세 모드에 동일 복제된 적용 상태를 현재 모드만 남기고 분리 */
function splitIdenticalPerModeApply(
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode,
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode,
  currentMode: FixedRoutineApplyLayoutMode,
): {
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode;
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode;
} {
  const idsIdentical =
    sameIdList(activeSetIdsByLayoutMode.bag, activeSetIdsByLayoutMode.sections) &&
    sameIdList(activeSetIdsByLayoutMode.sections, activeSetIdsByLayoutMode.spine);
  const slotsIdentical =
    sameMealSlotsMaps(
      activeMealSlotsBySetIdByLayoutMode.bag,
      activeMealSlotsBySetIdByLayoutMode.sections,
    ) &&
    sameMealSlotsMaps(
      activeMealSlotsBySetIdByLayoutMode.sections,
      activeMealSlotsBySetIdByLayoutMode.spine,
    );
  if (!idsIdentical || !slotsIdentical) {
    return { activeSetIdsByLayoutMode, activeMealSlotsBySetIdByLayoutMode };
  }
  const nextIds = emptyActiveSetIdsByLayoutMode();
  const nextSlots = emptyActiveMealSlotsByLayoutMode();
  nextIds[currentMode] = [...activeSetIdsByLayoutMode[currentMode]];
  nextSlots[currentMode] = { ...activeMealSlotsBySetIdByLayoutMode[currentMode] };
  return {
    activeSetIdsByLayoutMode: nextIds,
    activeMealSlotsBySetIdByLayoutMode: nextSlots,
  };
}

/** 특정 보기 모드의 오늘 적용 세트·구간 */
export function resolveActiveFixedFlowApplyForLayoutMode(
  state: Pick<
    FixedFlowSetsState,
    | 'activeSetIds'
    | 'activeMealSlotsBySetId'
    | 'activeSetIdsByLayoutMode'
    | 'activeMealSlotsBySetIdByLayoutMode'
  >,
  mode: FixedRoutineApplyLayoutMode,
): { activeSetIds: string[]; activeMealSlotsBySetId: Record<string, DayMealSlot[]> } {
  const byMode = state.activeSetIdsByLayoutMode;
  const slotsByMode = state.activeMealSlotsBySetIdByLayoutMode;
  if (byMode && typeof byMode === 'object') {
    return {
      activeSetIds: [...(byMode[mode] ?? [])],
      activeMealSlotsBySetId: { ...(slotsByMode?.[mode] ?? {}) },
    };
  }
  return {
    activeSetIds: [...(state.activeSetIds ?? [])],
    activeMealSlotsBySetId: { ...(state.activeMealSlotsBySetId ?? {}) },
  };
}

function normalizeDismissedExampleCustomFlowSetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_IDS as readonly string[]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    const t = typeof id === 'string' ? id.trim() : '';
    if (!t || !valid.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function hadMissingBuiltinExampleCustomSets(raw: unknown): boolean {
  if (!Array.isArray(raw)) return true;
  const ids = new Set(
    raw
      .map((row) =>
        row && typeof row === 'object' && typeof (row as Record<string, unknown>).id === 'string'
          ? (row as Record<string, unknown>).id.trim()
          : '',
      )
      .filter(Boolean),
  );
  return !ids.has('set_example_health') || !ids.has('set_example_focus');
}

export function normalizeFixedFlowSetsState(input: unknown): FixedFlowSetsState {
  const raw = input && typeof input === 'object' ? (input as PersistedShape) : {};
  const dismissedExampleCustomFlowSetIds = normalizeDismissedExampleCustomFlowSetIds(
    raw.dismissedExampleCustomFlowSetIds,
  );
  const fixedRoutineApplyLayoutMode = normalizeFixedRoutineApplyLayoutMode(
    raw.fixedRoutineApplyLayoutMode,
  );
  const sets = mergeBuiltInExampleCustomSets(
    mergeBuiltInPresetSets(
      migrateExampleCustomFlowSets(
        migrateRemovedBuiltinPresetSets(
          migrateRemovedScheduledSets(migrateLegacyBuiltInSets(normalizeSets(raw.sets))),
        ),
      ),
    ),
    { dismissedIds: dismissedExampleCustomFlowSetIds },
  );
  const legacyActiveSetIds = normalizeActiveSetIds(raw, sets);
  const legacyActiveMealSlotsBySetId = normalizeActiveMealSlotsBySetId(raw, sets);
  let activeSetIdsByLayoutMode = normalizeActiveSetIdsByLayoutMode(
    raw,
    sets,
    legacyActiveSetIds,
    fixedRoutineApplyLayoutMode,
  );
  let activeMealSlotsBySetIdByLayoutMode = normalizeActiveMealSlotsByLayoutMode(
    raw,
    sets,
    legacyActiveMealSlotsBySetId,
    fixedRoutineApplyLayoutMode,
  );
  const alreadyMigrated = raw.fixedRoutinePerModeApplyMigrated === true;
  if (!alreadyMigrated) {
    const split = splitIdenticalPerModeApply(
      activeSetIdsByLayoutMode,
      activeMealSlotsBySetIdByLayoutMode,
      fixedRoutineApplyLayoutMode,
    );
    activeSetIdsByLayoutMode = split.activeSetIdsByLayoutMode;
    activeMealSlotsBySetIdByLayoutMode = split.activeMealSlotsBySetIdByLayoutMode;
  }
  const activeSetIds = [...activeSetIdsByLayoutMode[fixedRoutineApplyLayoutMode]];
  const activeMealSlotsBySetId = {
    ...activeMealSlotsBySetIdByLayoutMode[fixedRoutineApplyLayoutMode],
  };
  return {
    activeSetIds,
    activeMealSlotsBySetId,
    activeSetIdsByLayoutMode,
    activeMealSlotsBySetIdByLayoutMode,
    sets,
    scheduledMealSlotLayoutEnabled: raw.scheduledMealSlotLayoutEnabled === true,
    dismissedExampleCustomFlowSetIds,
    fixedRoutineApplyLayoutMode,
    fixedRoutinePerModeApplyMigrated: true,
  };
}

export function isFixedFlowSetRuleMatchedToday(
  applyRule: FixedFlowSetApplyRule,
  now: Date = new Date(),
): boolean {
  if (applyRule === 'manual') return false;
  return isApplyWeekdayMatchedToday(defaultWeekdaysForApplyRule(applyRule), now);
}

export function isFixedFlowSetMatchedToday(
  set: Pick<FixedFlowSet, 'applyRule' | 'applyWeekdays'>,
  now: Date = new Date(),
): boolean {
  if (set.applyRule === 'manual') return false;
  return isApplyWeekdayMatchedToday(resolveApplyWeekdays(set), now);
}

/** 오늘 적용 켠 그룹 categoryKey */
export function collectActiveFixedFlowCategoryKeys(
  state: Pick<FixedFlowSetsState, 'activeSetIds' | 'activeMealSlotsBySetId' | 'sets'>,
  now: Date = new Date(),
): string[] {
  const active = new Set(state.activeSetIds);
  const activeMealSlotsBySetId = state.activeMealSlotsBySetId ?? {};
  const seen = new Set<string>();
  const out: string[] = [];

  for (const set of state.sets) {
    if (!active.has(set.id)) continue;
    if (isBuiltinPresetScheduleSet(set) && !isFixedFlowSetMatchedToday(set, now)) {
      continue;
    }
    const activeSlotsRaw = activeMealSlotsBySetId[set.id];
    const activeSlots =
      isBuiltinPresetScheduleSet(set) && Array.isArray(activeSlotsRaw) && activeSlotsRaw.length > 0
        ? new Set(activeSlotsRaw)
        : null;
    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      if (activeSlots) {
        const slot = resolveFixedFlowItemMealSlot(item, index);
        if (!activeSlots.has(slot)) continue;
      }
      const key = item.categoryKey.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }

  return out;
}

export function loadFixedFlowSetsState(): FixedFlowSetsState {
  const raw = localStorageClient.getJson<PersistedShape>(StorageKeys.fixedFlowSets);
  const normalized = normalizeFixedFlowSetsState(raw);
  const needsPersist =
    hadRemovedScheduledSets(raw?.sets) ||
    hadRemovedBuiltinPresetSets(raw?.sets) ||
    hadExampleCustomFlowSetMigration(raw?.sets) ||
    hadMissingBuiltinExampleCustomSets(raw?.sets) ||
    raw?.fixedRoutinePerModeApplyMigrated !== true;
  if (needsPersist) {
    saveFixedFlowSetsState(normalized);
    return normalized;
  }
  if (normalized.sets.length > 0) {
    return normalized;
  }

  const legacy = localStorageClient.getJson<{ categoryKeys?: string[] }>(
    StorageKeys.priorityCatalogFixedRoutines,
  );
  const legacyKeys = Array.isArray(legacy?.categoryKeys)
    ? legacy.categoryKeys
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k): k is string => k.length > 0)
    : [];
  if (legacyKeys.length === 0) {
    const defaults = normalizeFixedFlowSetsState({ activeSetIds: [], sets: [] });
    saveFixedFlowSetsState(defaults);
    return defaults;
  }
  const migratedManual: FixedFlowSetsState = normalizeFixedFlowSetsState({
    activeSetIds: ['default'],
    sets: [
      {
        id: 'default',
        name: FALLBACK_SET_NAME,
        applyRule: 'manual',
        items: [...new Set(legacyKeys)].map((categoryKey) => ({ categoryKey, enabled: true })),
      },
    ],
  });
  saveFixedFlowSetsState(migratedManual);
  return migratedManual;
}

export function saveFixedFlowSetsState(next: FixedFlowSetsState): void {
  const existing = localStorageClient.getJson<PersistedShape>(StorageKeys.fixedFlowSets);
  const normalized = normalizeFixedFlowSetsState({
    ...next,
    fixedRoutinePerModeApplyMigrated:
      next.fixedRoutinePerModeApplyMigrated === true ||
      existing?.fixedRoutinePerModeApplyMigrated === true,
  });
  localStorageClient.setJson(StorageKeys.fixedFlowSets, normalized);
}

/** @deprecated 첫 번째 적용 그룹 — 레거시 단일 세트 API용 */
export function getActiveFixedFlowSet(state: FixedFlowSetsState): FixedFlowSet | null {
  for (const set of state.sets) {
    if (state.activeSetIds.includes(set.id)) return set;
  }
  return null;
}

export function loadActiveFixedFlowCategoryKeys(): string[] {
  const state = loadFixedFlowSetsState();
  return collectActiveFixedFlowCategoryKeys(state);
}
