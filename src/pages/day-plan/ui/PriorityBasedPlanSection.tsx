// @ts-nocheck — RN Web에서 StyleSheet.create 타입이 TextStyle|ViewStyle로 합쳐져 Reanimated·제스처와 충돌함
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Reanimated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  blockMatchesPriorityHhmmWindow,
  buildInitialCustomFlowDetailConfig,
  buildPrioritySectionCompletionKey,
  buildSpineTimelineModel,
  clampSpineBlockToPriorityWindow,
  computeSpineGapInsertSlot,
  createCustomFlowCategoryId,
  filterBagTimelineFlowBlocks,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  formatSpineScheduleRangeLabel,
  getFlowCompletionCategoryKeysForBlock,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  isSpineBlockScheduleWithinPriorityWindow,
  isStoredFixedFlowSpineSchedule,
  isSystemCatalogGroupKey,
  localDateToDateKey,
  materializePriorityRoutineOccurrenceKeys,
  parseHHmmToMinutes,
  parseLocalDateKeyToDate,
  parsePrioritySectionCompletionKey,
  resolveBlockCategoryKey,
  resolveCategoryMarkColor,
  resolveCategoryKeyFromLabel,
  resolvePriorityRoutineCategoryKey,
  resolveSpinePriorityWindow,
  formatRoutineSummaryHint,
  readRoutineSummaryFromConfig,
  sortDayPlanBlocks,
  useDayPlanStore,
  useFixedFlowSetsStore,
  type CustomFlowTemplateKey
} from '@entities/day-plan';
import { RetroFlatColors, SOLID_SHADOW_OFFSET } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  formatDateKeyCompact,
  formatDateKeyDisplay,
  formatTimelineHeaderDate,
  formatWeekdayLabel,
  formatWeekdayShort,
  type WeekdayIndex,
} from '@shared/lib/i18n/lib/formatLocale';
import {
  appendCustomFlowCatalogEntry,
  appendRoutineCatalogSelectionKeys,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  isCustomCatalogGroupKey,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  loadSpineDefaultBlockMinutes,
  isPokitWeekTourFlowId,
  loadPokitWeekTourFirstTipSeen,
  resolveCurrentMealSlotFromSchedule,
  saveGoalDetailCategoryConfig,
  saveRoutineCatalogSelectionKeys,
  subscribeCustomFlowCatalog,
  type CategoryMealSlotOverride,
  type DayMealSlot
} from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { COMPLETION_TOGGLE_ANIM_MS } from '@shared/ui/completion-radio-button';
import { DailyQuoteCard } from '@shared/ui/daily-quote-card';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { MealSlotScheduleEditButton, MealSlotTimelineView } from '@widgets/day-plan-meal-slot-timeline';
import { PriorityOrderRow } from '@widgets/day-plan-priority-order';
import { SpineTimelineView } from '@widgets/day-plan-spine-timeline';
import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  isOvernightHhmmRange,
  PICKER_CATEGORIES,
  planDayIntroFromRange,
  PRIMARY,
  priorityClockCaptionDateKeyEnd,
  priorityClockCaptionDateKeyStart,
  sortedPlanDateRange,
} from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { buildAddablePriorityCatalogSections } from '../lib/priorityCatalog';
import {
  resolveBagItemSpineSchedule,
  sortByExplicitSpineStartTime,
} from '../lib/bagRowSpineSchedule';
import { buildCategoryMealSlotOverrides, clampMealSlotSectionsToWindow, flattenPriorityMealSlotSectionEntries, getDayMealSlotLabel, hasExplicitMealSlotAssignments, reorderFlatKeys, reorderMealSlotSectionEntries, splitPriorityMealSlotSections } from '../lib/priorityMealSlotSections';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import { CatalogRowSpineTimePanel, type CatalogRowSpineTimePanelHandle } from './CatalogRowSpineTimePanel';
import { CreateCustomFlowSheet, type CreateCustomFlowPlacement } from './CreateCustomFlowSheet';
import { DayMealSlotScheduleSheet } from './DayMealSlotScheduleSheet';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { PriorityMealSlotAddRoutineRow } from './PriorityMealSlotAddRoutineRow';
import { PriorityMealSlotSectionHeader } from './PriorityMealSlotSectionHeader';
import {
  PriorityRoutinePickerSheet,
  type RoutinePickerConfirmItem,
} from './PriorityRoutinePickerSheet';
import { PriorityBagRowAccordionPanel } from './PriorityBagRowAccordionPanel';
import { SpineBlockEditSheet, type SpineBlockEditDraft } from './SpineBlockEditSheet';
import { TodoListPlanSection } from './TodoListPlanSection';

function resolveCatalogGroupKeyForPersist(raw: string): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  if (isSystemCatalogGroupKey(t)) return t;
  if (listCustomCatalogGroups().some((g) => g.key === t)) return t;
  if (isCustomCatalogGroupKey(t)) return t;
  return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
}

/** 우선순위 행 완료 제거 시: 페이드 아웃 + 아래 행이 부드럽게 올라오는 레이아웃 전환 */
const PRIORITY_ROW_EXITING = FadeOut.duration(280).easing(Easing.out(Easing.cubic));
const PRIORITY_ROW_LAYOUT = LinearTransition.duration(320).easing(Easing.out(Easing.cubic));

function partitionDisplayWithDeferredBottom<T>(
  items: T[],
  resolveKey: (item: T) => string,
  isDone: (item: T) => boolean,
  deferredKeys: ReadonlySet<string>,
): T[] {
  const active: T[] = [];
  const done: T[] = [];
  for (const item of items) {
    const key = resolveKey(item);
    if (!isDone(item) || deferredKeys.has(key)) {
      active.push(item);
    } else {
      done.push(item);
    }
  }
  return [...active, ...done];
}

import { useDayPlanDraftStore } from '@entities/day-plan';
import type { CustomCatalogGroup, CustomFlowCatalogEntry } from '@shared/lib/storage';
import { DAY_PLAN_TAB_BAR_ROW_HEIGHT } from './DayPlanCustomTabBar';

/** 타임라인 내부 스크롤 하단 — 리스트와 카드 둥근 하단 사이 최소만 */
const TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM = 8;

function toMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function weekdayShortFromDateKey(dk: string, locale?: import('@shared/lib/i18n').AppLocale): string {
  const d = parseLocalDateKeyToDate(dk);
  if (!d) return '';
  return formatWeekdayShort(d, locale);
}

/** 우선 순위 집중 구간 한 줄 — 날짜 경계를 넘는 종료에는 실제 날짜를 표시 */
function formatPriorityWindowLine(
  start: string,
  end: string,
  dateKey: string,
  dateKeyEnd: string,
  locale?: import('@shared/lib/i18n').AppLocale,
): string {
  const overnight = isOvernightHhmmRange(start, end);
  const ps = parseHHmmToMinutes(start.trim());
  const pe = parseHHmmToMinutes(end.trim());
  if (ps === null || pe === null) return '';
  const eStr = formatMinuteOfDayKo(pe);
  if (overnight || pe === 24 * 60) {
    const rangeHi = dateKey <= dateKeyEnd ? dateKeyEnd : dateKey;
    const endDateKey = pe === 24 * 60 ? addDaysToLocalDateKey(rangeHi, 1) : rangeHi;
    return `${formatMinuteOfDayKo(ps)} — ${formatDateKeyDisplay(endDateKey, locale)} ${eStr}`;
  }
  return `${formatMinuteOfDayKo(ps)} — ${eStr}`;
}

/** 자정 넘김 ‘종료일’ 열 — 이날 새벽에 끝나는 시각만 강조(다음날 문구 없이) */
function formatOvernightTailEndHeadline(end: string): string {
  const pe = parseHHmmToMinutes(end.trim());
  if (pe === null) return '';
  return formatMinuteOfDayKo(pe);
}

/** 타임라인 헤더 — 하루 시작·마무리 시각(탭 시 모달) */
function PriorityWindowTimeChip({
  line,
  ink,
  muted,
  chipBg,
  chipBgPressed,
  borderColor,
  onPress,
}: {
  line: string;
  ink: string;
  muted: string;
  chipBg: string;
  chipBgPressed: string;
  borderColor: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('dayPlan.dayWindowA11y', { line })}
      accessibilityHint={t('dayPlan.dayWindowHint')}
      style={({ pressed }) => [
        styles.priorityTimelineTimeChip,
        {
          backgroundColor: pressed ? chipBgPressed : chipBg,
          borderColor,
        },
      ]}>
      <IconSymbol name="clock" size={11} color={muted} />
      <ThemedText
        style={[styles.priorityTimelineSub, styles.priorityTimelineTimeTap, { color: ink }]}
        lightColor={ink}
        darkColor={ink}
        numberOfLines={2}>
        {line}
      </ThemedText>
    </Pressable>
  );
}

function buildCalendarDays(monthStart: Date): Date[] {
  const firstWeekdayMondayZero = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekdayMondayZero);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function normalizeToDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsedFromKey = parseLocalDateKeyToDate(value);
    if (parsedFromKey) return parsedFromKey;
    const parsedNative = new Date(value);
    if (Number.isFinite(parsedNative.getTime())) return parsedNative;
  }
  if (typeof value === 'number') {
    const parsedNative = new Date(value);
    if (Number.isFinite(parsedNative.getTime())) return parsedNative;
  }
  return fallback;
}

/** 다이어리 북 — 배경은 `dayPlanPalette` zinc 회색 컨테이너 톤(검정 단색 고정 없음) */
function bookColors(c: DayPlanPalette, isDark: boolean) {
  if (isDark) {
    return {
      cover: c.containerLow,
      crease: c.catBorderIdle,
      ink: c.onSurface,
      inkMuted: c.onVariant,
      ribbon: c.containerLow,
      ribbonMuted: c.onVariant,
    };
  }
  return {
    cover: c.containerLow,
    crease: c.catBorderIdle,
    ink: c.onSurface,
    inkMuted: c.onVariant,
    ribbon: c.containerLow,
    ribbonMuted: c.onVariant,
  };
}

type Props = {
  c: DayPlanPalette;
  isFocusStarted: boolean;
  /** 우선 순위 일정 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  onChangePriorityPlanDateKey: (v: string) => void;
  /** 우선 순위 일정 적용 기간 종료일 (YYYY-MM-DD) */
  priorityPlanDateKeyEnd: string;
  onChangePriorityPlanDateKeyEnd: (v: string) => void;
  /** 달력에서 기간 적용 시(명시 다중일·자동 플래그 포함) */
  applyPriorityPlanCalendarRange: (lo: string, hi: string) => void;
  /** 달력에서 서로 다른 날짜로 구간을 잡은 경우 — 시계 박스에만 짧은 날짜 표시 */
  priorityPlanExplicitMultiDay: boolean;
  priorityStart: string;
  priorityEnd: string;
  onChangePriorityStart: (v: string) => void;
  onChangePriorityEnd: (v: string) => void;
  priorityCategoryOrder: string[];
  onSelectCategory: (key: string) => void;
  /** 목록 행에서 상세 설정 열기 — categoryKey를 전달 */
  onOpenCategorySettings?: (categoryKey: string) => void;
  /**
   * 타임라인 일정 수정 시트에 끼울 루틴 설정 본문.
   * app에서 GoalDetail 패널을 주입한다(페이지 간 import 회피).
   */
  renderRoutineInlineSettings?: (
    categoryKey: string,
    theme: { ink: string; muted: string; border: string; isDark: boolean },
  ) => ReactNode;
  /** 시작 후 목록 행에서 몰입 상세 열기 */
  onOpenFocusDetail?: (categoryKey: string) => void;
  /** 구간 미설정 안내 → 오늘의 루틴 탭 */
  onOpenFixedRoutine?: () => void;
  layoutMode: DayPlanLayoutMode;
  onSelectLayoutMode: (mode: DayPlanLayoutMode) => void;
  visibleLayoutModes?: readonly DayPlanLayoutMode[];
  /** true면 헤더는 유지하고 본문만 투두 리스트로 표시 */
  showTodoList?: boolean;
  /** 헤더 목록 아이콘 — 투두에서 담기 목록으로 복귀 */
  onExitTodoList?: () => void;
  /** 헤더 레이아웃 탭 옆 투두 아이콘 — 탭하면 todoList 모드로 전환 */
  onPressTodoList?: () => void;
};

/* ─── 메인 ─── */

