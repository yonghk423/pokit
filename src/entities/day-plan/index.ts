export {
  DEFAULT_SPINE_GAP_BLOCK_MINUTES,
  normalizeSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
  type SpineGapBlockMinuteOption
} from '@shared/lib/spineDefaultBlockMinutes';
export { getBlockTimelineIcon } from './lib/blockIcons';
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
  resolveCategoryCatalogIcon,
  resolveCategoryCatalogIconTile
} from './lib/categoryCatalogAppearance';
export {
  registerCategoryKeyByDisplayNameResolver,
  resolveRegisteredCategoryKeyByDisplayName
} from './lib/categoryKeyByDisplayNameResolver';
export {
  builtinCategoryLabelKo, CATEGORY_REMINDER_KEYS, categoryReminderIconName, categoryReminderLabelKo, type CategoryReminderCatalogKey
} from './lib/categoryReminderCatalog';
export { computeSpineGapInsertSlot } from './lib/computeSpineGapInsertSlot';
export {
  applyCounterActivityPreset,
  applyCounterActivitySettings,
  pickCounterSettingsForCreate
} from './lib/counterPresetSamples';
export { countPendingFlowBlocks } from './lib/countPendingFlowBlocks';
export {
  countPendingRoutinesByLayout,
  totalPendingRoutinesByLayout,
  type CountPendingRoutinesByLayoutInput,
  type PendingRoutineCountsByLayout
} from './lib/countPendingRoutinesByLayout';
export {
  isSystemCatalogGroupKey, SYSTEM_CATALOG_GROUP_KEYS,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  SYSTEM_CATALOG_GROUP_SUBTITLE_KO, type SystemCatalogGroupKey
} from './lib/customCatalogGroup';
export {
  createCustomFlowCategoryId, CUSTOM_FLOW_CATEGORY_PREFIX, defaultCustomFlowPickerLabel,
  isCustomFlowCategoryKey,
  type CustomFlowCategoryKey
} from './lib/customFlowCategoryKey';
export {
  isInternalAutoRoutineLabel,
  resolveCustomFlowCategoryLabelKo,
  resolveCustomFlowDisplayLabel
} from './lib/customFlowDisplayLabel';
export {
  buildInitialCustomFlowDetailConfig,
  buildTemplateDemoConfig,
  buildTemplateSetupConfig,
  CUSTOM_FLOW_TEMPLATE_DESCRIPTIONS,
  CUSTOM_FLOW_TEMPLATE_LABELS,
  CUSTOM_FLOW_TEMPLATE_SUMMARIES,
  normalizeCustomFlowDetailConfig,
  pickChecklistSettingsForCreate,
  pickMemoSettingsForCreate, resolveAppliedCustomFlowTemplateLabel, resolveCustomFlowTemplateDescription, resolveCustomFlowTemplateKey, resolveCustomFlowTemplateLabel, resolveCustomFlowTemplateSummary,
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
  isCustomFlowTemplateKey, isReminderPresetActive, MAX_CUSTOM_REMINDER_TIMES,
  mergeCustomFlowGoalDetailData, normalizeCounterCustomUnitLabel, normalizeCounterDetailConfig, normalizeCounterStepSize,
  normalizeCounterUnitKey,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  normalizeReminderTime, REMINDER_SCHEDULE_PRESETS,
  resolveCounterUnitLabel,
  resolveReminderItemTitle,
  sortReminderScheduleItems,
  suggestNextReminderTime,
  type CounterActivityPreset,
  type CounterUnitKey,
  type ReminderScheduleItem,
  type ReminderSchedulePreset
} from './lib/customFlowTemplateConfigs';
export type {
  CounterDetailDataConfig,
  FocusDetailDataConfig,
  HabitDetailDataConfig,
  JournalDetailDataConfig,
  JournalEntry,
  MemoDetailDataConfig,
  MemoEntry,
  ReminderDetailDataConfig
} from './lib/customFlowTemplateConfigs';
export {
  addReminderScheduleItem, applyCounterDelta,
  applyCounterFillRemaining,
  applyHabitDoneToggle,
  applyJournalSave, applyMeasurementSave, applyMemoSave, buildHabitWeekDots,
  ensureCounterDayBoundary,
  focusElapsedMinFromSession,
  formatMeasurementDelta,
  formatReminderCountdown,
  formatValueCompact,
  JOURNAL_MOOD_OPTIONS,
  measurementQuickDeltas,
  measurementRecordedToday,
  minutesUntilReminder,
  reminderProgress, removeReminderScheduleItem, resetCounterCount, resolveNextReminderTime,
  toggleReminderTimeDone,
  updateReminderItemLabel,
  updateReminderItemTime
} from './lib/customFlowTemplateRuntime';
export {
  DAY_PLAN_ANCHOR_ICON_SIZE,
  dayPlanAnchorIconColor,
  dayPlanAnchorNodeBackground, dayPlanDayEndIconColor, dayPlanDayStartIconColor
} from './lib/dayPlanAnchorTheme';
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
export { DEFAULT_DAY_PLAN_BLOCKS } from './lib/defaultBlocks';
export { deleteCatalogCategory, deleteCustomFlowCategory } from './lib/deleteCustomFlowCategory';
export { dismissCatalogGroupWithItemReassign } from './lib/dismissCatalogGroup';
export {
  getFlowCompletionCategoryKeysForBlock,
  getFlowCompletionUnitCountForBlock
} from './lib/flowCompletionUnits';
export { formatSpineGapCoaching } from './lib/formatSpineGapCoaching';
export {
  formatTodoItemShareText,
  formatTodoListShareText
} from './lib/formatTodoListShareText';
export { isSpineBlockActiveAtMinute } from './lib/isSpineBlockActiveAtMinute';
export {
  cycleItemPriority, ITEM_PRIORITY_CYCLE,
  ITEM_PRIORITY_META, normalizeItemPriority
} from './lib/itemPriority';
export {
  applyMeasurementMetricPreset,
  pickMeasurementSettingsForCreate
} from './lib/measurementPresetSamples';
export {
  MEASUREMENT_METRIC_PRESETS,
  MEASUREMENT_UNIT_OPTIONS,
  resolveMeasurementUnitLabel,
  roundMeasurementValue
} from './lib/measurementUnits';
export {
  collectSpineTimelineCategoryKeys,
  priorityLayoutRoutineSourceLabelKo,
  resolveCrossLayoutRoutineKeysForTarget,
  resolvePriorityLayoutRoutineSource,
  type LayoutSetupRoutineCountInput,
  type PriorityLayoutRoutineSource,
  type PriorityLayoutRoutineSourceMode
} from './lib/priorityCrossLayoutRoutines';
export {
  cyclePriorityMarkColor,
  getPriorityMarkPreset,
  isPriorityMarkColorId,
  migrateLegacyImportanceToMarkColor,
  normalizePriorityMarkColor, PRIORITY_MARK_COLOR_CYCLE,
  PRIORITY_MARK_COLOR_IDS,
  PRIORITY_MARK_COLOR_PRESETS, priorityMarkFaceColor,
  priorityMarkTitleHighlight,
  resolveCategoryMarkColor,
  type PriorityMarkColorId
} from './lib/priorityMarkColor';
export {
  applyReminderSchedulePreset,
  pickReminderSettingsForCreate
} from './lib/reminderPresetSamples';
export {
  resolveCustomCatalogGroupDisplayLabel,
  resolveFixedFlowSetDisplayName
} from './lib/resolveCatalogGroupDisplayLabel';
export { resolveCategoryReminderNotifyWeekdays } from './lib/resolveCategoryReminderNotifyWeekdays';
export {
  looksLikeRawCategoryKeyTitle,
  resolveCategoryKeyDisplayLabelKo,
  resolveDayPlanBlockDisplayTitle
} from './lib/resolveDayPlanBlockDisplayTitle';
export {
  collectRoutineStartNotifySlots,
  hasResolvableRoutineStartTime,
  type RoutineStartNotifySlot
} from './lib/resolveRoutineStartNotifySlots';
export {
  normalizeRoutineDisplayName,
  persistRoutineDisplayName,
  readRoutineDisplayNameFromConfig,
  ROUTINE_DISPLAY_NAME_MAX
} from './lib/routineDisplayName';
export {
  clampNotifyTimeToPriorityWindow,
  clampSpineBlockToPriorityWindow,
  clipGapToSpinePriorityWindow,
  isMinuteWithinSpinePriorityWindow,
  isNotifyTimeWithinPriorityWindow,
  isSpineBlockScheduleWithinPriorityWindow,
  isSpineBlockWithinPriorityWindow,
  resolveSpinePriorityWindow,
  type SpinePriorityWindow
} from './lib/spinePriorityWindow';
export {
  applyCurrentWeightToLogs,
  buildWeeklyLossGuideline,
  buildWeightChartSeries, clampWeightKg, daysBetweenWeightLogKeys, latestWeightFromLogs,
  normalizeFastingWeightLogs,
  readWeightLogForDate,
  removeFastingWeightLog,
  setFastingWeightLog,
  sortedWeightLogEntries,
  weightDeltaToTarget,
  weightGoalAchieved,
  weightProgressRatioFromLogs
} from './lib/weightLog';
export type { FastingWeightLogs, WeightChartPoint, WeightLogEntry } from './lib/weightLog';
export {
  buildWidgetDayPlanPayload,
  type WidgetDayPlanPayload,
  type WidgetPriorityRoutineItem
} from './lib/widgetDayPlanPayload';
export { syncDayPlanToWidget, syncWidgetTimelineFromStorage } from './lib/widgetDayPlanSync';

