export type { DayPlanBlock, DayPlanQuickMemo } from './model/types';
export type { AddBlockResult, PlanMode } from './model';
export { useDayPlanStore, selectFirstPendingBlock } from './model';
export { useDayPlanRuntimeStore } from './model';
export { useFixedFlowSetsStore } from './model';
export {
  appendPriorityCategoryKeysIfMissing,
  useDayPlanDraftStore,
} from './model';
export {
  defaultEditorBlockTimesFromNow,
  defaultPriorityWindowFromNow,
  formatMinutesToHHmm,
  MIN_BLOCK_DURATION_MINUTES,
  PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES,
  snapMinutes,
  TIME_SNAP_MINUTES,
} from './lib/dayPlanTimeMath';
export { DEFAULT_DAY_PLAN_BLOCKS } from './lib/defaultBlocks';
export { getBlockTimelineIcon } from './lib/blockIcons';
export { parseHHmmToMinutes } from './lib/parseTime';
export { filterDayPlanFlowBlocks, isDayPlanFlowBlock } from './lib/dayPlanFlowBlock';
export { countPendingFlowBlocks } from './lib/countPendingFlowBlocks';
export {
  blockDurationSec,
  dayPlanTimeRangesOverlap,
  effectiveEndMinutesExclusive,
  findOverlappingDayPlanBlock,
  findOverlappingDayPlanBlocks,
  formatBlockTimeRange,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  getFirstPendingBlock,
  getLocalMinutesOfDayNow,
  getNextPendingAfter,
  sortDayPlanBlocks,
  totalPlannedMinutes,
} from './lib/dayPlanTime';
export type { DayPlanRuntimeTiming } from './lib/dayPlanRuntimeTime';
export {
  blockEndWallTimeMs,
  isBlockEndInPastForDateKey,
  minuteOffsetToDateMs,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  toRuntimeTiming,
} from './lib/dayPlanRuntimeTime';
export {
  registerCategoryKeyByDisplayNameResolver,
  resolveRegisteredCategoryKeyByDisplayName,
} from './lib/categoryKeyByDisplayNameResolver';
export {
  createCustomFlowCategoryId,
  CUSTOM_FLOW_CATEGORY_PREFIX,
  defaultCustomFlowPickerLabel,
  isCustomFlowCategoryKey,
  type CustomFlowCategoryKey,
} from './lib/customFlowCategoryKey';
export {
  CATALOG_REMOVED_KEYS,
  filterKeysToPriorityCatalog,
  getPriorityCatalogAllowedKeySet,
  getPriorityCatalogStandardKeys,
  isPriorityCatalogAllowedKey,
} from './lib/priorityCatalogRegistry';
export {
  isSystemCatalogGroupKey,
  SYSTEM_CATALOG_GROUP_KEYS,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  SYSTEM_CATALOG_GROUP_SUBTITLE_KO,
  type SystemCatalogGroupKey,
} from './lib/customCatalogGroup';
export {
  defaultSystemGroupForCatalogKey,
  HEALTH_GROUP_SYSTEM_ORDER,
  PRODUCTIVITY_GROUP_SYSTEM_ORDER,
} from './lib/catalogItemGroup';
export {
  addDaysToLocalDateKey,
  getLocalDateKey,
  localDateToDateKey,
  parseLocalDateKeyToDate,
} from './lib/localDateKey';
export type {
  ReadingLiveActivityConfig,
  ReadingMetricKey,
} from './lib/readingLiveActivityConfig';
export {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  readingDisplayTitle,
} from './lib/readingLiveActivityConfig';
export * from './lib/goalCategorySessionConfig';
export {
  GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS,
  type GoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistStyleCategoryKey,
} from './lib/goalDetailChecklistCategoryKeys';
export {
  CATEGORY_REMINDER_KEYS,
  builtinCategoryLabelKo,
  categoryReminderLabelKo,
  categoryReminderIconName,
  type CategoryReminderCatalogKey,
} from './lib/categoryReminderCatalog';
export {
  readEditableCategoryAppearance,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
} from './lib/categoryCatalogAppearance';
export {
  getPriorityCatalogPickerLabel,
  PRIORITY_CATALOG_PICKER_LABELS,
} from './lib/priorityCatalogPickerLabels';
export {
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  parseNumberedFlowLines,
} from './lib/priorityBlockTitle';
export {
  getFlowCompletionCategoryKeysForBlock,
  getFlowCompletionUnitCountForBlock,
} from './lib/flowCompletionUnits';
export { blockMatchesPriorityHhmmWindow } from './lib/priorityWindowBlockMatch';
export {
  clampHhmmToPriorityWindow,
  isOvernightPriorityWindow,
} from './lib/priorityRoutineWindow';
export {
  isPriorityWindowEligible,
  isPriorityWindowEndedForToday,
  type PriorityWindowContext,
} from './lib/priorityWindowEligibility';
export {
  buildWaterRoutineReminderSlots,
  waterReminderIntervalMinutes,
  type WaterRoutineReminderSlot,
} from './lib/waterReminderRoutineSlots';
export {
  MAX_WATER_REMINDER_TIMES,
  normalizeWaterReminderTimes,
} from './lib/normalizeWaterReminderTimes';