export function PriorityBasedPlanSection({
  c,
  isFocusStarted,
  priorityPlanDateKey,
  onChangePriorityPlanDateKey,
  priorityPlanDateKeyEnd,
  onChangePriorityPlanDateKeyEnd,
  applyPriorityPlanCalendarRange,
  priorityPlanExplicitMultiDay,
  priorityStart,
  priorityEnd,
  onChangePriorityStart,
  onChangePriorityEnd,
  priorityCategoryOrder,
  onSelectCategory,
  onOpenCategorySettings,
  renderRoutineInlineSettings,
  onOpenFocusDetail,
  onOpenFixedRoutine,
  layoutMode,
  onSelectLayoutMode,
  visibleLayoutModes,
  showTodoList = false,
  onExitTodoList,
  onPressTodoList,
}: Props) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const bc = bookColors(c, isDark);

  const todayKey = getLocalDateKey();

  const [iosDateModalOpen, setIosDateModalOpen] = useState(false);
  const [bagRowTimeEdit, setBagRowTimeEdit] = useState<{
    rowKey: string;
    categoryKey: string;
    label: string;
    startMinutes: number;
    endMinutes: number;
    endsNextCalendarDay: boolean;
  } | null>(null);
  const [bagRowTimeModalKey, setBagRowTimeModalKey] = useState(0);
  const bagRowTimePanelRef = useRef<CatalogRowSpineTimePanelHandle>(null);
  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()));
  const [draftRangeStart, setDraftRangeStart] = useState(priorityPlanDateKey);
  const [draftRangeEnd, setDraftRangeEnd] = useState(priorityPlanDateKeyEnd);
  /** null이 아니면 첫 번째로 택한 날(스토어 미반영) — 다음 탭이 범위의 다른 끝 */
  const [calendarRangeAnchor, setCalendarRangeAnchor] = useState<string | null>(null);
  const [spineEditDraft, setSpineEditDraft] = useState<SpineBlockEditDraft | null>(null);
  const [spineDragActive, setSpineDragActive] = useState(false);
  const [expandedBagRowKeys, setExpandedBagRowKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  /** 첫 튜토리얼 팁은 아코디언 본문에 있음 → 아직 안 본 경우에만 투어 행을 열어 시트가 뜨게 함 */
  useEffect(() => {
    if (loadPokitWeekTourFirstTipSeen()) return;
    const tourKey = priorityCategoryOrder.find((key) =>
      isPokitWeekTourFlowId(resolvePriorityRoutineCategoryKey(key)),
    );
    if (!tourKey) return;
    setExpandedBagRowKeys((prev) => {
      if (prev.has(tourKey)) return prev;
      const next = new Set(prev);
      next.add(tourKey);
      return next;
    });
  }, [priorityCategoryOrder]);

  const monthFallbackDate = useMemo(() => {
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    return parseLocalDateKeyToDate(lo) ?? new Date();
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd]);

  const safeMonthCursor = useMemo(
    () => toMonthStart(normalizeToDate(monthCursor, monthFallbackDate)),
    [monthCursor, monthFallbackDate],
  );

  const openPlanDatePicker = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    const hi =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
    setDraftRangeStart(lo);
    setDraftRangeEnd(hi);
    /** 하루만 잡혀 있으면 열자마자 「시작」 단계로 두어, 바로 시작 UI가 보이게 함 */
    setCalendarRangeAnchor(lo === hi ? lo : null);
    setMonthCursor(toMonthStart(parseLocalDateKeyToDate(lo) ?? new Date()));
    setIosDateModalOpen(true);
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd]);

  const onDraftDayPress = useCallback(
    (dateKey: string) => {
      void Haptics.selectionAsync();
      if (calendarRangeAnchor === null) {
        setDraftRangeStart(dateKey);
        setDraftRangeEnd(dateKey);
        setCalendarRangeAnchor(dateKey);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      const lo = dateKey < calendarRangeAnchor ? dateKey : calendarRangeAnchor;
      const hi = dateKey < calendarRangeAnchor ? calendarRangeAnchor : dateKey;
      setDraftRangeStart(lo);
      setDraftRangeEnd(hi);
      setCalendarRangeAnchor(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [calendarRangeAnchor],
  );

  const onConfirmCalendarRange = useCallback(() => {
    const lo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
    const hi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
    applyPriorityPlanCalendarRange(lo, hi);
    setCalendarRangeAnchor(null);
    setIosDateModalOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftRangeStart, draftRangeEnd, applyPriorityPlanCalendarRange]);

  const jumpToTodayInCalendar = useCallback(() => {
    const now = new Date();
    setMonthCursor(toMonthStart(now));
    void Haptics.selectionAsync();
    onDraftDayPress(getLocalDateKey(now));
  }, [onDraftDayPress]);

  /** 모달 안 선택만 오늘 하루·시작 단계로 되돌림 (스토어 반영은 설정 완료 시) */
  const resetCalendarDraftToToday = useCallback(() => {
    const now = new Date();
    const tk = getLocalDateKey(now);
    setMonthCursor(toMonthStart(now));
    setDraftRangeStart(tk);
    setDraftRangeEnd(tk);
    setCalendarRangeAnchor(tk);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const modalDraftRange = useMemo(() => {
    const lo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
    const hi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
    return {
      lo,
      hi,
      loCompact: formatDateKeyCompact(lo, locale),
      hiCompact: formatDateKeyCompact(hi, locale),
      isSingle: lo === hi,
    };
  }, [draftRangeStart, draftRangeEnd, locale]);

  useEffect(() => {
    if (iosDateModalOpen) return;
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    const hi =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
    setDraftRangeStart(lo);
    setDraftRangeEnd(hi);
    setCalendarRangeAnchor(null);
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd, iosDateModalOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(safeMonthCursor), [safeMonthCursor]);
  const monthTitle = t('dayPlan.monthTitle', {
    year: safeMonthCursor.getFullYear(),
    month: safeMonthCursor.getMonth() + 1,
  });
  const weekdayLabels = useMemo(() => {
    const order: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 0];
    return order.map((index) => formatWeekdayLabel(index, locale));
  }, [locale]);

  /** 목표 상세·커스텀 라벨 갱신 — 설정 화면에서 돌아올 때 */
  const [categoryHintTick, setCategoryHintTick] = useState(0);
  /** 구간별 `isCurrent` / 타임라인 「지금」 — 분 단위로 갱신 */
  const [mealSlotNowTick, setMealSlotNowTick] = useState(0);
  useEffect(() => {
    const bump = () => setMealSlotNowTick((n) => n + 1);
    // 다음 분 경계에 맞춘 뒤 60초마다 갱신
    const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      bump();
      intervalId = setInterval(bump, 60_000);
    }, msToNextMinute);
    const onAppState = (state: string) => {
      if (state === 'active') bump();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      sub.remove();
    };
  }, []);
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  useFocusEffect(
    useCallback(() => {
      registerOtherCategoryResolverFromStorage();
      setCategoryHintTick((n) => n + 1);
      setMealSlotNowTick((n) => n + 1);
    }, []),
  );

  const selectedItems = useMemo(
    () =>
      priorityCategoryOrder
        .map((key) => {
          const base = getPickerCategoryItem(key);
          if (!base) return null;
          return { ...base, label: getPickerCategoryLabel(key) };
        })
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [priorityCategoryOrder, categoryHintTick, categoryLabelEpoch],
  );

  const bagCount = selectedItems.length;

  const {
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
    addFocusCategoryCompleted,
    toggleFocusCategoryCompleted,
    filterCompletedFocusKeysToPriorityOrder,
    addPlanCompletionDismissedKey,
    clearPlanCompletionDismissedKeys,
    setPriorityCategoryOrder,
    priorityMealSlotLayoutEnabled,
    setPriorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled,
    setPrioritySpineLayoutEnabled,
    priorityMealSlotOverrides,
    setPriorityMealSlotOverride,
    prioritySectionsMealSlots,
    mergePrioritySectionsMealSlots,
    addPrioritySectionMealSlot,
    setPrioritySectionsMealSlots,
    migrateSectionCompletionOnSlotMove,
    finishPriorityCategoryForToday,
    priorityCategoryImportance,
    setPriorityCategoryMarkColor,
    prioritySectionsCategoryOrder,
    appendPrioritySectionsCategoryKeys,
    setPrioritySectionsCategoryOrder,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
      addFocusCategoryCompleted: s.addFocusCategoryCompleted,
      toggleFocusCategoryCompleted: s.toggleFocusCategoryCompleted,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
      addPlanCompletionDismissedKey: s.addPlanCompletionDismissedKey,
      clearPlanCompletionDismissedKeys: s.clearPlanCompletionDismissedKeys,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
      setPriorityMealSlotLayoutEnabled: s.setPriorityMealSlotLayoutEnabled,
      prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
      setPrioritySpineLayoutEnabled: s.setPrioritySpineLayoutEnabled,
      priorityMealSlotOverrides: s.priorityMealSlotOverrides,
      setPriorityMealSlotOverride: s.setPriorityMealSlotOverride,
      prioritySectionsMealSlots: s.prioritySectionsMealSlots,
      mergePrioritySectionsMealSlots: s.mergePrioritySectionsMealSlots,
      addPrioritySectionMealSlot: s.addPrioritySectionMealSlot,
      setPrioritySectionsMealSlots: s.setPrioritySectionsMealSlots,
      migrateSectionCompletionOnSlotMove: s.migrateSectionCompletionOnSlotMove,
      finishPriorityCategoryForToday: s.finishPriorityCategoryForToday,
      priorityCategoryImportance: s.priorityCategoryImportance,
      setPriorityCategoryMarkColor: s.setPriorityCategoryMarkColor,
      prioritySectionsCategoryOrder: s.prioritySectionsCategoryOrder,
      appendPrioritySectionsCategoryKeys: s.appendPrioritySectionsCategoryKeys,
      setPrioritySectionsCategoryOrder: s.setPrioritySectionsCategoryOrder,
    })),
  );
  const [lastAddedCategoryKey, setLastAddedCategoryKey] = useState<string | null>(null);
  /** 순서 드래그 직후에만 Reanimated layout 전환 — 드래그 중 state 변경 시 제스처가 끊김 */
  const [priorityRowLayoutAnim, setPriorityRowLayoutAnim] = useState(false);
  const [deferredBottomReorderKeys, setDeferredBottomReorderKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const deferredReorderTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const priorityTimelineScrollRef = useRef<ScrollView>(null);
  const priorityReorderDragActiveRef = useRef(false);
  const [mealSlotScheduleSheetOpen, setMealSlotScheduleSheetOpen] = useState(false);
  const [mealSlotScheduleFocusSlot, setMealSlotScheduleFocusSlot] = useState<DayMealSlot | null>(
    null,
  );
  const [addRoutineSheetOpen, setAddRoutineSheetOpen] = useState(false);
  const [addRoutineTargetSlot, setAddRoutineTargetSlot] = useState<DayMealSlot | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createSheetGroupKey, setCreateSheetGroupKey] = useState<string | undefined>(undefined);
  const [spinePendingGapBounds, setSpinePendingGapBounds] = useState<{
    fromMinutes: number;
    toMinutes: number;
  } | null>(null);
  const [catalogTick, setCatalogTick] = useState(0);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>(() =>
    listAllCustomFlowCatalogEntries(),
  );
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>(() =>
    listCustomCatalogGroups(),
  );
  const {
    schedule: mealSlotSchedule,
    persistSchedule: persistMealSlotSchedule,
    syncWithPriorityWindow: syncMealSlotScheduleWithPriorityWindow,
    revision: mealSlotScheduleRevision,
  } = useDayMealSlotSchedule();

  useEffect(() => {
    syncMealSlotScheduleWithPriorityWindow(
      priorityStart,
      priorityEnd,
      isOvernightHhmmRange(priorityStart, priorityEnd),
    );
  }, [priorityStart, priorityEnd, syncMealSlotScheduleWithPriorityWindow]);

  const priorityBagRowHeightRef = useRef(52);

  const setPriorityTimelineScrollEnabled = useCallback((enabled: boolean) => {
    priorityTimelineScrollRef.current?.setNativeProps?.({ scrollEnabled: enabled });
  }, []);

  const lockPriorityTimelineScroll = useCallback(() => {
    priorityReorderDragActiveRef.current = true;
    setPriorityTimelineScrollEnabled(false);
  }, [setPriorityTimelineScrollEnabled]);

  const unlockPriorityTimelineScroll = useCallback(() => {
    priorityReorderDragActiveRef.current = false;
    if (!spineDragActive) {
      setPriorityTimelineScrollEnabled(true);
    }
  }, [setPriorityTimelineScrollEnabled, spineDragActive]);

  const planBlocks = useDayPlanStore((s) => s.blocks);

  const fixedFlowSets = useFixedFlowSetsStore((s) => s.sets);
  const fixedFlowActiveSetIds = useFixedFlowSetsStore((s) => s.activeSetIds);
  const fixedFlowSpineActiveSetIds = useFixedFlowSetsStore(
    (s) => s.activeSetIdsByLayoutMode.spine,
  );
  const activeMealSlotsBySetId = useFixedFlowSetsStore((s) => s.activeMealSlotsBySetId);
  const todayAppliedCategoryKeys = useFixedFlowSetsStore((s) => s.todayAppliedCategoryKeys);
  const setCategorySpineScheduleInAnySet = useFixedFlowSetsStore(
    (s) => s.setCategorySpineScheduleInAnySet,
  );
  const dayPlanDateKey = useDayPlanStore((s) => s.dateKey);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const addPlanBlock = useDayPlanStore((s) => s.addBlock);
  const updatePlanBlock = useDayPlanStore((s) => s.updateBlock);
  const removePlanBlock = useDayPlanStore((s) => s.removeBlock);
  const reorderSpineBlocks = useDayPlanStore((s) => s.reorderSpineTimelineBlocks);
  const completePlanBlock = useDayPlanStore((s) => s.completeBlock);
  const uncompletePlanBlock = useDayPlanStore((s) => s.uncompleteBlock);

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(planBlocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key = resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [planBlocks, completedBlockIds, skippedBlockIds]);

  /** 집중 종료 시 플랜 완료 무시 목록 초기화 — 다음 세션에서 다시 일정 완료 반영 */
  useEffect(() => {
    if (!isFocusStarted) {
      clearPlanCompletionDismissedKeys();
    }
  }, [isFocusStarted, clearPlanCompletionDismissedKeys]);

  useEffect(() => {
    filterCompletedFocusKeysToPriorityOrder(priorityCategoryOrder);
  }, [priorityCategoryOrder, filterCompletedFocusKeysToPriorityOrder]);

  useEffect(() => {
    if (!lastAddedCategoryKey) return;
    const timer = setTimeout(() => setLastAddedCategoryKey(null), 450);
    return () => clearTimeout(timer);
  }, [lastAddedCategoryKey]);

  useEffect(() => {
    setPriorityRowLayoutAnim(false);
  }, [layoutMode]);

  useEffect(() => {
    const timers = deferredReorderTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const scheduleDeferredMoveToBottom = useCallback((itemKey: string) => {
    const existing = deferredReorderTimersRef.current.get(itemKey);
    if (existing) clearTimeout(existing);

    setDeferredBottomReorderKeys((prev) => {
      const next = new Set(prev);
      next.add(itemKey);
      return next;
    });

    const timer = setTimeout(() => {
      deferredReorderTimersRef.current.delete(itemKey);
      setDeferredBottomReorderKeys((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
      setPriorityRowLayoutAnim(true);
    }, COMPLETION_TOGGLE_ANIM_MS);

    deferredReorderTimersRef.current.set(itemKey, timer);
  }, []);

  const releaseDeferredMoveToBottom = useCallback((itemKey: string) => {
    const existing = deferredReorderTimersRef.current.get(itemKey);
    if (existing) {
      clearTimeout(existing);
      deferredReorderTimersRef.current.delete(itemKey);
    }
    setDeferredBottomReorderKeys((prev) => {
      if (!prev.has(itemKey)) return prev;
      const next = new Set(prev);
      next.delete(itemKey);
      return next;
    });
    setPriorityRowLayoutAnim(true);
  }, []);

  useEffect(() => {
    if (spineDragActive) {
      setPriorityTimelineScrollEnabled(false);
      return;
    }
    if (!priorityReorderDragActiveRef.current) {
      setPriorityTimelineScrollEnabled(true);
    }
  }, [spineDragActive, setPriorityTimelineScrollEnabled]);

  const isPriorityRowCompleted = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(categoryKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedFocusCategoryKeys,
      completedCategoryKeysFromPlan,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  const isPrioritySectionItemCompleted = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const completionKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (completedFocusCategoryKeys.includes(completionKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(completionKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedFocusCategoryKeys,
      completedCategoryKeysFromPlan,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  /**
   * 미완료는 위·완료는 아래. 각 그룹 안에서는 설정한 시작 시각 오름차순
   * (미설정은 그 그룹의 뒤).
   */
  const orderedSelectedItemsForDisplay = useMemo(() => {
    const resolveSchedule = (categoryKey: string) =>
      resolveBagItemSpineSchedule({
        categoryKey,
        planBlocks,
        fixedFlowSets,
        priorityStart,
        priorityEnd,
      });
    const partitioned = partitionDisplayWithDeferredBottom(
      selectedItems,
      (cat) => cat.key,
      (cat) => isPriorityRowCompleted(cat.key),
      deferredBottomReorderKeys,
    );
    let split = 0;
    for (const item of partitioned) {
      if (isPriorityRowCompleted(item.key) && !deferredBottomReorderKeys.has(item.key)) break;
      split += 1;
    }
    return [
      ...sortByExplicitSpineStartTime(partitioned.slice(0, split), (cat) => cat.key, resolveSchedule),
      ...sortByExplicitSpineStartTime(partitioned.slice(split), (cat) => cat.key, resolveSchedule),
    ];
  }, [
    deferredBottomReorderKeys,
    selectedItems,
    isPriorityRowCompleted,
    planBlocks,
    fixedFlowSets,
    priorityStart,
    priorityEnd,
  ]);

  const sectionsCatalogItems = useMemo(
    () =>
      prioritySectionsCategoryOrder
        .map((key) => {
          const base = getPickerCategoryItem(key);
          if (!base) return null;
          return { ...base, label: getPickerCategoryLabel(key) };
        })
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [prioritySectionsCategoryOrder, categoryHintTick, categoryLabelEpoch],
  );

  const sectionsCount = sectionsCatalogItems.length;

  const sectionsLayoutItems = useMemo(() => {
    const resolveSchedule = (categoryKey: string) =>
      resolveBagItemSpineSchedule({
        categoryKey,
        planBlocks,
        fixedFlowSets,
        priorityStart,
        priorityEnd,
      });
    const partitioned = partitionDisplayWithDeferredBottom(
      sectionsCatalogItems,
      (cat) => cat.key,
      (cat) => isPriorityRowCompleted(cat.key),
      deferredBottomReorderKeys,
    );
    let split = 0;
    for (const item of partitioned) {
      if (isPriorityRowCompleted(item.key) && !deferredBottomReorderKeys.has(item.key)) break;
      split += 1;
    }
    return [
      ...sortByExplicitSpineStartTime(partitioned.slice(0, split), (cat) => cat.key, resolveSchedule),
      ...sortByExplicitSpineStartTime(partitioned.slice(split), (cat) => cat.key, resolveSchedule),
    ];
  }, [
    deferredBottomReorderKeys,
    sectionsCatalogItems,
    isPriorityRowCompleted,
    planBlocks,
    fixedFlowSets,
    priorityStart,
    priorityEnd,
  ]);

  const priorityOrderIndexByKey = useMemo(() => {
    const source = priorityMealSlotLayoutEnabled ? sectionsLayoutItems : selectedItems;
    return new Map(source.map((item, index) => [item.key, index]));
  }, [priorityMealSlotLayoutEnabled, sectionsLayoutItems, selectedItems]);

  const sectionsMealSlotMap = useMemo(
    () => new Map<string, DayMealSlot[]>(Object.entries(prioritySectionsMealSlots)),
    [prioritySectionsMealSlots],
  );

  const mealSlotOverrides = useMemo(() => {
    const map = buildCategoryMealSlotOverrides({
      sets: fixedFlowSets,
      activeSetIds: fixedFlowActiveSetIds,
      activeMealSlotsBySetId,
      todayAppliedCategoryKeys,
    });
    for (const [key, slot] of Object.entries(priorityMealSlotOverrides)) {
      map.set(key, slot);
    }
    return map as Map<string, CategoryMealSlotOverride>;
  }, [fixedFlowSets, fixedFlowActiveSetIds, activeMealSlotsBySetId, priorityMealSlotOverrides, todayAppliedCategoryKeys]);

  const hasExplicitMealSlots = useMemo(
    () => hasExplicitMealSlotAssignments(orderedSelectedItemsForDisplay, mealSlotOverrides),
    [orderedSelectedItemsForDisplay, mealSlotOverrides],
  );

  const layoutMealSlotOverrides = priorityMealSlotLayoutEnabled
    ? (sectionsMealSlotMap as Map<string, CategoryMealSlotOverride>)
    : mealSlotOverrides;

  const priorityMealSlotLayout = useMemo(() => {
    const layoutItems = priorityMealSlotLayoutEnabled
      ? sectionsLayoutItems
      : orderedSelectedItemsForDisplay;
    return splitPriorityMealSlotSections(layoutItems, {
      nowMin: getLocalMinutesOfDayNow(),
      mealSlotOverrides: layoutMealSlotOverrides,
      schedule: mealSlotSchedule,
      orderIndexByKey: priorityOrderIndexByKey,
      explicitSlotsOnly: priorityMealSlotLayoutEnabled ? true : hasExplicitMealSlots,
      includeEmptySections: priorityMealSlotLayoutEnabled,
    });
  }, [
    orderedSelectedItemsForDisplay,
    sectionsLayoutItems,
    priorityOrderIndexByKey,
    categoryHintTick,
    mealSlotNowTick,
    layoutMealSlotOverrides,
    mealSlotSchedule,
    mealSlotScheduleRevision,
    hasExplicitMealSlots,
    priorityMealSlotLayoutEnabled,
  ]);

  const priorityMealSlotSections = priorityMealSlotLayout.sections;
  const slottedPriorityEntries = useMemo(
    () => flattenPriorityMealSlotSectionEntries(priorityMealSlotSections),
    [priorityMealSlotSections],
  );
  const fullBagCount = orderedSelectedItemsForDisplay.length;

  const openMealSlotScheduleEditor = useCallback((slot?: DayMealSlot | null) => {
    setMealSlotScheduleFocusSlot(slot ?? null);
    setMealSlotScheduleSheetOpen(true);
  }, []);

  const handleHeaderLayoutModeSelect = useCallback(
    (mode: DayPlanLayoutMode) => {
      if (showTodoList && mode === 'bag') {
        onExitTodoList?.();
        return;
      }
      onSelectLayoutMode(mode);
    },
    [onExitTodoList, onSelectLayoutMode, showTodoList],
  );

  const headerSuffixTabs = useMemo(
    () =>
      onPressTodoList
        ? [
          {
            key: 'todo',
            icon: 'checklist',
            active: showTodoList,
            onPress: onPressTodoList,
            accessibilityLabel: t('dayPlan.todoListA11y'),
          },
        ]
        : [],
    [onPressTodoList, showTodoList, t],
  );

  const alertSpineBlockSaveError = useCallback(
    (action: 'add' | 'update', reason: string) => {
      const title = action === 'add' ? t('dayPlan.blockAddTitle') : t('dayPlan.blockEditTitle');
      if (reason === 'empty_title') {
        Alert.alert(title, t('dayPlan.blockNeedTitle'));
        return;
      }
      if (reason === 'in_the_past') {
        Alert.alert(title, t('dayPlan.blockEndFuture'));
        return;
      }
      if (reason === 'overlap') {
        Alert.alert(title, t('dayPlan.blockOverlap'));
        return;
      }
      if (reason === 'invalid_range') {
        Alert.alert(title, t('dayPlan.blockEndAfterStart'));
        return;
      }
      if (reason === 'outside_window') {
        Alert.alert(
          title,
          t('dayPlan.blockExceedsEnd', { end: formatHhmmClockKo(priorityEnd) }),
        );
        return;
      }
      Alert.alert(title, t('dayPlan.blockSaveFailed'));
    },
    [priorityEnd, t],
  );

  const reloadRoutineCatalog = useCallback(() => {
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
    setCatalogTick((n) => n + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadRoutineCatalog();
    }, [reloadRoutineCatalog]),
  );

  useEffect(
    () => subscribeCustomFlowCatalog(reloadRoutineCatalog),
    [reloadRoutineCatalog],
  );

  useEffect(() => {
    if (!addRoutineSheetOpen) return;
    reloadRoutineCatalog();
  }, [addRoutineSheetOpen, reloadRoutineCatalog]);

  const addableRoutineSections = useMemo(() => {
    void catalogTick;
    return buildAddablePriorityCatalogSections({
      // 이미 담긴 루틴도 다시 추가할 수 있도록 항상 전체 카탈로그를 보여준다.
      excludedKeys: new Set<string>(),
      customFlowEntries,
      customGroups,
    });
  }, [
    catalogTick,
    customFlowEntries,
    customGroups,
  ]);

  const openAddRoutineForSlot = useCallback((slot: DayMealSlot) => {
    setSpinePendingGapBounds(null);
    setAddRoutineTargetSlot(slot);
    setAddRoutineSheetOpen(true);
  }, []);

  const openAddRoutineForBag = useCallback(() => {
    setSpinePendingGapBounds(null);
    setAddRoutineTargetSlot(null);
    setAddRoutineSheetOpen(true);
  }, []);

  const clearAddRoutineTargetContext = useCallback(() => {
    setAddRoutineTargetSlot(null);
    setSpinePendingGapBounds(null);
  }, []);

  const handleConfirmAddRoutinesToSlot = useCallback(
    (items: RoutinePickerConfirmItem[]) => {
      if (items.length === 0) return;

      const allHaveSpineSchedule = items.every((item) => item.schedule != null);
      if (allHaveSpineSchedule) {
        const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
        const addedKeys: string[] = [];

        for (const item of items) {
          const schedule = item.schedule;
          if (!schedule) break;

          const endsNext = Boolean(schedule.endsNextCalendarDay);

          if (
            !window ||
            !isSpineBlockScheduleWithinPriorityWindow(
              {
                startMinutes: schedule.startMinutes,
                endMinutes: schedule.endMinutes,
                endsNextCalendarDay: endsNext,
              },
              window,
            )
          ) {
            alertSpineBlockSaveError('add', 'outside_window');
            break;
          }

          const label = getPickerCategoryLabel(item.key);
          const result = addPlanBlock({
            title: label,
            category: label,
            categoryKey: item.key,
            startMinutes: schedule.startMinutes,
            endMinutes: schedule.endMinutes,
            endsNextCalendarDay: endsNext,
            blockOrigin: 'spineTimeline',
            planDateKey: getLocalDateKey(),
          });
          if (!result.ok) {
            if (addedKeys.length === 0) {
              alertSpineBlockSaveError('add', result.reason);
            }
            break;
          }
          addedKeys.push(item.key);
        }

        if (addedKeys.length > 0) {
          appendRoutineCatalogSelectionKeys(addedKeys);
          setLastAddedCategoryKey(addedKeys[addedKeys.length - 1] ?? null);
        }
        setSpinePendingGapBounds(null);
        return;
      }

      const categoryKeys = items.map((item) =>
        resolvePriorityRoutineCategoryKey(item.key),
      );

      if (addRoutineTargetSlot) {
        const slot = addRoutineTargetSlot;
        const occurrenceKeys = materializePriorityRoutineOccurrenceKeys(
          categoryKeys,
          prioritySectionsCategoryOrder,
        );
        appendPrioritySectionsCategoryKeys(occurrenceKeys);
        occurrenceKeys.forEach((key) => {
          addPrioritySectionMealSlot(key, slot);
        });
        appendRoutineCatalogSelectionKeys(categoryKeys);
        setLastAddedCategoryKey(occurrenceKeys[occurrenceKeys.length - 1] ?? null);
      } else {
        const occurrenceKeys = materializePriorityRoutineOccurrenceKeys(
          categoryKeys,
          priorityCategoryOrder,
        );
        setPriorityCategoryOrder((current) => [...current, ...occurrenceKeys]);
        appendRoutineCatalogSelectionKeys(categoryKeys);
        setLastAddedCategoryKey(occurrenceKeys[occurrenceKeys.length - 1] ?? null);
      }
    },
    [
      addPlanBlock,
      addRoutineTargetSlot,
      addPrioritySectionMealSlot,
      alertSpineBlockSaveError,
      appendPrioritySectionsCategoryKeys,
      priorityCategoryOrder,
      priorityEnd,
      prioritySectionsCategoryOrder,
      priorityStart,
      setPriorityCategoryOrder,
    ],
  );

  const handleCreateCustomFlow = useCallback(
    ({
      name,
      groupKey,
      icon,
      accentColor,
      templateKey,
      summary,
      templateDataConfig,
      mealSlot,
      schedule,
    }: {
      name: string;
      groupKey: string;
      icon: string;
      accentColor: string;
      templateKey: CustomFlowTemplateKey;
      summary?: string;
      templateDataConfig?: unknown;
      mealSlot?: DayMealSlot;
      schedule?: {
        startMinutes: number;
        endMinutes: number;
        endsNextCalendarDay?: boolean;
      };
    }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
      const trimmed = name.trim();
      const next = buildInitialCustomFlowDetailConfig(templateKey, {
        ...(trimmed.length > 0 ? { displayName: trimmed } : {}),
        ...(typeof summary === 'string' && summary.trim().length > 0
          ? { summary: summary.trim() }
          : {}),
        icon,
        accentColor,
        ...(templateDataConfig ? { templateSeed: templateDataConfig } : {}),
      });
      saveGoalDetailCategoryConfig(id, next);
      if (templateKey === 'reminder') {
        void persistReminderTemplateNotificationRule(id, next);
      }
      appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });
      registerOtherCategoryResolverFromStorage();
      void loadGoalDetailCategoryConfig(id);
      reloadRoutineCatalog();

      // 카탈로그 저장 후 현재 레이아웃 모드에 바로 담기
      if (schedule) {
        handleConfirmAddRoutinesToSlot([
          {
            key: id,
            schedule: {
              startMinutes: schedule.startMinutes,
              endMinutes: schedule.endMinutes,
              endsNextCalendarDay: Boolean(schedule.endsNextCalendarDay),
            },
          },
        ]);
      } else if (mealSlot) {
        appendPrioritySectionsCategoryKeys([id]);
        addPrioritySectionMealSlot(id, mealSlot);
        appendRoutineCatalogSelectionKeys([id]);
        setLastAddedCategoryKey(id);
      } else if (spinePendingGapBounds) {
        const slot = computeSpineGapInsertSlot(
          spinePendingGapBounds.fromMinutes,
          spinePendingGapBounds.toMinutes,
          planBlocks,
          getLocalMinutesOfDayNow(),
          loadSpineDefaultBlockMinutes(),
          1,
          priorityStart,
          priorityEnd,
        );
        if (slot) {
          handleConfirmAddRoutinesToSlot([
            {
              key: id,
              schedule: {
                startMinutes: slot.startMinutes,
                endMinutes: slot.endMinutes,
                endsNextCalendarDay: false,
              },
            },
          ]);
        }
      } else {
        handleConfirmAddRoutinesToSlot([{ key: id }]);
      }

      clearAddRoutineTargetContext();
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [
      addPrioritySectionMealSlot,
      appendPrioritySectionsCategoryKeys,
      clearAddRoutineTargetContext,
      handleConfirmAddRoutinesToSlot,
      planBlocks,
      priorityEnd,
      priorityStart,
      reloadRoutineCatalog,
      spinePendingGapBounds,
    ],
  );

  const addRoutineSheetTitle = useMemo(
    () =>
      addRoutineTargetSlot
        ? t('dayPlan.linkRoutine', { slot: getDayMealSlotLabel(addRoutineTargetSlot) })
        : t('dayPlan.addRoutine'),
    [addRoutineTargetSlot, t],
  );

  const addRoutineSheetConfirmLabel = addRoutineTargetSlot
    ? t('dayPlan.confirmLink')
    : t('dayPlan.confirmAdd');

  const spineGapAddConfig = useMemo(() => {
    if (!spinePendingGapBounds) return null;
    return {
      fromMinutes: spinePendingGapBounds.fromMinutes,
      toMinutes: spinePendingGapBounds.toMinutes,
      priorityStart,
      priorityEnd,
      planBlocks,
      nowMinutes: getLocalMinutesOfDayNow(),
    };
  }, [planBlocks, priorityEnd, priorityStart, spinePendingGapBounds]);

  const createSheetPlacement = useMemo((): CreateCustomFlowPlacement | null => {
    if (layoutMode === 'sections') {
      return {
        mode: 'sections',
        initialMealSlot:
          addRoutineTargetSlot ??
          resolveCurrentMealSlotFromSchedule(getLocalMinutesOfDayNow(), mealSlotSchedule),
        mealSlotSchedule,
      };
    }
    if (layoutMode === 'spine') {
      const defaultDuration = loadSpineDefaultBlockMinutes();
      const gap = spinePendingGapBounds;
      const slot = computeSpineGapInsertSlot(
        gap?.fromMinutes ?? 0,
        gap?.toMinutes ?? 24 * 60,
        planBlocks,
        getLocalMinutesOfDayNow(),
        defaultDuration,
        1,
        priorityStart,
        priorityEnd,
      );
      if (slot) {
        return {
          mode: 'spine',
          priorityStart,
          priorityEnd,
          initialStartMinutes: slot.startMinutes,
          initialEndMinutes: slot.endMinutes,
        };
      }
      const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
      if (!window) return null;
      const startMinutes = window.startMin;
      const endMinutes = Math.min(startMinutes + defaultDuration, window.endMin);
      if (endMinutes - startMinutes < 1) return null;
      return {
        mode: 'spine',
        priorityStart,
        priorityEnd,
        initialStartMinutes: startMinutes,
        initialEndMinutes: endMinutes,
      };
    }
    return null;
  }, [
    addRoutineTargetSlot,
    layoutMode,
    mealSlotSchedule,
    planBlocks,
    priorityEnd,
    priorityStart,
    spinePendingGapBounds,
  ]);

  const showSectionsView = priorityMealSlotLayoutEnabled;

  const isPriorityCategoryDoneForOrdering = useCallback(
    (categoryKey: string) => {
      if (!showSectionsView) return isPriorityRowCompleted(categoryKey);
      const slots = sectionsMealSlotMap.get(categoryKey);
      if (slots && slots.length > 0) {
        return slots.every((slot) => isPrioritySectionItemCompleted(categoryKey, slot));
      }
      return isPriorityRowCompleted(categoryKey);
    },
    [isPriorityRowCompleted, isPrioritySectionItemCompleted, sectionsMealSlotMap, showSectionsView],
  );

  const mealSlotSectionsForDisplay = useMemo(() => {
    if (!showSectionsView) return [];
    const resolveSchedule = (categoryKey: string) =>
      resolveBagItemSpineSchedule({
        categoryKey,
        planBlocks,
        fixedFlowSets,
        priorityStart,
        priorityEnd,
      });
    const mapped = priorityMealSlotSections.map((section) => {
      const partitioned = partitionDisplayWithDeferredBottom(
        section.items,
        (cat) => buildPrioritySectionCompletionKey(cat.key, section.slot),
        (cat) => isPrioritySectionItemCompleted(cat.key, section.slot),
        deferredBottomReorderKeys,
      );
      let split = 0;
      for (const item of partitioned) {
        const completionKey = buildPrioritySectionCompletionKey(item.key, section.slot);
        if (
          isPrioritySectionItemCompleted(item.key, section.slot) &&
          !deferredBottomReorderKeys.has(completionKey)
        ) {
          break;
        }
        split += 1;
      }
      return {
        ...section,
        items: [
          ...sortByExplicitSpineStartTime(partitioned.slice(0, split), (cat) => cat.key, resolveSchedule),
          ...sortByExplicitSpineStartTime(partitioned.slice(split), (cat) => cat.key, resolveSchedule),
        ],
      };
    });
    // 달력 다중일(explicit)과 시계 자정 넘김은 별개 — 구간 표시는 HH:mm 창만 따른다.
    const spansNextDay = isOvernightHhmmRange(priorityStart, priorityEnd);
    return clampMealSlotSectionsToWindow(mapped, priorityStart, priorityEnd, spansNextDay);
  }, [
    deferredBottomReorderKeys,
    fixedFlowSets,
    isPrioritySectionItemCompleted,
    planBlocks,
    priorityMealSlotSections,
    priorityStart,
    priorityEnd,
    showSectionsView,
  ]);

  const dragReorderDelta = useCallback((translationY: number, rowHeight: number): number => {
    const threshold = rowHeight * 0.75;
    const absY = Math.abs(translationY);
    if (absY < threshold) return 0;
    const beyond = absY - threshold;
    const steps = 1 + Math.trunc(beyond / rowHeight);
    return translationY < 0 ? -steps : steps;
  }, []);

  const movePriorityCategoryToSectionSlot = useCallback(
    (categoryKey: string, fromSlot: DayMealSlot, toSlot: DayMealSlot) => {
      if (fromSlot === toSlot) return;
      const currentSlots = sectionsMealSlotMap.get(categoryKey) ?? [fromSlot];
      const nextSlots = [
        ...new Set([...currentSlots.filter((slot) => slot !== fromSlot), toSlot]),
      ];
      if (nextSlots.length === 0) return;
      const changedInSet = useFixedFlowSetsStore
        .getState()
        .setCategoryMealSlotInAnySet(categoryKey, toSlot);
      setPrioritySectionsMealSlots(categoryKey, nextSlots);
      if (!changedInSet) {
        setPriorityMealSlotOverride(categoryKey, toSlot);
      }
      migrateSectionCompletionOnSlotMove(categoryKey, fromSlot, toSlot);
    },
    [
      migrateSectionCompletionOnSlotMove,
      sectionsMealSlotMap,
      setPriorityMealSlotOverride,
      setPrioritySectionsMealSlots,
    ],
  );

  const commitPriorityDisplayReorderFromDrag = useCallback(
    (categoryKey: string, translationY: number, fromSlot?: DayMealSlot, targetSlot?: DayMealSlot) => {
      const parsed = parsePrioritySectionCompletionKey(categoryKey);
      const actualCategoryKey = parsed.categoryKey;
      const resolvedFromSlot = fromSlot ?? parsed.slot;
      if (showSectionsView && resolvedFromSlot) {
        const resolvedTarget = targetSlot ?? resolvedFromSlot;

        if (resolvedTarget !== resolvedFromSlot) {
          setPriorityRowLayoutAnim(true);
          movePriorityCategoryToSectionSlot(actualCategoryKey, resolvedFromSlot, resolvedTarget);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }

        const entriesInSlot = slottedPriorityEntries.filter((entry) => entry.slot === resolvedFromSlot);
        if (entriesInSlot.length < 2) return;
        const from = entriesInSlot.findIndex((entry) => entry.key === actualCategoryKey);
        if (from < 0) return;
        const h = Math.max(36, priorityBagRowHeightRef.current);
        const delta = dragReorderDelta(translationY, h);
        const to = Math.max(0, Math.min(entriesInSlot.length - 1, from + delta));
        if (to === from) return;
        const reorderedInSlot = reorderMealSlotSectionEntries(entriesInSlot, from, to);
        const slotKeySet = new Set(entriesInSlot.map((entry) => entry.key));
        const firstSlotIndex = prioritySectionsCategoryOrder.findIndex((key) => slotKeySet.has(key));
        if (firstSlotIndex < 0) return;
        const before = prioritySectionsCategoryOrder.slice(0, firstSlotIndex);
        const after = prioritySectionsCategoryOrder.slice(firstSlotIndex + entriesInSlot.length);
        const nextOrder = [
          ...before,
          ...reorderedInSlot.map((entry) => entry.key),
          ...after,
        ];
        const active = nextOrder.filter((k) => !isPriorityCategoryDoneForOrdering(k));
        const done = nextOrder.filter((k) => isPriorityCategoryDoneForOrdering(k));
        setPriorityRowLayoutAnim(true);
        setPrioritySectionsCategoryOrder([...active, ...done]);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (showSectionsView) {
        return;
      }

      const keyOrder = orderedSelectedItemsForDisplay.map((c) => c.key);
      const len = keyOrder.length;
      if (len < 2) return;
      const from = keyOrder.indexOf(actualCategoryKey);
      if (from < 0) return;
      const h = Math.max(36, priorityBagRowHeightRef.current);
      const delta = dragReorderDelta(translationY, h);
      const to = Math.max(0, Math.min(len - 1, from + delta));
      if (to === from) return;
      const moved = reorderFlatKeys(keyOrder, from, to);

      const active = moved.filter((k) => !isPriorityRowCompleted(k));
      const done = moved.filter((k) => isPriorityRowCompleted(k));
      setPriorityRowLayoutAnim(true);
      setPriorityCategoryOrder([...active, ...done]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [
      dragReorderDelta,
      isPriorityCategoryDoneForOrdering,
      isPriorityRowCompleted,
      movePriorityCategoryToSectionSlot,
      orderedSelectedItemsForDisplay,
      prioritySectionsCategoryOrder,
      sectionsMealSlotMap,
      setPriorityCategoryOrder,
      setPrioritySectionsCategoryOrder,
      showSectionsView,
      slottedPriorityEntries,
    ],
  );

  const undoPriorityRowCompletion = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) {
        toggleFocusCategoryCompleted(categoryKey);
        return;
      }
      if (completedCategoryKeysFromPlan.includes(categoryKey)) {
        addPlanCompletionDismissedKey(categoryKey);
      }
    },
    [
      addPlanCompletionDismissedKey,
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      toggleFocusCategoryCompleted,
    ],
  );

  const undoPrioritySectionItemCompletion = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const completionKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (completedFocusCategoryKeys.includes(completionKey)) {
        toggleFocusCategoryCompleted(completionKey);
        return;
      }
      if (completedCategoryKeysFromPlan.includes(categoryKey)) {
        addPlanCompletionDismissedKey(completionKey);
      }
    },
    [
      addPlanCompletionDismissedKey,
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      toggleFocusCategoryCompleted,
    ],
  );

  const handleTogglePriorityRowComplete = useCallback(
    (categoryKey: string) => {
      if (isPriorityRowCompleted(categoryKey)) {
        releaseDeferredMoveToBottom(categoryKey);
        undoPriorityRowCompletion(categoryKey);
        return;
      }
      scheduleDeferredMoveToBottom(categoryKey);
      addFocusCategoryCompleted(categoryKey);
    },
    [
      addFocusCategoryCompleted,
      isPriorityRowCompleted,
      releaseDeferredMoveToBottom,
      scheduleDeferredMoveToBottom,
      undoPriorityRowCompletion,
    ],
  );

  const handleTogglePrioritySectionItemComplete = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const itemKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (isPrioritySectionItemCompleted(categoryKey, slot)) {
        releaseDeferredMoveToBottom(itemKey);
        undoPrioritySectionItemCompletion(categoryKey, slot);
        return;
      }
      scheduleDeferredMoveToBottom(itemKey);
      addFocusCategoryCompleted(itemKey);
    },
    [
      addFocusCategoryCompleted,
      isPrioritySectionItemCompleted,
      releaseDeferredMoveToBottom,
      scheduleDeferredMoveToBottom,
      undoPrioritySectionItemCompletion,
    ],
  );

  const handleFinishPriorityCategoryForToday = useCallback(
    (categoryKey: string, label: string) => {
      Alert.alert(
        t('dayPlan.endTodayTitle'),
        t('dayPlan.endTodayMessage', { label }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('dayPlan.endTodayConfirm'),
            style: 'destructive',
            onPress: () => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPriorityRowLayoutAnim(true);
              finishPriorityCategoryForToday(categoryKey);
              saveRoutineCatalogSelectionKeys(
                useDayPlanDraftStore.getState().priorityCategoryOrder,
              );
            },
          },
        ],
      );
    },
    [finishPriorityCategoryForToday],
  );

  const resolveTimelineItemCompleted = useCallback(
    (itemKey: string) => {
      const { categoryKey, slot } = parsePrioritySectionCompletionKey(itemKey);
      if (slot) return isPrioritySectionItemCompleted(categoryKey, slot);
      return isPriorityRowCompleted(categoryKey);
    },
    [isPriorityRowCompleted, isPrioritySectionItemCompleted],
  );

  const resolveTimelineCompletionToggle = useCallback(
    (itemKey: string) => {
      const { categoryKey, slot } = parsePrioritySectionCompletionKey(itemKey);
      if (slot) {
        handleTogglePrioritySectionItemComplete(categoryKey, slot);
        return;
      }
      handleTogglePriorityRowComplete(categoryKey);
    },
    [handleTogglePriorityRowComplete, handleTogglePrioritySectionItemComplete],
  );

  const resolveTimelineCategorySettings = useCallback(
    (itemKey: string) => {
      const { categoryKey } = parsePrioritySectionCompletionKey(itemKey);
      onOpenCategorySettings?.(resolvePriorityRoutineCategoryKey(categoryKey));
    },
    [onOpenCategorySettings],
  );

  const handleTimelineReorderDragActiveChange = useCallback(
    (_key: string, active: boolean) => {
      if (active) {
        lockPriorityTimelineScroll();
        return;
      }
      unlockPriorityTimelineScroll();
    },
    [lockPriorityTimelineScroll, unlockPriorityTimelineScroll],
  );

  const handleTimelineReorderItemDragEnd = useCallback(
    (key: string, translationY: number, fromSlot: DayMealSlot, targetSlot: DayMealSlot) => {
      commitPriorityDisplayReorderFromDrag(key, translationY, fromSlot, targetSlot);
    },
    [commitPriorityDisplayReorderFromDrag],
  );

  const handleBagReorderDragActiveChange = useCallback(
    (_categoryKey: string, active: boolean) => {
      if (active) {
        lockPriorityTimelineScroll();
        return;
      }
      unlockPriorityTimelineScroll();
    },
    [lockPriorityTimelineScroll, unlockPriorityTimelineScroll],
  );

  /** 라이트: warm beige 페이지 위 흰색 카드·검정 보더 톤 */
  const editorial = useMemo(() => {
    const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
    if (isDark) {
      return {
        surface: bc.cover,
        ink: tone.text,
        muted: tone.textMuted,
        line: tone.border,
        actionBg: tone.surfaceAlt,
        shadow: tone.solidShadow,
      };
    }
    return {
      surface: tone.bg,
      ink: tone.text,
      muted: tone.textMuted,
      line: tone.border,
      actionBg: '#FFFFFF',
      shadow: tone.text,
    };
  }, [isDark, bc.cover]);

  const priorityTimeChipColors = useMemo(
    () =>
      isDark
        ? { bg: editorial.actionBg, pressed: 'rgba(255,255,255,0.13)' }
        : { bg: editorial.actionBg, pressed: 'rgba(168, 218, 220, 0.35)' },
    [editorial.actionBg, isDark],
  );

  /** 당일(오늘) · 다음날 — 전날 열은 제외하고, 자정 넘김 종료일만 연장 카드로 표시 */
  const timelineThreeDayKeys = useMemo(
    () => [
      todayKey,
      addDaysToLocalDateKey(todayKey, 1),
    ],
    [todayKey],
  );

  const sortedTimelineFlowBlocks = useMemo(
    () => sortDayPlanBlocks(filterBagTimelineFlowBlocks(planBlocks)),
    [planBlocks],
  );

  useEffect(() => {
    const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
    if (!window) return;
    const activeSetIds = new Set(fixedFlowSpineActiveSetIds);
    const fixedFlowItems = fixedFlowSets
      .filter((set) => activeSetIds.has(set.id))
      .flatMap((set) => set.items);

    for (const block of planBlocks) {
      if (block.blockOrigin !== 'spineTimeline') continue;
      // 고정 루틴에서 명시적으로 저장한 시각은 집중 구간보다 우선한다.
      if (isStoredFixedFlowSpineSchedule(block, fixedFlowItems)) continue;
      // 자정 넘김 일정은 당일 밴드 클램프 대상이 아님
      if (block.endsNextCalendarDay) continue;
      const clamped = clampSpineBlockToPriorityWindow(
        block.startMinutes,
        block.endMinutes,
        window,
      );
      if (!clamped) continue;
      if (
        clamped.startMinutes === block.startMinutes &&
        clamped.endMinutes === block.endMinutes
      ) {
        continue;
      }
      updatePlanBlock(block.id, {
        startMinutes: clamped.startMinutes,
        endMinutes: clamped.endMinutes,
      });
    }
  }, [
    fixedFlowSpineActiveSetIds,
    fixedFlowSets,
    planBlocks,
    priorityEnd,
    priorityStart,
    updatePlanBlock,
  ]);

  const spineNowMinutes = useMemo(() => {
    void mealSlotNowTick;
    return getLocalMinutesOfDayNow();
  }, [mealSlotNowTick]);

  const spineAnchorDateCaptions = useMemo(() => {
    const explicit = priorityPlanExplicitMultiDay;
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
    if (!explicit && !overnight) {
      return { dayStartDateCaption: undefined, dayEndDateCaption: undefined };
    }
    const { lo, hi } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
    const startKey = priorityClockCaptionDateKeyStart(lo);
    const endKey = priorityClockCaptionDateKeyEnd(lo, hi, priorityStart, priorityEnd);
    return {
      dayStartDateCaption: formatDateKeyCompact(startKey, locale),
      dayEndDateCaption: formatDateKeyCompact(endKey, locale),
    };
  }, [
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay,
    priorityStart,
    priorityEnd,
    locale,
  ]);

  const spineTimelineRows = useMemo(
    () =>
      buildSpineTimelineModel({
        priorityStart,
        priorityEnd,
        blocks: planBlocks,
        nowMinutes: spineNowMinutes,
        ...spineAnchorDateCaptions,
      }),
    [priorityStart, priorityEnd, planBlocks, spineNowMinutes, spineAnchorDateCaptions],
  );

  const completedBlockIdSet = useMemo(
    () => new Set(completedBlockIds),
    [completedBlockIds],
  );

  const spineTimelinePalette = useMemo(
    () => ({
      ink: editorial.ink,
      muted: editorial.muted,
      line: editorial.line,
      surface: editorial.surface,
      accent: isDark ? '#FAFAFA' : PRIMARY,
    }),
    [editorial.ink, editorial.line, editorial.muted, editorial.surface, isDark],
  );

  const mealSlotTimelineSections = useMemo(
    () =>
      mealSlotSectionsForDisplay.map((section) => ({
        slot: section.slot,
        title: section.title,
        hintTime: section.hintTime,
        isCurrent: section.isCurrent,
        ...(typeof section.progressToNext === 'number'
          ? { progressToNext: section.progressToNext }
          : {}),
        items: section.items.map((cat) => ({
          key: buildPrioritySectionCompletionKey(cat.key, section.slot),
          categoryKey: cat.key,
          label: cat.label,
          icon: cat.icon,
        })),
      })),
    [mealSlotSectionsForDisplay],
  );

  const confirmSpineBlockDelete = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      Alert.alert(
        t('alert.deleteBlock.title'),
        t('alert.deleteBlock.message', {
          title: block?.title ?? t('alert.blockFallback'),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              removePlanBlock(blockId);
              setSpineEditDraft(null);
            },
          },
        ]);
    },
    [planBlocks, removePlanBlock],
  );

  const handleSpineAddBlockInGap = useCallback((fromMinutes: number, toMinutes: number) => {
    setAddRoutineTargetSlot(null);
    setSpinePendingGapBounds({ fromMinutes, toMinutes });
    setAddRoutineSheetOpen(true);
  }, []);

  const handleSpineToggleBlockComplete = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      if (completedBlockIdSet.has(blockId)) {
        uncompletePlanBlock(blockId);
        if (block) {
          for (const categoryKey of getFlowCompletionCategoryKeysForBlock(block)) {
            useDayPlanDraftStore.getState().untrackRoutineHistoryCompletion(categoryKey);
          }
        }
        return;
      }
      completePlanBlock(blockId);
      if (block) {
        for (const categoryKey of getFlowCompletionCategoryKeysForBlock(block)) {
          useDayPlanDraftStore.getState().trackRoutineHistoryCompletion(categoryKey);
        }
      }
    },
    [completePlanBlock, completedBlockIdSet, planBlocks, uncompletePlanBlock],
  );

  const handleSpinePressBlock = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      if (!block) return;
      setSpineEditDraft({
        blockId,
        title: block.title,
        categoryKey: block.categoryKey ?? null,
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        endsNextCalendarDay: Boolean(block.endsNextCalendarDay),
      });
    },
    [planBlocks],
  );

  const handleSpineDeleteBlock = useCallback(
    (blockId: string) => {
      confirmSpineBlockDelete(blockId);
    },
    [confirmSpineBlockDelete],
  );

  const handleSpineReorderBlocks = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderSpineBlocks(fromIndex, toIndex);
    },
    [reorderSpineBlocks],
  );

  const handleSpineSaveBlock = useCallback(
    (input: {
      title: string;
      categoryKey: string | null;
      startMinutes: number;
      endMinutes: number;
      endsNextCalendarDay: boolean;
      blockId?: string;
    }) => {
      const title = input.title.trim();
      if (!title) {
        alertSpineBlockSaveError('add', 'empty_title');
        return;
      }

      const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
      if (!window) {
        alertSpineBlockSaveError(input.blockId ? 'update' : 'add', 'outside_window');
        return;
      }
      if (
        !isSpineBlockScheduleWithinPriorityWindow(
          {
            startMinutes: input.startMinutes,
            endMinutes: input.endMinutes,
            endsNextCalendarDay: input.endsNextCalendarDay,
          },
          window,
        )
      ) {
        alertSpineBlockSaveError(input.blockId ? 'update' : 'add', 'outside_window');
        return;
      }

      let clamped: { startMinutes: number; endMinutes: number };
      if (input.endsNextCalendarDay) {
        clamped = {
          startMinutes: Math.max(0, Math.min(Math.floor(input.startMinutes), 24 * 60 - 1)),
          endMinutes: Math.max(0, Math.min(Math.floor(input.endMinutes), 24 * 60)),
        };
      } else {
        const next = clampSpineBlockToPriorityWindow(
          input.startMinutes,
          input.endMinutes,
          window,
        );
        if (!next) {
          alertSpineBlockSaveError(input.blockId ? 'update' : 'add', 'outside_window');
          return;
        }
        clamped = next;
      }

      const linkedKey = input.categoryKey?.trim() || null;
      const categoryLabel = linkedKey ? getPickerCategoryLabel(linkedKey) : '';

      if (input.blockId) {
        const result = updatePlanBlock(input.blockId, {
          title,
          category: categoryLabel,
          categoryKey: linkedKey,
          startMinutes: clamped.startMinutes,
          endMinutes: clamped.endMinutes,
          endsNextCalendarDay: input.endsNextCalendarDay,
        });
        if (!result.ok) {
          alertSpineBlockSaveError('update', result.reason);
          return;
        }
        if (linkedKey) {
          appendRoutineCatalogSelectionKeys([linkedKey]);
        }
      } else {
        const result = addPlanBlock({
          title,
          category: categoryLabel,
          ...(linkedKey ? { categoryKey: linkedKey } : {}),
          startMinutes: clamped.startMinutes,
          endMinutes: clamped.endMinutes,
          endsNextCalendarDay: input.endsNextCalendarDay,
          blockOrigin: 'spineTimeline',
          planDateKey: getLocalDateKey(),
        });
        if (!result.ok) {
          alertSpineBlockSaveError('add', result.reason);
          return;
        }
        if (linkedKey) {
          appendRoutineCatalogSelectionKeys([linkedKey]);
        }
      }

      setSpineEditDraft(null);
    },
    [
      addPlanBlock,
      alertSpineBlockSaveError,
      priorityEnd,
      priorityStart,
      updatePlanBlock,
    ],
  );

  const priorityWindowHhmm = useMemo(() => {
    const ps = parseHHmmToMinutes(priorityStart.trim());
    const pe = parseHHmmToMinutes(priorityEnd.trim());
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
    return { ps, pe, overnight };
  }, [priorityStart, priorityEnd]);

  const priorityWindowLine = useMemo(
    () =>
      formatPriorityWindowLine(
        priorityStart,
        priorityEnd,
        priorityPlanDateKey,
        priorityPlanDateKeyEnd,
        locale,
      ),
    [priorityStart, priorityEnd, priorityPlanDateKey, priorityPlanDateKeyEnd, locale],
  );

  const { lo: planRangeLo, hi: planRangeHi } = useMemo(
    () => sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd),
    [priorityPlanDateKey, priorityPlanDateKeyEnd],
  );

  /**
   * 타임라인 카드 높이 = 사용 가능한 세로를 거의 꽉 채움(리스트·탭 사이 빈 면 최소화).
   * 내부 ScrollView가 긴 목록을 스크롤하고, 카드는 항상 이 높이를 씀.
   *
   * `useWindowDimensions`는 **전체 창** 높이라 탭바 실제 높이를 반영하지 않으면
   * 실기기에서 카드가 탭 터치 영역을 덮을 수 있다.
   * `useBottomTabBarHeight()`를 우선 사용하고, 초기 측정 전에는 보수적인 fallback을 쓴다.
   */
  const timelineCardHeight = useMemo(() => {
    const aboveCard =
      insets.top +
      /** DayPlan: scroll paddingTop·문의·모드 스위치·섹션 간격 */
      110;
    const tabBarReserve = Math.max(
      bottomTabBarHeight,
      DAY_PLAN_TAB_BAR_ROW_HEIGHT + insets.bottom,
    );
    /** 실기기 탭 hit area는 보존하면서, 본문 하단의 과한 빈 여백을 줄인다. */
    const belowCard = tabBarReserve + 14;
    /** `priorityTimelineOuter` 상·하 패딩 합과 동기화 */
    const outerVertical = 0;
    const availableHeight = windowHeight - aboveCard - belowCard - outerVertical;
    /** 큰 기기에서 카드가 과도하게 커져 하단이 비어 보이지 않도록 상한을 둔다. */
    const cappedHeight = Math.min(availableHeight, 410);
    return Math.max(240, cappedHeight);
  }, [windowHeight, insets.top, insets.bottom, bottomTabBarHeight]);

  const timelineDateIntro = useMemo(
    () => planDayIntroFromRange(todayKey, priorityPlanDateKey, priorityPlanDateKeyEnd),
    [todayKey, priorityPlanDateKey, priorityPlanDateKeyEnd],
  );

  const openPriorityTimeEditor = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/daily-rhythm-settings');
  }, [router]);

  const resolveBagRowSpineSchedule = useCallback(
    (categoryKey: string) =>
      resolveBagItemSpineSchedule({
        categoryKey,
        planBlocks,
        fixedFlowSets,
        priorityStart,
        priorityEnd,
      }),
    [fixedFlowSets, planBlocks, priorityEnd, priorityStart],
  );

  const openBagRowTimeModal = useCallback(
    (input: { rowKey: string; categoryKey: string; label: string }) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const schedule = resolveBagRowSpineSchedule(input.categoryKey);
      setBagRowTimeModalKey((k) => k + 1);
      setBagRowTimeEdit({
        rowKey: input.rowKey,
        categoryKey: resolvePriorityRoutineCategoryKey(input.categoryKey),
        label: input.label,
        startMinutes: schedule.startMinutes,
        endMinutes: schedule.endMinutes,
        endsNextCalendarDay: schedule.endsNextCalendarDay,
      });
    },
    [resolveBagRowSpineSchedule],
  );

  const closeBagRowTimeModal = useCallback(() => {
    Keyboard.dismiss();
    setBagRowTimeEdit(null);
  }, []);

  const applyBagRowTimeFromPanel = useCallback(
    (startMin: number, endMin: number, endsNext: boolean) => {
      if (!bagRowTimeEdit) return;
      Keyboard.dismiss();

      const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
      if (
        !window ||
        !isSpineBlockScheduleWithinPriorityWindow(
          {
            startMinutes: startMin,
            endMinutes: endMin,
            endsNextCalendarDay: endsNext,
          },
          window,
        )
      ) {
        alertSpineBlockSaveError('update', 'outside_window');
        return;
      }

      let clamped: { startMinutes: number; endMinutes: number };
      if (endsNext) {
        clamped = {
          startMinutes: Math.max(0, Math.min(Math.floor(startMin), 24 * 60 - 1)),
          endMinutes: Math.max(0, Math.min(Math.floor(endMin), 24 * 60)),
        };
      } else {
        const next = clampSpineBlockToPriorityWindow(startMin, endMin, window);
        if (!next) {
          alertSpineBlockSaveError('update', 'outside_window');
          return;
        }
        clamped = next;
      }

      const categoryKey = bagRowTimeEdit.categoryKey;
      setCategorySpineScheduleInAnySet(
        categoryKey,
        clamped.startMinutes,
        clamped.endMinutes,
        endsNext,
      );

      const matchingBlocks = planBlocks.filter((b) => {
        const key = resolveBlockCategoryKey(b) ?? resolveCategoryKeyFromLabel(b.category ?? '');
        return key === categoryKey;
      });

      if (matchingBlocks.length > 0) {
        for (const block of matchingBlocks) {
          const result = updatePlanBlock(block.id, {
            startMinutes: clamped.startMinutes,
            endMinutes: clamped.endMinutes,
            endsNextCalendarDay: endsNext,
          });
          if (!result.ok) {
            alertSpineBlockSaveError('update', result.reason);
            return;
          }
        }
      } else {
        const result = addPlanBlock({
          title: bagRowTimeEdit.label,
          category: bagRowTimeEdit.label,
          categoryKey,
          startMinutes: clamped.startMinutes,
          endMinutes: clamped.endMinutes,
          endsNextCalendarDay: endsNext,
          blockOrigin: 'spineTimeline',
          planDateKey: getLocalDateKey(),
        });
        if (!result.ok) {
          alertSpineBlockSaveError('add', result.reason);
          return;
        }
      }

      setBagRowTimeEdit(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [
      addPlanBlock,
      alertSpineBlockSaveError,
      bagRowTimeEdit,
      planBlocks,
      priorityEnd,
      priorityStart,
      setCategorySpineScheduleInAnySet,
      updatePlanBlock,
    ],
  );

  /** c.containerLow 한 값을 모든 컨테이너에 직접 지정 — 중간 View 투명 영역에서 톤 차이 원천 제거 */
  const surfaceBg = c.containerLow;

  return (
    <View style={[styles.prioritySectionRoot, { backgroundColor: surfaceBg }]}>
      <Modal
        visible={iosDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIosDateModalOpen(false)}>
        <View style={styles.dateModalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.dateModalDimTouch}
            onPress={() => setIosDateModalOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.close')}
          />
          <View
            style={[
              styles.dateModalSheet,
              {
                backgroundColor: c.containerLow,
                paddingBottom: Math.max(insets.bottom, 12) + 8,
                paddingHorizontal: 20,
              },
            ]}>
            <View
              style={[
                styles.dateModalGrabber,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
              ]}
              accessibilityLabel={t('dayPlan.sheet')}
            />
            <ThemedText style={[styles.dateModalTitle, { color: c.onSurface }]}>
              {t('dayPlan.applyRangeTitle')}
            </ThemedText>
            <ThemedText style={[styles.dateModalRangeSummary, { color: c.onSurface }]}>
              {calendarRangeAnchor !== null
                ? t('dayPlan.rangeFromHint', {
                  date: formatDateKeyCompact(calendarRangeAnchor, locale),
                })
                : modalDraftRange.isSingle
                  ? t('dayPlan.rangeSingleDayHint', { date: modalDraftRange.loCompact })
                  : t('dayPlan.rangeCurrentHint', {
                    lo: modalDraftRange.loCompact,
                    hi: modalDraftRange.hiCompact,
                  })}
            </ThemedText>
            <ThemedText style={[styles.dateModalHint, { color: c.onVariant }]}>
              {t('dayPlan.rangeHintLong')}
            </ThemedText>
            <View style={styles.dateMonthHeader}>
              <View style={styles.dateMonthHeaderSide}>
                <Pressable
                  style={[styles.dateMonthNavBtn, { borderColor: c.catBorderIdle }]}
                  onPress={() => {
                    setMonthCursor((prev) =>
                      addMonths(toMonthStart(normalizeToDate(prev, safeMonthCursor)), -1),
                    );
                  }}>
                  <ThemedText style={[styles.dateMonthNavText, { color: c.onSurface }]}>‹</ThemedText>
                </Pressable>
              </View>
              <View style={styles.dateMonthTitleWrap}>
                <ThemedText style={[styles.dateMonthTitle, { color: c.onSurface }]} numberOfLines={1}>
                  {monthTitle}
                </ThemedText>
              </View>
              <View style={styles.dateMonthHeaderSide}>
                <Pressable
                  style={[styles.dateMonthNavBtn, { borderColor: c.catBorderIdle }]}
                  onPress={() => {
                    setMonthCursor((prev) =>
                      addMonths(toMonthStart(normalizeToDate(prev, safeMonthCursor)), 1),
                    );
                  }}>
                  <ThemedText style={[styles.dateMonthNavText, { color: c.onSurface }]}>›</ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={[styles.calendarFrame, { borderColor: c.catBorderIdle }]}>
              <View style={styles.calendarTodayRow}>
                <Pressable
                  onPress={resetCalendarDraftToToday}
                  accessibilityRole="button"
                  accessibilityLabel={t('dayPlan.resetRangeToday')}
                  style={[
                    styles.calendarTodayBtn,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <ThemedText style={[styles.calendarTodayBtnText, { color: c.onSurface }]}>
                    {t('common.reset')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={jumpToTodayInCalendar}
                  accessibilityRole="button"
                  accessibilityLabel={t('dayPlan.jumpToToday')}
                  style={[
                    styles.calendarTodayBtn,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <ThemedText style={[styles.calendarTodayBtnText, { color: c.onSurface }]}>
                    {t('dayPlan.today')}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.calendarWeekHeaderRow}>
                {weekdayLabels.map((label) => (
                  <ThemedText key={label} style={[styles.calendarWeekHeaderText, { color: c.onVariant }]}>
                    {label}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {(() => {
                  const rangeLo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
                  const rangeHi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
                  return calendarDays.map((d) => {
                    const dk = localDateToDateKey(d);
                    const inCurrentMonth = d.getMonth() === safeMonthCursor.getMonth();
                    const isToday = isSameDay(d, new Date());
                    const inRange = dk >= rangeLo && dk <= rangeHi;
                    const isEndpoint = inRange && (dk === rangeLo || dk === rangeHi);
                    const isMiddle = inRange && rangeLo !== rangeHi && dk !== rangeLo && dk !== rangeHi;
                    return (
                      <Pressable
                        key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                        onPress={() => onDraftDayPress(dk)}
                        style={[
                          styles.calendarDayCell,
                          isEndpoint && styles.calendarDayCellSelected,
                          isMiddle && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
                          },
                          !inCurrentMonth && styles.calendarDayCellOutMonth,
                        ]}>
                        <ThemedText
                          style={[
                            styles.calendarDayText,
                            { color: inCurrentMonth ? c.onSurface : c.onVariant },
                            isEndpoint && styles.calendarDayTextSelected,
                            isMiddle && { color: c.onSurface },
                            isToday && !isEndpoint && !isMiddle && { color: PRIMARY },
                          ]}>
                          {d.getDate()}
                        </ThemedText>
                      </Pressable>
                    );
                  });
                })()}
              </View>
            </View>
            <View style={styles.dateActionRow}>
              <Pressable
                style={[styles.dateActionBtn, styles.dateActionGhost, { borderColor: c.catBorderIdle }]}
                onPress={() => setIosDateModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t('dayPlan.cancelClose')}>
                <ThemedText style={[styles.dateActionText, { color: c.onSurface }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.dateActionBtn,
                  styles.dateActionPrimary,
                  {
                    backgroundColor: isDark
                      ? RetroFlatColors.dark.bgMint
                      : RetroFlatColors.light.primaryContainer,
                    borderColor: isDark
                      ? RetroFlatColors.dark.border
                      : RetroFlatColors.light.border,
                  },
                ]}
                onPress={onConfirmCalendarRange}
                accessibilityRole="button"
                accessibilityLabel={t('dayPlan.applyRange')}>
                <ThemedText
                  style={[
                    styles.dateActionText,
                    {
                      color: isDark
                        ? RetroFlatColors.dark.text
                        : RetroFlatColors.light.text,
                    },
                  ]}>
                  {t('dayPlan.rangeDone')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bagRowTimeEdit != null}
        transparent
        animationType="fade"
        onRequestClose={closeBagRowTimeModal}>
        <KeyboardAvoidingView
          style={[
            styles.timeModalRoot,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 12}>
          <Pressable
            style={styles.timeModalDim}
            onPress={closeBagRowTimeModal}
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.close')}
          />
          <View
            style={[
              styles.timeModalCardShell,
              {
                marginRight: SOLID_SHADOW_OFFSET,
                marginBottom: SOLID_SHADOW_OFFSET,
              },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.timeModalCardShadow,
                {
                  backgroundColor: isDark
                    ? RetroFlatColors.dark.solidShadow
                    : RetroFlatColors.light.text,
                  transform: [
                    { translateX: SOLID_SHADOW_OFFSET },
                    { translateY: SOLID_SHADOW_OFFSET },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.timeModalCard,
                {
                  backgroundColor: isDark
                    ? RetroFlatColors.dark.surface
                    : '#FFFFFF',
                },
              ]}>
            <ScrollView
              style={styles.timeModalScroll}
              contentContainerStyle={styles.timeModalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {bagRowTimeEdit ? (
                <>
                  <ThemedText
                    style={[
                      styles.dateModalHint,
                      styles.timeModalLead,
                      { color: editorial.muted },
                    ]}>
                    {t('dayPlan.bagRowDayWindowCaption', {
                      window: priorityWindowLine || `${priorityStart} — ${priorityEnd}`,
                    })}
                  </ThemedText>
                  <CatalogRowSpineTimePanel
                    key={bagRowTimeModalKey}
                    ref={bagRowTimePanelRef}
                    startMinutes={bagRowTimeEdit.startMinutes}
                    endMinutes={bagRowTimeEdit.endMinutes}
                    endsNextCalendarDay={bagRowTimeEdit.endsNextCalendarDay}
                    baseDateKey={priorityPlanDateKey}
                    presentation="sheet"
                    visualStyle="default"
                    contentInsetLeft={0}
                    ink={editorial.ink}
                    muted={editorial.muted}
                    line={editorial.line}
                    isDark={isDark}
                    priorityStart={priorityStart}
                    priorityEnd={priorityEnd}
                    startFieldLabel={t('dayPlan.routineNamedStartLabel', {
                      label: bagRowTimeEdit.label,
                    })}
                    endFieldLabel={t('dayPlan.routineNamedEndLabel', {
                      label: bagRowTimeEdit.label,
                    })}
                    startFieldHint={t('dayPlan.routineNamedStartHint')}
                    endFieldHint={t('dayPlan.routineNamedEndHint')}
                    showSheetConfirm={false}
                    onScheduleChange={applyBagRowTimeFromPanel}
                  />
                </>
              ) : null}
              <View style={styles.timeModalFooterActions}>
                <BrutalConfirmButton
                  align="stretch"
                  compact
                  label={t('common.cancel')}
                  accessibilityLabel={t('dayPlan.cancelClose')}
                  fill={isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF'}
                  labelColor={editorial.muted}
                  style={styles.timeModalCancelBtn}
                  onPress={closeBagRowTimeModal}
                />
                <BrutalConfirmButton
                  align="stretch"
                  compact
                  label={t('common.save')}
                  accessibilityLabel={t('dayPlan.saveRoutineTimeA11y')}
                  style={styles.timeModalSaveBtn}
                  onPress={() => {
                    const next = bagRowTimePanelRef.current?.commitPendingSchedule();
                    if (!next) return;
                    applyBagRowTimeFromPanel(
                      next.startMinutes,
                      next.endMinutes,
                      next.endsNextCalendarDay,
                    );
                  }}
                />
              </View>
            </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SpineBlockEditSheet
        visible={spineEditDraft != null}
        draft={spineEditDraft}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={editorial.surface}
        line={editorial.line}
        priorityStart={priorityStart}
        priorityEnd={priorityEnd}
        baseDateKey={todayKey}
        onClose={() => setSpineEditDraft(null)}
        onSave={handleSpineSaveBlock}
        onDelete={confirmSpineBlockDelete}
        renderRoutineSettings={
          renderRoutineInlineSettings
            ? (categoryKey) =>
              renderRoutineInlineSettings(categoryKey, {
                ink: editorial.ink,
                muted: editorial.muted,
                border: editorial.line,
                isDark,
              })
            : undefined
        }
      />

      <View style={[styles.bookOuter, { backgroundColor: surfaceBg, flex: 1, minHeight: 0 }]}>
        {/* 기간·집중 구간 — 다일 타임라인 카드 (달력·시계는 각각 모달) */}
        <View style={styles.priorityTimelineOuter}>
          <View
            style={[
              styles.priorityTimelineCard,
              {
                backgroundColor: editorial.surface,
              },
            ]}>
            <View
              style={[
                styles.priorityTimelineHeader,
                {
                  borderBottomColor: editorial.line,
                  backgroundColor: editorial.surface,
                },
              ]}>
              <View style={styles.priorityTimelineHeaderText}>
                {layoutMode === 'sections' ? (
                  <>
                    <View style={styles.priorityTimelineTitleRow}>
                      <ThemedText
                        style={[styles.priorityTimelineTitle, { color: editorial.ink }]}
                        lightColor={editorial.ink}
                        darkColor={editorial.ink}
                        numberOfLines={2}>
                        {formatTimelineHeaderDate(todayKey, locale)}
                      </ThemedText>
                      <MealSlotScheduleEditButton
                        palette={spineTimelinePalette}
                        isDark={isDark}
                        compact
                        showLabel
                        onPress={() => openMealSlotScheduleEditor()}
                      />
                    </View>
                    <View style={styles.priorityTimelineSubRow}>
                      <ThemedText
                        style={[styles.priorityTimelineSub, { color: editorial.muted }]}
                        lightColor={editorial.muted}
                        darkColor={editorial.muted}>
                        {timelineDateIntro}
                        {' · '}
                      </ThemedText>
                      <PriorityWindowTimeChip
                        line={priorityWindowLine}
                        ink={editorial.ink}
                        muted={editorial.muted}
                        chipBg={priorityTimeChipColors.bg}
                        chipBgPressed={priorityTimeChipColors.pressed}
                        borderColor={editorial.line}
                        onPress={openPriorityTimeEditor}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <ThemedText
                      style={[styles.priorityTimelineTitle, { color: editorial.ink }]}
                      lightColor={editorial.ink}
                      darkColor={editorial.ink}
                      numberOfLines={2}>
                      {formatTimelineHeaderDate(todayKey, locale)}
                    </ThemedText>
                    <View style={styles.priorityTimelineSubRow}>
                      <ThemedText
                        style={[styles.priorityTimelineSub, { color: editorial.muted }]}
                        lightColor={editorial.muted}
                        darkColor={editorial.muted}>
                        {timelineDateIntro}
                        {' · '}
                      </ThemedText>
                      <PriorityWindowTimeChip
                        line={priorityWindowLine}
                        ink={editorial.ink}
                        muted={editorial.muted}
                        chipBg={priorityTimeChipColors.bg}
                        chipBgPressed={priorityTimeChipColors.pressed}
                        borderColor={editorial.line}
                        onPress={openPriorityTimeEditor}
                      />
                    </View>
                  </>
                )}
              </View>
              <View style={styles.priorityTimelineHeaderActions}>
                {(visibleLayoutModes?.length ?? 3) > 0 || headerSuffixTabs.length > 0 ? (
                  <DayPlanLayoutModeTabs
                    mode={layoutMode}
                    onSelectMode={handleHeaderLayoutModeSelect}
                    c={c}
                    isDark={isDark}
                    visibleModes={visibleLayoutModes}
                    layoutTabActive={!showTodoList}
                    suffixTabs={headerSuffixTabs}
                  />
                ) : null}
              </View>
            </View>
            <ScrollView
              ref={priorityTimelineScrollRef}
              nestedScrollEnabled
              scrollEnabled={!spineDragActive}
              showsVerticalScrollIndicator={false}
              style={styles.priorityTimelineScroll}
              contentContainerStyle={[
                styles.priorityTimelineScrollContent,
                showTodoList && styles.priorityTimelineScrollContentTodo,
                { paddingBottom: TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM },
              ]}
              keyboardShouldPersistTaps="handled">
              {showTodoList ? (
                <View style={styles.todoListBody}>
                  <TodoListPlanSection c={c} isDark={isDark} embedded />
                </View>
              ) : layoutMode === 'sections' ? (
                <MealSlotTimelineView
                  sections={mealSlotTimelineSections}
                  palette={spineTimelinePalette}
                  isDark={isDark}
                  isFocusStarted={isFocusStarted}
                  isItemCompleted={resolveTimelineItemCompleted}
                  reorderEnabled={sectionsCount >= 1}
                  onPressAddRoutine={openAddRoutineForSlot}
                  onToggleItemComplete={resolveTimelineCompletionToggle}
                  onOpenItemSettings={resolveTimelineCategorySettings}
                  onReorderDragActiveChange={handleTimelineReorderDragActiveChange}
                  onReorderItemDragEnd={handleTimelineReorderItemDragEnd}
                />
              ) : layoutMode === 'spine' ? (
                <SpineTimelineView
                  rows={spineTimelineRows}
                  completedBlockIds={completedBlockIdSet}
                  nowMinutes={spineNowMinutes}
                  isDark={isDark}
                  palette={spineTimelinePalette}
                  rowSurface={editorial.surface}
                  onAddBlockInGap={handleSpineAddBlockInGap}
                  onToggleBlockComplete={handleSpineToggleBlockComplete}
                  onPressBlock={handleSpinePressBlock}
                  onDeleteBlock={handleSpineDeleteBlock}
                  onReorderBlocks={handleSpineReorderBlocks}
                  onReorderDragActiveChange={setSpineDragActive}
                />
              ) : (
                timelineThreeDayKeys.map((dk) => {
                  const d = parseLocalDateKeyToDate(dk);
                  const dayNum = d ? d.getDate() : '';
                  const wd = weekdayShortFromDateKey(dk, locale);
                  const isPastDay = dk < todayKey;
                  const isMainDay = dk === todayKey;
                  const isStoreDay = dk === dayPlanDateKey;
                  const blocks = isStoreDay ? sortedTimelineFlowBlocks : [];
                  const overnightWindow = isOvernightHhmmRange(priorityStart, priorityEnd);
                  const tomorrowDk = addDaysToLocalDateKey(todayKey, 1);
                  const todayWithinPriorityPlan = todayKey >= planRangeLo && todayKey <= planRangeHi;
                  /** 자정 넘김 종료일(다음날 새벽) — 전날과 같은 우선순위를 ‘연장’ 블록으로 표시 */
                  const isOvernightTailDay =
                    overnightWindow && todayWithinPriorityPlan && dk === tomorrowDk;
                  const showPriorityInMainTimeline =
                    (bagCount > 0 || priorityMealSlotLayoutEnabled) && isMainDay;
                  const showOvernightPriorityContinuation = isOvernightTailDay && bagCount > 0;
                  const showPriorityListBelow =
                    showPriorityInMainTimeline || showOvernightPriorityContinuation;
                  /** 오늘 + 자정 넘김 종료일(꼬리) — 동일한 ‘활성’ 톤·레이아웃 */
                  const isPriorityStripPrimary = isMainDay || showOvernightPriorityContinuation;
                  const eventTitleColor = isPastDay
                    ? editorial.muted
                    : isPriorityStripPrimary
                      ? editorial.ink
                      : editorial.muted;
                  const timeColW = isPriorityStripPrimary ? 100 : 58;
                  const timeFont = isPriorityStripPrimary ? 11 : 10;
                  const titleFont = isPriorityStripPrimary ? 15 : 12;
                  const titleWeight: '500' | '600' | '700' = isPriorityStripPrimary ? '600' : '500';
                  const dayLeftW = isPriorityStripPrimary ? 52 : 34;
                  const wdFont = isPriorityStripPrimary ? 11 : 9;
                  const wdLetter = isPriorityStripPrimary ? 1.4 : 0.4;
                  const numSize = isPriorityStripPrimary ? undefined : 14;
                  /** 다줄 합본·집중 구간과 동일 시각의 우선순위 블록은 타임라인 행에서 숨기고 아래 목록만 사용 */
                  const timelineBlocksForDay = blocks.filter((b) => {
                    if (b.blockOrigin === 'prioritySession') return false;
                    if (isPriorityCompoundBlockTitle(b.title)) return false;
                    const matchesPriorityWindow =
                      isMainDay &&
                      priorityWindowHhmm.ps !== null &&
                      priorityWindowHhmm.pe !== null &&
                      blockMatchesPriorityHhmmWindow(
                        b,
                        priorityWindowHhmm.ps,
                        priorityWindowHhmm.pe,
                        priorityWindowHhmm.overnight,
                      );
                    if (!matchesPriorityWindow) return true;
                    /** 담기가 비면 showPriority가 꺼져 단일 카탈로그 줄 블록이 다시 노출되는 것을 막음 */
                    if (showPriorityInMainTimeline) return false;
                    if (isLikelyPriorityCatalogMonolineTitle(b.title)) return false;
                    return true;
                  });
                  return (
                    <View
                      key={dk}
                      style={[
                        styles.priorityTimelineDayColumn,
                        isPriorityStripPrimary && styles.priorityTimelineDayColumnMain,
                        isPastDay && styles.priorityTimelineDayPast,
                        !isPriorityStripPrimary && !isPastDay && styles.priorityTimelineDayFutureSide,
                      ]}>
                      <View
                        style={[
                          styles.priorityTimelineDayRow,
                          isPriorityStripPrimary
                            ? styles.priorityTimelineDayRowMain
                            : styles.priorityTimelineDayRowSide,
                        ]}>
                        <View style={[styles.priorityTimelineDayLeft, { width: dayLeftW }]}>
                          <ThemedText
                            style={[
                              styles.priorityTimelineWd,
                              {
                                color: isPriorityStripPrimary ? editorial.ink : editorial.muted,
                                fontWeight: isPriorityStripPrimary ? '800' : '600',
                                letterSpacing: wdLetter,
                                fontSize: wdFont,
                              },
                            ]}
                            lightColor={isPriorityStripPrimary ? editorial.ink : editorial.muted}
                            darkColor={isPriorityStripPrimary ? editorial.ink : editorial.muted}>
                            {wd}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.priorityTimelineDayNum,
                              numSize != null && { fontSize: numSize, fontWeight: '700', letterSpacing: -0.3 },
                              { color: editorial.ink },
                              isPriorityStripPrimary && styles.priorityTimelineDayNumToday,
                            ]}
                            lightColor={editorial.ink}
                            darkColor={editorial.ink}>
                            {dayNum}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.priorityTimelineDayRight,
                            isPriorityStripPrimary
                              ? styles.priorityTimelineDayRightMain
                              : styles.priorityTimelineDayRightSide,
                            {
                              paddingTop: isPriorityStripPrimary ? 4 : 4,
                            },
                          ]}>
                          {isMainDay ? (
                            <DailyQuoteCard dateKey={dk} isDark={isDark} />
                          ) : null}
                          {isMainDay && bagCount === 0 && !priorityMealSlotLayoutEnabled ? (
                            <View
                              style={[
                                styles.priorityMainEmptyHint,
                                {
                                  borderColor: editorial.line,
                                  backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(0,0,0,0.025)',
                                },
                              ]}>
                              <ThemedText
                                style={[styles.priorityMainEmptyHintTitle, { color: editorial.ink }]}
                                lightColor={editorial.ink}
                                darkColor={editorial.ink}>
                                {t('dayPlan.emptyBagTitle')}
                              </ThemedText>
                              <ThemedText
                                style={[styles.priorityMainEmptyHintBody, { color: editorial.muted }]}
                                lightColor={editorial.muted}
                                darkColor={editorial.muted}>
                                {t('dayPlan.emptyBagBody')}
                              </ThemedText>
                              <PriorityMealSlotAddRoutineRow
                                label={t('dayPlan.addRoutine')}
                                ink={editorial.ink}
                                line={editorial.line}
                                isDark={isDark}
                                onPress={openAddRoutineForBag}
                              />
                            </View>
                          ) : null}
                          {timelineBlocksForDay.length > 0
                            ? timelineBlocksForDay.map((block, bi) => {
                              const dotTone =
                                bi % 4 === 0
                                  ? isDark
                                    ? 'rgba(255,255,255,0.95)'
                                    : 'rgba(0,0,0,0.85)'
                                  : bi % 4 === 1
                                    ? isDark
                                      ? 'rgba(255,255,255,0.55)'
                                      : 'rgba(0,0,0,0.45)'
                                    : bi % 4 === 2
                                      ? isDark
                                        ? 'rgba(255,255,255,0.4)'
                                        : 'rgba(0,0,0,0.35)'
                                      : isDark
                                        ? 'rgba(255,255,255,0.7)'
                                        : 'rgba(0,0,0,0.55)';
                              const dotTop = isPriorityStripPrimary ? 6 : 4;
                              return (
                                <View key={block.id} style={styles.priorityTimelineEventRowHoriz}>
                                  <ThemedText
                                    style={[
                                      styles.priorityTimelineEventTimeCol,
                                      { color: editorial.muted, width: timeColW, fontSize: timeFont },
                                    ]}
                                    lightColor={editorial.muted}
                                    darkColor={editorial.muted}
                                    numberOfLines={3}>
                                    {formatBlockTimeRange(block)}
                                  </ThemedText>
                                  <View
                                    style={[styles.priorityTimelineDot, { backgroundColor: dotTone, marginTop: dotTop }]}
                                  />
                                  <ThemedText
                                    style={[
                                      styles.priorityTimelineEventTitleHoriz,
                                      {
                                        color: eventTitleColor,
                                        fontWeight: titleWeight,
                                        fontSize: titleFont,
                                        lineHeight: isPriorityStripPrimary ? 19 : 17,
                                      },
                                    ]}
                                    lightColor={eventTitleColor}
                                    darkColor={eventTitleColor}
                                    numberOfLines={2}>
                                    {block.title}
                                  </ThemedText>
                                </View>
                              );
                            })
                            : null}

                          {showOvernightPriorityContinuation ? (
                            <View
                              style={[
                                styles.overnightContinuationBlock,
                                timelineBlocksForDay.length > 0 || showPriorityInMainTimeline
                                  ? { marginTop: 12 }
                                  : null,
                              ]}>
                              <View style={styles.overnightTailHeadBlock}>
                                <ThemedText
                                  style={[styles.overnightTailEndTime, { color: editorial.ink }]}
                                  lightColor={editorial.ink}
                                  darkColor={editorial.ink}
                                  numberOfLines={1}>
                                  {formatOvernightTailEndHeadline(priorityEnd)}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.overnightTailDivider,
                                    { backgroundColor: editorial.line },
                                  ]}
                                />
                              </View>
                            </View>
                          ) : null}

                        </View>
                      </View>

                      {showPriorityInMainTimeline ? (
                        <View
                          style={[
                            styles.priorityInlineListUnderDate,
                            isPriorityStripPrimary && styles.priorityInlineListUnderDateMain,
                            timelineBlocksForDay.length > 0 && styles.priorityInlineListUnderDateAfterEvents,
                          ]}>
                          <View style={styles.priorityInlineList}>
                            {(() => {
                              const allowBagReorder = orderedSelectedItemsForDisplay.length >= 2;

                              const renderBagRow = (
                                cat: (typeof orderedSelectedItemsForDisplay)[number],
                                options?: { fromSlot?: DayMealSlot; rowKey?: string },
                              ) => {
                                const rowKey = options?.rowKey ?? cat.key;
                                const rowDone = options?.fromSlot
                                  ? isPrioritySectionItemCompleted(cat.key, options.fromSlot)
                                  : isPriorityRowCompleted(cat.key);
                                const rowSchedule = resolveBagRowSpineSchedule(cat.key);
                                const scheduleStartDk = showOvernightPriorityContinuation
                                  ? todayKey
                                  : dk;
                                const timeSubtitle = rowSchedule.isSuggested
                                  ? null
                                  : formatSpineScheduleRangeLabel({
                                      startMinutes: rowSchedule.startMinutes,
                                      endMinutes: rowSchedule.endMinutes,
                                      endsNextCalendarDay: rowSchedule.endsNextCalendarDay,
                                      endDayCaption: rowSchedule.endsNextCalendarDay
                                        ? formatDateKeyCompact(
                                            addDaysToLocalDateKey(scheduleStartDk, 1),
                                            locale,
                                          )
                                        : null,
                                    });
                                const baseCategoryKey = resolvePriorityRoutineCategoryKey(cat.key);
                                const rowSummaryHint = formatRoutineSummaryHint(
                                  readRoutineSummaryFromConfig(
                                    loadGoalDetailCategoryConfig(baseCategoryKey),
                                  ),
                                );

                                return (
                                  <Reanimated.View
                                    key={rowKey}
                                    layout={priorityRowLayoutAnim ? PRIORITY_ROW_LAYOUT : undefined}
                                    exiting={priorityRowLayoutAnim ? PRIORITY_ROW_EXITING : undefined}
                                    style={styles.priorityOrderRowAnimWrap}
                                    onLayout={(e) => {
                                      const h = e.nativeEvent.layout.height;
                                      if (h > 0) {
                                        priorityBagRowHeightRef.current = h;
                                      }
                                    }}>
                                    <PriorityOrderRow
                                      categoryKey={cat.key}
                                      icon={cat.icon}
                                      label={cat.label}
                                      subtitle={timeSubtitle}
                                      summaryHint={rowSummaryHint}
                                      onEditTime={() =>
                                        openBagRowTimeModal({
                                          rowKey,
                                          categoryKey: cat.key,
                                          label: cat.label,
                                        })
                                      }
                                      itemMarkColor={resolveCategoryMarkColor(
                                        priorityCategoryImportance,
                                        cat.key,
                                      )}
                                      onSelectItemMarkColor={(color) =>
                                        setPriorityCategoryMarkColor(cat.key, color)
                                      }
                                      isFocusStarted={isFocusStarted}
                                      isCompleted={rowDone}
                                      isDark={isDark}
                                      ink={editorial.ink}
                                      inkMuted={editorial.muted}
                                      line={editorial.line}
                                      onToggleFocusComplete={() => {
                                        if (options?.fromSlot) {
                                          handleTogglePrioritySectionItemComplete(
                                            cat.key,
                                            options.fromSlot,
                                          );
                                          return;
                                        }
                                        handleTogglePriorityRowComplete(cat.key);
                                      }}
                                      onReorderDragTranslationEnd={
                                        allowBagReorder
                                          ? (ty) =>
                                            commitPriorityDisplayReorderFromDrag(
                                              cat.key,
                                              ty,
                                              options?.fromSlot,
                                            )
                                          : undefined
                                      }
                                      onReorderDragActiveChange={
                                        allowBagReorder
                                          ? (active) => handleBagReorderDragActiveChange(cat.key, active)
                                          : undefined
                                      }
                                      onSettings={
                                        onOpenCategorySettings
                                          ? () =>
                                            onOpenCategorySettings(
                                              resolvePriorityRoutineCategoryKey(cat.key),
                                            )
                                          : undefined
                                      }
                                      onFinishForToday={
                                        isFocusStarted
                                          ? () =>
                                            handleFinishPriorityCategoryForToday(cat.key, cat.label)
                                          : undefined
                                      }
                                      onFocusDetail={
                                        onOpenFocusDetail
                                          ? () =>
                                            onOpenFocusDetail(
                                              resolvePriorityRoutineCategoryKey(cat.key),
                                            )
                                          : undefined
                                      }
                                      animateOnMount={lastAddedCategoryKey === cat.key}
                                      expanded={expandedBagRowKeys.has(rowKey)}
                                      onToggleExpand={() =>
                                        setExpandedBagRowKeys((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(rowKey)) next.delete(rowKey);
                                          else next.add(rowKey);
                                          return next;
                                        })
                                      }
                                      expandedContent={
                                        <PriorityBagRowAccordionPanel
                                          categoryKey={resolvePriorityRoutineCategoryKey(cat.key)}
                                          label={cat.label}
                                          startMinutes={rowSchedule.startMinutes}
                                          endMinutes={rowSchedule.endMinutes}
                                          ink={editorial.ink}
                                          muted={editorial.muted}
                                          isDark={isDark}
                                        />
                                      }
                                    />
                                  </Reanimated.View>
                                );
                              };

                              if (!showSectionsView) {
                                return (
                                  <>
                                    {orderedSelectedItemsForDisplay.map((cat) => renderBagRow(cat))}
                                    <PriorityMealSlotAddRoutineRow
                                      label={t('dayPlan.addMoreRoutine')}
                                      ink={editorial.ink}
                                      line={editorial.line}
                                      isDark={isDark}
                                      onPress={openAddRoutineForBag}
                                    />
                                  </>
                                );
                              }

                              return (
                                <>
                                  {bagCount === 0 ? (
                                    <ThemedText
                                      style={[styles.prioritySectionsEmptyLead, { color: editorial.muted }]}
                                      lightColor={editorial.muted}
                                      darkColor={editorial.muted}>
                                      {t('dayPlan.sectionsEmptyLead')}
                                    </ThemedText>
                                  ) : null}
                                  {mealSlotSectionsForDisplay.map((section, sectionIndex) => (
                                    <View key={section.slot} style={styles.priorityMealSlotSection}>
                                      <PriorityMealSlotSectionHeader
                                        title={section.title}
                                        hintTime={formatHhmmClockKo(section.hintTime)}
                                        ink={editorial.ink}
                                        muted={editorial.muted}
                                        line={editorial.line}
                                        isDark={isDark}
                                        isCurrent={section.isCurrent}
                                        isFirst={sectionIndex === 0}
                                        onPressHintTime={() => openMealSlotScheduleEditor(section.slot)}
                                      />
                                      {section.items.length === 0 ? (
                                        <PriorityMealSlotAddRoutineRow
                                          ink={editorial.ink}
                                          line={editorial.line}
                                          isDark={isDark}
                                          onPress={() => openAddRoutineForSlot(section.slot)}
                                        />
                                      ) : (
                                        <>
                                          {section.items.map((cat) =>
                                            renderBagRow(cat, {
                                              fromSlot: section.slot,
                                              rowKey: `${section.slot}:${cat.key}`,
                                            }),
                                          )}
                                          <PriorityMealSlotAddRoutineRow
                                            label={t('dayPlan.linkMoreRoutine')}
                                            ink={editorial.ink}
                                            line={editorial.line}
                                            isDark={isDark}
                                            onPress={() => openAddRoutineForSlot(section.slot)}
                                          />
                                        </>
                                      )}
                                    </View>
                                  ))}
                                </>
                              );
                            })()}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      <DayMealSlotScheduleSheet
        visible={mealSlotScheduleSheetOpen}
        schedule={mealSlotSchedule}
        isDark={isDark}
        initialExpandedSlot={mealSlotScheduleFocusSlot}
        priorityStart={priorityStart}
        priorityEnd={priorityEnd}
        onClose={() => setMealSlotScheduleSheetOpen(false)}
        onSave={persistMealSlotSchedule}
      />

      <PriorityRoutinePickerSheet
        visible={addRoutineSheetOpen}
        title={addRoutineSheetTitle}
        confirmLabel={addRoutineSheetConfirmLabel}
        sections={addableRoutineSections}
        spineGapAdd={spineGapAddConfig}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={editorial.surface}
        line={editorial.line}
        onClose={() => {
          setAddRoutineSheetOpen(false);
          clearAddRoutineTargetContext();
        }}
        onConfirm={handleConfirmAddRoutinesToSlot}
        onCreateCustom={() => {
          // 픽커만 닫고 슬롯/갭 타깃은 유지 — 생성 직후 해당 모드에 담기 위함
          setAddRoutineSheetOpen(false);
          setCreateSheetGroupKey(undefined);
          setCreateSheetOpen(true);
        }}
      />

      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => {
          setCreateSheetOpen(false);
          clearAddRoutineTargetContext();
        }}
        onCreate={handleCreateCustomFlow}
        initialGroupKey={createSheetGroupKey}
        placement={createSheetPlacement}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        line={editorial.line}
        surface={editorial.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Fragment 대신 단일 루트 — 부모 ScrollView gap·자식 평탄화로 생기는 밝은 띠 방지 */
  prioritySectionRoot: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'visible',
  },
  priorityTimelineOuter: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  priorityTimelineCard: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  priorityTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    zIndex: 10,
    elevation: 10,
  },
  priorityTimelineHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  priorityTimelineHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  priorityTimelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityTimelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  priorityTimelineSub: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  priorityTimelineSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  priorityTimelineTimeTap: {
    fontWeight: '600',
  },
  priorityTimelineTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 1,
  },
  priorityTimelineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 2,
    marginLeft: 4,
  },
  todoListBody: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  priorityTimelineScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  priorityTimelineScrollContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  /** 투두 리스트 — 스크롤 좌우 패딩 제거해 카드가 가로를 최대한 쓰게 함 */
  priorityTimelineScrollContentTodo: {
    paddingHorizontal: 0,
  },
  /** 날짜 행 아래에 우선순위 리스트를 두기 위한 세로 래퍼 */
  priorityTimelineDayColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  priorityTimelineDayColumnMain: {
    gap: 2,
  },
  priorityTimelineDayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
  },
  /** 당일(오늘) — 넓은 간격·큰 터치 영역 */
  priorityTimelineDayRowMain: {
    paddingVertical: 4,
    gap: 12,
    marginBottom: 0,
  },
  /** 전날·다음날 — 압축 */
  priorityTimelineDayRowSide: {
    paddingVertical: 2,
    gap: 10,
    marginBottom: 0,
  },
  priorityTimelineDayPast: {
    opacity: 0.32,
  },
  priorityTimelineDayFutureSide: {
    opacity: 0.52,
  },
  priorityTimelineDayLeft: {
    alignItems: 'center',
    paddingTop: 2,
    gap: 2,
  },
  priorityTimelineWd: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  priorityTimelineDayNum: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  priorityTimelineDayNumToday: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  priorityTimelineDayRight: {
    flex: 1,
    minWidth: 0,
  },
  priorityTimelineDayRightMain: {
    gap: 12,
  },
  priorityTimelineDayRightSide: {
    gap: 8,
  },
  /** 모의안: 한 줄에 시간(w-20) · 점 · 제목 */
  priorityTimelineEventRowHoriz: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  priorityTimelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  priorityTimelineEventTimeCol: {
    flexShrink: 0,
    fontWeight: '500',
    paddingTop: 2,
    letterSpacing: -0.05,
  },
  priorityTimelineEventTitleHoriz: {
    flex: 1,
    minWidth: 0,
    letterSpacing: -0.15,
  },
  priorityTimelineEventTextStack: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  /** 오늘 행 안에 우선순위 OrderRow 목록 */
  priorityInlineList: {
    width: '100%',
    alignSelf: 'stretch',
  },
  priorityMealSlotSection: {
    width: '100%',
  },
  prioritySectionsEmptyLead: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 8,
  },
  priorityMealSlotEmptyHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    paddingBottom: 6,
    paddingLeft: 2,
  },
  /** Reanimated layout/exit — 드래그 중 `translateY`가 잘리지 않도록 visible */
  priorityOrderRowAnimWrap: {
    width: '100%',
    overflow: 'visible',
  },
  /** 날짜(요일·일) 열과 같은 좌측 시작선 — 리스트를 그 아래 전체 너비로 */
  priorityInlineListUnderDate: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  priorityInlineListUnderDateMain: {
    paddingBottom: 2,
  },
  priorityInlineListUnderDateAfterEvents: {
    marginTop: 8,
  },
  /** 자정 넘김 꼬리 날 — 시각+선만(배경·테두리 없이 본문과 동일 톤) */
  overnightContinuationBlock: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 2,
    gap: 0,
  },
  overnightTailHeadBlock: {
    width: '100%',
    gap: 10,
    marginBottom: 4,
  },
  /** 꼬리 날 — 스케줄 참고: 시각 한 줄 + 구분선만 */
  overnightTailEndTime: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  overnightTailDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    minHeight: 1,
    alignSelf: 'stretch',
  },
  priorityTimelineKicker: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    letterSpacing: -0.05,
    marginBottom: 8,
  },
  priorityTimelinePlaceholder: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.05,
  },
  priorityMainEmptyHint: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  priorityMainEmptyHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priorityMainEmptyHintBody: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  timeModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timeModalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  timeModalCardShell: {
    position: 'relative',
    maxWidth: 420,
    maxHeight: '88%',
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
  timeModalCardShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  timeModalCard: {
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '100%',
    maxHeight: '100%',
    zIndex: 1,
    elevation: 0,
  },
  timeModalCardNote: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeModalLeadNote: {
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeModalCancelNote: {
    alignSelf: 'stretch',
    marginTop: 4,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeModalFooterNote: {
    marginTop: 4,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeModalFooterActions: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  timeModalCancelBtn: {
    flex: 1,
  },
  timeModalCancelShell: {
    position: 'relative',
    flex: 1,
  },
  timeModalCancelFace: {
    minHeight: 40,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  timeModalSaveBtn: {
    flex: 1,
  },
  timeModalFooterCancelHit: {
    paddingVertical: 2,
    paddingRight: 12,
  },
  timeModalFooterSaveHit: {
    paddingVertical: 2,
    paddingLeft: 12,
  },
  timeModalCancelNoteText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  timeModalFooterSaveText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.15,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 1,
  },
  timeModalScroll: {
    width: '100%',
  },
  timeModalScrollContent: {
    gap: 12,
    paddingBottom: 2,
  },
  timeModalLead: {
    marginTop: 0,
  },
  timeCalendarTopLeftHit: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 시작·종료 플립 시계 두 열 */
  /** 바깥 Pressable 한 겹이 자식 높이를 0으로 만드는 경우가 있어 View + 전역 덮는 Pressable로 분리 */
  dateModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dateModalDimTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  dateModalSheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  dateModalGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateModalRangeSummary: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  dateModalHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  dateMonthHeader: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthHeaderSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 0,
  },
  dateMonthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthNavText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  dateMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  calendarFrame: {
    marginTop: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignSelf: 'stretch',
  },
  calendarTodayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  calendarTodayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 2,
  },
  calendarTodayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarWeekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDayCell: {
    width: '14.2857%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayCellSelected: {
    backgroundColor: PRIMARY,
  },
  calendarDayCellOutMonth: {
    opacity: 0.45,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dateActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  dateActionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateActionGhost: {
    borderWidth: 2,
  },
  dateActionPrimary: {
    borderWidth: 2,
  },
  dateActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bookOuter: {
    borderRadius: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  bookSpread: {
    flexDirection: 'column',
    gap: 0,
    width: '100%',
  },
  pageBlock: {
    width: '100%',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  pageTop: {
    minHeight: 96,
    paddingTop: 0,
  },
  pageTopEditorial: {
    borderRadius: 0,
  },
  /** 우선 순위 목록 — 무엇을 담는 영역인지 한 줄 설명 */
  pagePriorityIntro: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  pageScrollContent: { gap: 0, paddingBottom: 4 },
});