export { buildSpineImportFromBag } from './lib/buildSpineImportFromBag';
export type { SpineBagImportBlock } from './lib/buildSpineImportFromBag';
export { endCategoryOnTodayPlan } from './lib/endCategoryOnTodayPlan';
export {
  isStoredFixedFlowSpineSchedule,
  resolveFixedFlowSpineSchedules,
  sortFixedFlowItemsBySpineSchedule
} from './lib/fixedFlowSpineSchedule';
export type { FixedFlowSpineItemSchedule } from './lib/fixedFlowSpineSchedule';
export * from './lib/goalCategorySessionConfig';
export {
  GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS, isGoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistStyleCategoryKey, type GoalDetailChecklistDerivedCategoryKey
} from './lib/goalDetailChecklistCategoryKeys';
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
  type HealthIntakeDetailDataConfig
} from './lib/healthIntakeDetailConfig';
export {
  addDaysToLocalDateKey,
  getLocalDateKey,
  localDateToDateKey,
  parseLocalDateKeyToDate
} from './lib/localDateKey';
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
  resolveStandardCatalogDisplayLabel
} from './lib/priorityCatalogPickerLabels';
export {
  CATALOG_REMOVED_KEYS,
  filterKeysToPriorityCatalog,
  getPriorityCatalogAllowedKeySet,
  getPriorityCatalogStandardKeys,
  isNonDeletableCatalogKey,
  isNonDeletableStandardCatalogKey,
  isPriorityCatalogAllowedKey, resolveUserBagRoutineCatalogKeys, RETIRED_STANDARD_CATALOG_KEYS, sanitizePriorityCategoryOrderKeys
} from './lib/priorityCatalogRegistry';
export type { PriorityLayoutLinkMode } from './lib/priorityLayoutLinkMode';
export {
  createPriorityRoutineInstanceKey,
  isPriorityRoutineInstanceKey,
  materializePriorityRoutineOccurrenceKeys,
  resolvePriorityRoutineCategoryKey
} from './lib/priorityRoutineInstance';
export {
  clampHhmmToPriorityWindow,
  isHhmmBeforeSameDayWindowStart,
  isOvernightPriorityWindow
} from './lib/priorityRoutineWindow';
export {
  buildPrioritySectionCompletionKey,
  migrateCompletionKeyInList,
  parsePrioritySectionCompletionKey, resolveFocusCompletionHistoryLayoutMode, toRoutineHistoryCategoryKey
} from './lib/prioritySectionCompletionKey';
export { blockMatchesPriorityHhmmWindow } from './lib/priorityWindowBlockMatch';
export {
  isPriorityPlanRangeExpiredOnDate,
  isPriorityPlanWindowEnded,
  isPriorityWindowEligible,
  isPriorityWindowEndedForToday,
  priorityEndLandsOnNextCalendarDay,
  type PriorityWindowContext
} from './lib/priorityWindowEligibility';
export { normalizeReadingAladinBook } from './lib/readingAladinBook';
export {
  defaultTargetPageForCatalogBook,
  readingBookExternalLinkLabel,
  readingBookShareLinkLabel,
  resolveReadingBookAuthor,
  resolveReadingBookCatalogSource,
  resolveReadingBookCoverUrl,
  resolveReadingBookExternalLink,
  resolveReadingBookTotalPages
} from './lib/readingBookCatalog';
export type { ReadingBookCatalogSource } from './lib/readingBookCatalog';
export { readingBookEntryToShareText } from './lib/readingBookShareText';
export {
  bookMatchesReadingLibraryQuery, DEFAULT_READING_LIVE_ACTIVITY_CONFIG, deriveReadingBookProgress, deriveReadingProgress, ensureReadingBookPages,
  firstAladinBookEntry, getInitialReadingLiveActivityConfig, makeReadingBookId,
  normalizeReadingBookMemo,
  normalizeReadingBookStatus, normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection, READING_BOOK_MEMO_MAX, readingDisplayTitle, resolveReadingBookAddedAtMs,
  sortReadingBooksByAddedAt,
  sortReadingBooksByNewestFirst
} from './lib/readingLiveActivityConfig';
export type {
  ReadingAladinBook,
  ReadingBookEntry,
  ReadingBookStatus,
  ReadingLibrarySortOrder,
  ReadingLiveActivityConfig,
  ReadingMetricKey
} from './lib/readingLiveActivityConfig';
export { normalizeReadingOpenLibraryBook } from './lib/readingOpenLibraryBook';
export type { ReadingOpenLibraryBook } from './lib/readingOpenLibraryBook';
export { resolveTodayFixedRoutineKeys } from './lib/resolveTodayFixedRoutineKeys';
export {
  lookupCategoryPlannedDayCount,
  sumCategoryPlannedDaysInRange
} from './lib/routineHistorySnapshot';
export {
  formatRoutineSummaryHint,
  normalizeRoutineSummary,
  readRoutineSummaryFromConfig,
  resolveRoutineSummaryForDisplay, ROUTINE_SUMMARY_MAX
} from './lib/routineSummary';
export { seedPokitWeekTourIntoTodayIfNeeded } from './lib/seedPokitWeekTourIntoToday';
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
  addCategoryToTodayRoutine,
  isCategoryOnTodayPlan,
  listTodayPlanCategoryKeys
} from './lib/todayPlanCategoryPresence';
export {
  buildWaterRoutineReminderSlots,
  waterReminderIntervalMinutes,
  type WaterRoutineReminderSlot
} from './lib/waterReminderRoutineSlots';
export {
  clampWorkStudyImageDisplayHeight, createEmptyTableRows,
  createWorkStudyDocBlock, createWorkStudyNotePage, formatWorkStudyNoteDateLabel,
  formatWorkStudyNoteTitleFromDateKey, getInitialWorkStudyDocument, getWorkStudyActivePage, isLegacyAutoWorkStudyNoteTitle, migrateLegacyWorkContentToDocument,
  normalizeWorkStudyDocBlock,
  normalizeWorkStudyDocument, persistWorkStudyNotePageTitle, resolveWorkStudyImageDisplayHeight, resolveWorkStudyNotePageAutoTitle,
  resolveWorkStudyNotePageLabel,
  resolveWorkStudyNotePagePreview, resolveWorkStudyTextRoleMetrics, setWorkStudyActivePageBlocks, stepWorkStudyImageDisplayHeight, updateWorkStudyNotePageTitle, WORK_STUDY_HEADING_ACCENTS, WORK_STUDY_IMAGE_DEFAULT_DISPLAY_HEIGHT, WORK_STUDY_IMAGE_DISPLAY_HEIGHT_PRESETS, WORK_STUDY_IMAGE_DISPLAY_HEIGHT_STEP, WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT, WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT, WORK_STUDY_TABLE_DEFAULT_COLS, WORK_STUDY_TABLE_DEFAULT_ROWS, WORK_STUDY_TABLE_MAX_COLS, WORK_STUDY_TABLE_MAX_ROWS, WORK_STUDY_TEXT_COLORS, WORK_STUDY_TEXT_ROLE_METRICS, WORK_STUDY_TYPE_SIZE_IDS, workStudyDocumentIsEmpty,
  workStudyDocumentToPlainText,
  workStudyPageBlocksToPlainText
} from './lib/workStudyDocument';
export type {
  WorkStudyBlockKind,
  WorkStudyBlockMarks,
  WorkStudyDocBlock,
  WorkStudyDocument,
  WorkStudyHeadingLevel,
  WorkStudyNotePage,
  WorkStudyTypeSizeId
} from './lib/workStudyDocument';
export {
  buildWorkStudyShareText,
  WORK_STUDY_TASK_PRESETS,
  workStudyModeLabelKo
} from './lib/workStudyPlan';
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
  WORK_STUDY_WEEKDAY_LABELS_KO
} from './lib/workStudySchedule';
export type {
  WorkStudyDdayEvent,
  WorkStudyTimetableSlot,
  WorkStudyWeekday
} from './lib/workStudySchedule';
export {
  appendPriorityCategoryKeysIfMissing,
  notifyFixedFlowApplyScheduleChanged,
  selectFirstPendingBlock,
  syncTodayTabWithFixedRoutineApply,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanChromeSettingsStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore
} from './model';
export type { AddBlockResult, PlanMode, UpdateBlockResult } from './model';
export type { DayPlanBlock, DayPlanQuickMemo, DayPlanTodoItem, DayPlanTodoSubItem, TodoPriority } from './model/types';

