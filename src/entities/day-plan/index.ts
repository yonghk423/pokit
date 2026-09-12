export { getBlockTimelineIcon } from './lib/blockIcons';
export {
  buildWidgetDayPlanPayload,
  type WidgetDayPlanPayload,
  type WidgetPriorityRoutineItem,
} from './lib/widgetDayPlanPayload';
export { syncDayPlanToWidget, syncWidgetTimelineFromStorage } from './lib/widgetDayPlanSync';
export { buildSpineTimelineModel } from './lib/buildSpineTimelineModel';
export type { BuildSpineTimelineModelInput } from './lib/buildSpineTimelineModel';
export {
  defaultSystemGroupForCatalogKey, HEALTH_GROUP_SYSTEM_ORDER,
  PRODUCTIVITY_GROUP_SYSTEM_ORDER
} from './lib/catalogItemGroup';
export {
  mergeCategoryAppearanceIntoConfig,
  readEditableCategoryAppearance,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon
} from './lib/categoryCatalogAppearance';
export {
  registerCategoryKeyByDisplayNameResolver,
  resolveRegisteredCategoryKeyByDisplayName
} from './lib/categoryKeyByDisplayNameResolver';
export {
  builtinCategoryLabelKo, CATEGORY_REMINDER_KEYS, categoryReminderIconName, categoryReminderLabelKo, type CategoryReminderCatalogKey
} from './lib/categoryReminderCatalog';
export { computeSpineGapInsertSlot } from './lib/computeSpineGapInsertSlot';
export { isSpineBlockActiveAtMinute } from './lib/isSpineBlockActiveAtMinute';
export {
  DEFAULT_SPINE_GAP_BLOCK_MINUTES,
  normalizeSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
  type SpineGapBlockMinuteOption,
} from '@shared/lib/spineDefaultBlockMinutes';
export {
  collectSpineTimelineCategoryKeys,
  priorityLayoutRoutineSourceLabelKo,
  resolveCrossLayoutRoutineKeysForTarget,
  resolvePriorityLayoutRoutineSource,
  type LayoutSetupRoutineCountInput,
  type PriorityLayoutRoutineSource,
  type PriorityLayoutRoutineSourceMode,
} from './lib/priorityCrossLayoutRoutines';
export {
  clampSpineBlockToPriorityWindow,
  clipGapToSpinePriorityWindow,
  isMinuteWithinSpinePriorityWindow,
  isSpineBlockScheduleWithinPriorityWindow,
  isSpineBlockWithinPriorityWindow,
  resolveSpinePriorityWindow,
  type SpinePriorityWindow,
} from './lib/spinePriorityWindow';
export { countPendingFlowBlocks } from './lib/countPendingFlowBlocks';
export {
  countPendingRoutinesByLayout,
  totalPendingRoutinesByLayout,
  type CountPendingRoutinesByLayoutInput,
  type PendingRoutineCountsByLayout,
} from './lib/countPendingRoutinesByLayout';
export {
  isSystemCatalogGroupKey, SYSTEM_CATALOG_GROUP_KEYS,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  SYSTEM_CATALOG_GROUP_SUBTITLE_KO, type SystemCatalogGroupKey
} from './lib/customCatalogGroup';
export {
  resolveCustomCatalogGroupDisplayLabel,
  resolveFixedFlowSetDisplayName,
} from './lib/resolveCatalogGroupDisplayLabel';
export {
  isInternalAutoRoutineLabel,
  resolveCustomFlowCategoryLabelKo,
  resolveCustomFlowDisplayLabel,
} from './lib/customFlowDisplayLabel';
export {
  looksLikeRawCategoryKeyTitle,
  resolveCategoryKeyDisplayLabelKo,
  resolveDayPlanBlockDisplayTitle,
} from './lib/resolveDayPlanBlockDisplayTitle';
export {
  normalizeRoutineDisplayName,
  persistRoutineDisplayName,
  readRoutineDisplayNameFromConfig,
  ROUTINE_DISPLAY_NAME_MAX,
} from './lib/routineDisplayName';
export {
  createCustomFlowCategoryId, CUSTOM_FLOW_CATEGORY_PREFIX, defaultCustomFlowPickerLabel,
  isCustomFlowCategoryKey,
  type CustomFlowCategoryKey
} from './lib/customFlowCategoryKey';
export {
  buildInitialCustomFlowDetailConfig,
  buildTemplateDemoConfig,
  buildTemplateSetupConfig,
  CUSTOM_FLOW_TEMPLATE_DESCRIPTIONS,
  CUSTOM_FLOW_TEMPLATE_LABELS,
  CUSTOM_FLOW_TEMPLATE_SUMMARIES,
  normalizeCustomFlowDetailConfig,
  pickChecklistSettingsForCreate,
  pickMemoSettingsForCreate,
  resolveCustomFlowTemplateKey,
  resolveAppliedCustomFlowTemplateLabel,
  resolveCustomFlowTemplateLabel,
  resolveCustomFlowTemplateDescription,
  resolveCustomFlowTemplateSummary,
  type CustomFlowTemplateKey
} from './lib/customFlowTemplate';
export {
  CUSTOM_FLOW_TEMPLATE_ICONS,
  CUSTOM_FLOW_TEMPLATE_PREVIEW_LINES,
  listCustomFlowTemplateCatalogEntries,
  resolveCustomFlowTemplateCatalogEntry,
  type CustomFlowTemplateCatalogEntry,
  type CustomFlowTemplateIconName
} from './lib/customFlowTemplateCatalog';
export {
  COUNTER_ACTIVITY_PRESETS,
  COUNTER_UNIT_OPTIONS,
  CUSTOM_FLOW_TEMPLATE_KEYS,
  findReminderScheduleItem,
  formatCounterProgressLine,
  formatCounterRemainingMessage,
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialMemoDataConfig,
  getInitialReminderDataConfig,
  isCustomFlowTemplateKey,
  MAX_CUSTOM_REMINDER_TIMES,
  mergeCustomFlowGoalDetailData,
  normalizeCounterDetailConfig,
  normalizeCounterCustomUnitLabel,
  normalizeCounterStepSize,
  normalizeCounterUnitKey,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  normalizeReminderTime,
  isReminderPresetActive,
  REMINDER_SCHEDULE_PRESETS,
  resolveCounterUnitLabel,
  resolveReminderItemTitle,
  sortReminderScheduleItems,
  suggestNextReminderTime,
  type CounterActivityPreset,
  type CounterUnitKey,
  type ReminderScheduleItem,
  type ReminderSchedulePreset,
} from './lib/customFlowTemplateConfigs';
export type {
  CounterDetailDataConfig,
  FocusDetailDataConfig,
  HabitDetailDataConfig,
  JournalDetailDataConfig,
  JournalEntry,
  MemoDetailDataConfig,
  MemoEntry,
  ReminderDetailDataConfig,
} from './lib/customFlowTemplateConfigs';
export {
  buildWeightChartSeries,
  clampWeightKg,
  latestWeightFromLogs,
  normalizeFastingWeightLogs,
  readWeightLogForDate,
  removeFastingWeightLog,
  setFastingWeightLog,
  sortedWeightLogEntries,
  weightDeltaToTarget,
  weightGoalAchieved,
  weightProgressRatioFromLogs,
} from './lib/weightLog';
export type { FastingWeightLogs, WeightChartPoint, WeightLogEntry } from './lib/weightLog';
export {
  applyCounterDelta,
  applyCounterFillRemaining,
  applyHabitDoneToggle,
  applyJournalSave,
  applyMemoSave,
  addReminderScheduleItem,
  applyMeasurementSave,
  buildHabitWeekDots,
  ensureCounterDayBoundary,
  focusElapsedMinFromSession,
  formatMeasurementDelta,
  formatReminderCountdown,
  formatValueCompact,
  JOURNAL_MOOD_OPTIONS,
  measurementQuickDeltas,
  measurementRecordedToday,
  minutesUntilReminder,
  reminderProgress,
  resetCounterCount,
  removeReminderScheduleItem,
  resolveNextReminderTime,
  toggleReminderTimeDone,
  updateReminderItemLabel,
  updateReminderItemTime,
} from './lib/customFlowTemplateRuntime';
export {
  applyCounterActivityPreset,
  applyCounterActivitySettings,
  pickCounterSettingsForCreate,
} from './lib/counterPresetSamples';
export {
  applyMeasurementMetricPreset,
  pickMeasurementSettingsForCreate,
} from './lib/measurementPresetSamples';
export {
  applyReminderSchedulePreset,
  pickReminderSettingsForCreate,
} from './lib/reminderPresetSamples';
export {
  MEASUREMENT_METRIC_PRESETS,
  MEASUREMENT_UNIT_OPTIONS,
  resolveMeasurementUnitLabel,
  roundMeasurementValue,
} from './lib/measurementUnits';
export {
  filterBagTimelineFlowBlocks,
  filterDayPlanFlowBlocks,
  filterSpineTimelineBlocks,
  isDayPlanFlowBlock,
  isDayPlanSpineTimelineBlock,
  migrateSpineTimelineBlockOrigins
} from './lib/dayPlanFlowBlock';
export {
  blockEndWallTimeMs,
  isBlockEndInPastForDateKey,
  minuteOffsetToDateMs,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  toRuntimeTiming
} from './lib/dayPlanRuntimeTime';
export type { DayPlanRuntimeTiming } from './lib/dayPlanRuntimeTime';
export {
  blockDurationSec,
  dayPlanTimeRangesOverlap,
  effectiveEndMinutesExclusive,
  findOverlappingDayPlanBlock,
  findOverlappingDayPlanBlocks,
  formatBlockTimeRange,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  formatSpineScheduleRangeLabel,
  getFirstPendingBlock,
  getLocalMinutesOfDayNow,
  getNextPendingAfter,
  sortDayPlanBlocks,
  totalPlannedMinutes
} from './lib/dayPlanTime';
export {
  defaultEditorBlockTimesFromNow,
  defaultPriorityWindowFromNow,
  formatMinutesToHHmm, MIN_BLOCK_DURATION_MINUTES,
  PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES, snapMinutes, TIME_SNAP_MINUTES
} from './lib/dayPlanTimeMath';
export {
  formatTodoItemShareText,
  formatTodoListShareText,
} from './lib/formatTodoListShareText';
export {
  collectRoutineStartNotifySlots,
  hasResolvableRoutineStartTime,
  type RoutineStartNotifySlot,
} from './lib/resolveRoutineStartNotifySlots';
export { resolveCategoryReminderNotifyWeekdays } from './lib/resolveCategoryReminderNotifyWeekdays';
export { DEFAULT_DAY_PLAN_BLOCKS } from './lib/defaultBlocks';
export { deleteCustomFlowCategory } from './lib/deleteCustomFlowCategory';
export { dismissCatalogGroupWithItemReassign } from './lib/dismissCatalogGroup';
export {
  getFlowCompletionCategoryKeysForBlock,
  getFlowCompletionUnitCountForBlock
} from './lib/flowCompletionUnits';
export {
  DAY_PLAN_ANCHOR_ICON_SIZE,
  dayPlanAnchorIconColor,
  dayPlanAnchorNodeBackground,
  dayPlanDayStartIconColor,
  dayPlanDayEndIconColor,
} from './lib/dayPlanAnchorTheme';
export { formatSpineGapCoaching } from './lib/formatSpineGapCoaching';
export {
  ITEM_PRIORITY_CYCLE,
  ITEM_PRIORITY_META,
  cycleItemPriority,
  normalizeItemPriority,
} from './lib/itemPriority';
export {
  PRIORITY_MARK_COLOR_CYCLE,
  PRIORITY_MARK_COLOR_IDS,
  PRIORITY_MARK_COLOR_PRESETS,
  cyclePriorityMarkColor,
  getPriorityMarkPreset,
  isPriorityMarkColorId,
  migrateLegacyImportanceToMarkColor,
  normalizePriorityMarkColor,
  priorityMarkFaceColor,
  priorityMarkTitleHighlight,
  resolveCategoryMarkColor,
  type PriorityMarkColorId,
} from './lib/priorityMarkColor';

