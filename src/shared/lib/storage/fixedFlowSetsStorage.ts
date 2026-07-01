import {
  LEGACY_WEEKDAY_SET_ID,
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
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { collectAutoScheduledCategoryKeys } from './routineApplyWeekdaysStorage';
import { StorageKeys } from './storageKeys';

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
};

export type FixedFlowSet = {
  id: string;
  name: string;
  applyRule: FixedFlowSetApplyRule;
  applyWeekdays?: WeekdayIndex[];
  items: FixedFlowSetItem[];
};

export type FixedFlowSetsState = {
  /** 오늘 담기에 적용 중인 그룹 id (여러 개 가능) */
  activeSetIds: string[];
  sets: FixedFlowSet[];
};

type PersistedShape = Partial<FixedFlowSetsState> & {
  /** 레거시 단일 적용 id — 읽기 전용 마이그레이션 */
  activeSetId?: string | null;
};

const FALLBACK_SET_NAME = '기본 세트';

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

function normalizeItems(raw: unknown): FixedFlowSetItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FixedFlowSetItem[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const key = typeof r.categoryKey === 'string' ? r.categoryKey.trim() : '';
    if (!key || seen.has(key)) continue;
    out.push({
      categoryKey: key,
      enabled: r.enabled !== false,
    });
    seen.add(key);
  }
  return out;
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
    out.push({
      id,
      name,
      applyRule,
      applyWeekdays: applyRule === 'manual' ? applyWeekdaysRaw : applyWeekdays,
      items,
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
    name: '데일리 루틴',
    applyRule: 'daily',
    applyWeekdays: defaultWeekdaysForApplyRule('daily'),
    items: mergeSetItems(daily.items, weekdayLegacy.items),
  };
  return withoutWeekday;
}

function mergeCategoryApplyWeekdays(categoryKey: string, weekdays: WeekdayIndex[]): void {
  const key = categoryKey.trim();
  if (!key || weekdays.length === 0) return;
  const existing = loadGoalDetailCategoryConfig(key);
  const existingDays =
    existing && typeof existing === 'object'
      ? normalizeApplyWeekdays((existing as Record<string, unknown>).applyWeekdays)
      : [];
  if (existingDays.length > 0) return;

  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  saveGoalDetailCategoryConfig(key, { ...base, applyWeekdays: weekdays });
}

/** 요일별 그룹(set_always·custom 등)만 목표 상세로 이전 — 데일리·주말은 유지 */
function migrateRemovedScheduledSets(sets: FixedFlowSet[]): FixedFlowSet[] {
  for (const set of sets) {
    if (!shouldMigrateAwayScheduledSet(set)) continue;
    const weekdays = resolveApplyWeekdays(set);
    for (const item of set.items) {
      if (item.enabled === false) continue;
      mergeCategoryApplyWeekdays(item.categoryKey, weekdays);
    }
  }
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

const LEGACY_AUTO_ACTIVE_SET_IDS = new Set([
  LEGACY_WEEKDAY_SET_ID,
  'set_daily',
  'set_weekend',
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

export function normalizeFixedFlowSetsState(input: unknown): FixedFlowSetsState {
  const raw = input && typeof input === 'object' ? (input as PersistedShape) : {};
  const sets = mergeBuiltInPresetSets(
    migrateRemovedScheduledSets(migrateLegacyBuiltInSets(normalizeSets(raw.sets))),
  );
  const activeSetIds = normalizeActiveSetIds(raw, sets);
  return { activeSetIds, sets };
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

function collectEffectiveActiveSetIds(
  state: FixedFlowSetsState,
  now: Date,
): Set<string> {
  const activeSetIds = new Set(state.activeSetIds);
  for (const set of state.sets) {
    if (isFixedFlowSetMatchedToday(set, now)) {
      activeSetIds.add(set.id);
    }
  }
  return activeSetIds;
}

/** 데일리·주말 자동 + 수동 그룹 + 목표 상세 요일 자동 담기 */
export function collectActiveFixedFlowCategoryKeys(
  state: FixedFlowSetsState,
  now: Date = new Date(),
): string[] {
  const active = collectEffectiveActiveSetIds(state, now);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const set of state.sets) {
    if (!active.has(set.id)) continue;
    for (const item of set.items) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }

  for (const key of collectAutoScheduledCategoryKeys(now)) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export function loadFixedFlowSetsState(): FixedFlowSetsState {
  const raw = localStorageClient.getJson<PersistedShape>(StorageKeys.fixedFlowSets);
  const normalized = normalizeFixedFlowSetsState(raw);
  if (hadRemovedScheduledSets(raw?.sets)) {
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
  const normalized = normalizeFixedFlowSetsState(next);
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