export * from './lib/goalCategorySessionConfig';
export {
  ROUTINE_SUMMARY_MAX,
  formatRoutineSummaryHint,
  normalizeRoutineSummary,
  readRoutineSummaryFromConfig,
  resolveRoutineSummaryForDisplay,
} from './lib/routineSummary';
export {
  extractMedicineConfigFromRaw,
  extractWaterConfigFromRaw,
  getInitialHealthIntakeDataConfig,
  HEALTH_INTAKE_CATEGORY_KEY,
  HEALTH_INTAKE_LABEL_KO,
  isHealthIntakeRelatedCategoryKey,
  mergeLegacyHealthIntakeFromParts,
  normalizeCatalogKeysAfterHealthIntakeMerge,
  normalizeHealthIntakeDetailConfig,
  resolveHealthIntakeCategoryKey,
  type HealthIntakeDetailDataConfig,
} from './lib/healthIntakeDetailConfig';
export {
  buildWorkStudyShareText,
  WORK_STUDY_TASK_PRESETS,
  workStudyModeLabelKo,
} from './lib/workStudyPlan';
export {
  WORK_STUDY_HEADING_ACCENTS,
  WORK_STUDY_TEXT_COLORS,
  WORK_STUDY_TABLE_MAX_ROWS,
  WORK_STUDY_TABLE_MAX_COLS,
  WORK_STUDY_TABLE_DEFAULT_ROWS,
  WORK_STUDY_TABLE_DEFAULT_COLS,
  WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT,
  WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT,
  WORK_STUDY_IMAGE_DEFAULT_DISPLAY_HEIGHT,
  WORK_STUDY_IMAGE_DISPLAY_HEIGHT_STEP,
  WORK_STUDY_IMAGE_DISPLAY_HEIGHT_PRESETS,
  clampWorkStudyImageDisplayHeight,
  resolveWorkStudyImageDisplayHeight,
  stepWorkStudyImageDisplayHeight,
  createEmptyTableRows,
  createWorkStudyDocBlock,
  createWorkStudyNotePage,
  getInitialWorkStudyDocument,
  migrateLegacyWorkContentToDocument,
  normalizeWorkStudyDocBlock,
  normalizeWorkStudyDocument,
  workStudyDocumentIsEmpty,
  workStudyDocumentToPlainText,
  workStudyPageBlocksToPlainText,
  formatWorkStudyNoteDateLabel,
  formatWorkStudyNoteTitleFromDateKey,
  resolveWorkStudyNotePageAutoTitle,
  resolveWorkStudyNotePageLabel,
  resolveWorkStudyNotePagePreview,
  persistWorkStudyNotePageTitle,
  isLegacyAutoWorkStudyNoteTitle,
  getWorkStudyActivePage,
  setWorkStudyActivePageBlocks,
  updateWorkStudyNotePageTitle,
} from './lib/workStudyDocument';
export type {
  WorkStudyBlockKind,
  WorkStudyBlockMarks,
  WorkStudyDocBlock,
  WorkStudyDocument,
  WorkStudyHeadingLevel,
  WorkStudyNotePage,
} from './lib/workStudyDocument';
export {
  addMonths,
  buildMonthCalendarGrid,
  buildWeekCalendarRow,
  dateKeyFromDate,
  formatDateKeyDisplayKo,
  formatMonthTitleKo,
  formatStudyDdayLabel,
  formatTimetableSlotLine,
  nearestUpcomingDdayEvent,
  sortDdayEvents,
  sortTimetableSlots,
  toMonthStart,
  weekdayFromDate,
  WORK_STUDY_WEEKDAY_LABELS_KO,
} from './lib/workStudySchedule';
export type {
  WorkStudyDdayEvent,
  WorkStudyTimetableSlot,
  WorkStudyWeekday,
} from './lib/workStudySchedule';
export {
  GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS, isGoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistStyleCategoryKey, type GoalDetailChecklistDerivedCategoryKey
} from './lib/goalDetailChecklistCategoryKeys';
export {
  addDaysToLocalDateKey,
  getLocalDateKey,
  localDateToDateKey,
  parseLocalDateKeyToDate
} from './lib/localDateKey';
export {
  lookupCategoryPlannedDayCount,
  sumCategoryPlannedDaysInRange,
} from './lib/routineHistorySnapshot';
export {
  MAX_WATER_REMINDER_TIMES,
  normalizeWaterReminderTimes
} from './lib/normalizeWaterReminderTimes';
export { parseHHmmToMinutes } from './lib/parseTime';
export {
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  parseNumberedFlowLines
} from './lib/priorityBlockTitle';
export {
  getPriorityCatalogPickerLabel,
  isStandardCatalogDefaultDisplayName,
  PRIORITY_CATALOG_PICKER_LABELS,
  resolveStandardCatalogDisplayLabel,
} from './lib/priorityCatalogPickerLabels';
export {
  CATALOG_REMOVED_KEYS,
  filterKeysToPriorityCatalog,
  getPriorityCatalogAllowedKeySet,
  getPriorityCatalogStandardKeys,
  isNonDeletableCatalogKey,
  isNonDeletableStandardCatalogKey,
  isPriorityCatalogAllowedKey,
  RETIRED_STANDARD_CATALOG_KEYS,
  resolveUserBagRoutineCatalogKeys,
  sanitizePriorityCategoryOrderKeys,
} from './lib/priorityCatalogRegistry';
export {
  createPriorityRoutineInstanceKey,
  isPriorityRoutineInstanceKey,
  materializePriorityRoutineOccurrenceKeys,
  resolvePriorityRoutineCategoryKey,
} from './lib/priorityRoutineInstance';
export {
  clampHhmmToPriorityWindow,
  isOvernightPriorityWindow
} from './lib/priorityRoutineWindow';
export {
  buildPrioritySectionCompletionKey,
  migrateCompletionKeyInList,
  parsePrioritySectionCompletionKey,
  toRoutineHistoryCategoryKey,
  resolveFocusCompletionHistoryLayoutMode,
} from './lib/prioritySectionCompletionKey';
export { blockMatchesPriorityHhmmWindow } from './lib/priorityWindowBlockMatch';
export {
  isPriorityWindowEligible,
  isPriorityWindowEndedForToday,
  type PriorityWindowContext
} from './lib/priorityWindowEligibility';
export {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  readingDisplayTitle
} from './lib/readingLiveActivityConfig';
export { normalizeReadingAladinBook } from './lib/readingAladinBook';
export { normalizeReadingOpenLibraryBook } from './lib/readingOpenLibraryBook';
export type { ReadingOpenLibraryBook } from './lib/readingOpenLibraryBook';
export {
  defaultTargetPageForCatalogBook,
  readingBookExternalLinkLabel,
  readingBookShareLinkLabel,
  resolveReadingBookAuthor,
  resolveReadingBookCatalogSource,
  resolveReadingBookCoverUrl,
  resolveReadingBookExternalLink,
  resolveReadingBookTotalPages,
} from './lib/readingBookCatalog';
export type { ReadingBookCatalogSource } from './lib/readingBookCatalog';
export { readingBookEntryToShareText } from './lib/readingBookShareText';
export type {
  ReadingAladinBook,
  ReadingBookEntry,
  ReadingBookStatus,
  ReadingLibrarySortOrder,
  ReadingLiveActivityConfig,
  ReadingMetricKey
} from './lib/readingLiveActivityConfig';
export {
  bookMatchesReadingLibraryQuery,
  deriveReadingBookProgress,
  ensureReadingBookPages,
  firstAladinBookEntry,
  makeReadingBookId,
  normalizeReadingBookMemo,
  normalizeReadingBookStatus,
  READING_BOOK_MEMO_MAX,
  resolveReadingBookAddedAtMs,
  sortReadingBooksByAddedAt,
  sortReadingBooksByNewestFirst,
} from './lib/readingLiveActivityConfig';
export type { PriorityLayoutLinkMode } from './lib/priorityLayoutLinkMode';
export { buildSpineImportFromBag } from './lib/buildSpineImportFromBag';
export type { SpineBagImportBlock } from './lib/buildSpineImportFromBag';
export {
  isStoredFixedFlowSpineSchedule,
  resolveFixedFlowSpineSchedules,
  sortFixedFlowItemsBySpineSchedule,
} from './lib/fixedFlowSpineSchedule';
export type { FixedFlowSpineItemSchedule } from './lib/fixedFlowSpineSchedule';
export { resolveTodayFixedRoutineKeys } from './lib/resolveTodayFixedRoutineKeys';
export type {
  SpineTimelineAnchorRow,
  SpineTimelineBlockRow,
  SpineTimelineGapRow,
  SpineTimelineRow
} from './lib/spineTimelineTypes';
export {
  collectAllFixedFlowCategoryKeys,
  syncPriorityOrderWithAppliedFixedRoutines
} from './lib/syncTodayTabWithFixedRoutineApply';
export {
  buildWaterRoutineReminderSlots,
  waterReminderIntervalMinutes,
  type WaterRoutineReminderSlot
} from './lib/waterReminderRoutineSlots';
export { seedPokitWeekTourIntoTodayIfNeeded } from './lib/seedPokitWeekTourIntoToday';
export {
  appendPriorityCategoryKeysIfMissing,
  notifyFixedFlowApplyScheduleChanged,
  selectFirstPendingBlock,
  syncTodayTabWithFixedRoutineApply,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore,
} from './model';
export type { AddBlockResult, PlanMode, UpdateBlockResult } from './model';
export type { DayPlanBlock, DayPlanQuickMemo, DayPlanTodoItem, DayPlanTodoSubItem, TodoPriority } from './model/types';

