import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  buildInitialCustomFlowDetailConfig,
  collectSpineTimelineCategoryKeys,
  createCustomFlowCategoryId,
  filterDayPlanFlowBlocks,
  formatSpineScheduleRangeLabel,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isPriorityWindowEndedForToday,
  notifyFixedFlowApplyScheduleChanged,
  resolveBlockCategoryKey,
  resolveCategoryCatalogIcon,
  resolveCategoryKeyFromLabel,
  resolveFixedFlowSetDisplayName,
  resolveFixedFlowSpineSchedules,
  resolvePriorityRoutineCategoryKey,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
  type CustomFlowTemplateKey
} from '@entities/day-plan';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import {
  isRoutineStartNotifyEnabled,
  persistRoutineStartNotifyToggle,
} from '@features/day-plan-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatDateKeyCompact, t } from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import {
  appendCustomFlowCatalogEntry,
  BUILTIN_PRESET_SCHEDULE_SET_IDS,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  getDayMealSlotLabel,
  isBuiltinPresetScheduleSet,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  loadPostItFaceColorByGroup,
  DEFAULT_POST_IT_FACE_COLOR_ID,
  postItFaceUsesLightInk,
  resolveFixedFlowItemMealSlots,
  resolvePostItFaceColor,
  resolvePostItFaceInk,
  resolvePostItFaceMuted,
  saveGoalDetailCategoryConfig,
  savePostItFaceColorForGroup,
  subscribeCustomFlowCatalog,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
  type PostItFaceColorByGroup,
  type PostItFaceColorId,
} from '@shared/lib/storage';
import {
  coerceDayPlanLayoutMode
} from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import {
  activeIconColorByCategory,
  categoryAccentColorPastel,
} from '@widgets/day-plan-priority-order';

import { getPickerCategoryLabel, isOvernightHhmmRange } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import {
  getFixedFlowPresetScheduleHint,
  getFixedFlowPresetScheduleLabel,
} from '../lib/fixedFlowPresetLabels';
import { resolveFixedRoutineItemIconColor } from '../lib/fixedRoutineItemAppearance';
import {
  buildAddablePriorityCatalogSections,
  buildPriorityCatalogRows,
  type AddablePriorityCatalogSection,
  type PriorityCatalogRow,
} from '../lib/priorityCatalog';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import {
  CatalogRowMealSlotChips,
  CatalogRowMealSlotSelectedIcons,
  mealSlotPickerBtnWidth,
} from './CatalogRowMealSlotChips';
import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { DayMealSlotScheduleSheet } from './DayMealSlotScheduleSheet';
import type { DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { FixedRoutineMealSlotScheduleCard } from './FixedRoutineMealSlotScheduleCard';
import { FixedRoutinePriorityWindowCard } from './FixedRoutinePriorityWindowCard';
import { FixedRoutinePriorityWindowSheet } from './FixedRoutinePriorityWindowSheet';
import { FixedRoutineSectionTabs, type FixedRoutineSection } from './FixedRoutineSectionTabs';
import { PostItFaceColorChips } from '@shared/ui/post-it-face-color-chips';
import { PriorityBagRowAccordionPanel } from './PriorityBagRowAccordionPanel';
import { RoutineCatalogManageContent } from './RoutineCatalogManageContent';
import { RoutineTemplateListPanel } from './RoutineTemplateListPanel';
import {
  RoutineAtmosphereFooterStrip,
  RoutineTabAtmosphere,
  type RoutineAtmosphereVariant,
} from '@shared/ui/routine-atmosphere';

function layoutModeHint(mode: DayPlanLayoutMode): string {
  if (mode === 'spine') {
    return t('fixedRoutine.spineHiddenHint');
  }
  if (mode === 'sections') {
    return t('fixedRoutine.sectionsHint');
  }
  return t('fixedRoutine.bagHint');
}

function sectionHintText(
  section: 'scheduled' | 'custom' | FixedRoutineSection,
  layoutMode: DayPlanLayoutMode,
): string {
  if (section === 'templates') {
    return t('fixedRoutine.templatesHint');
  }
  if (section === 'catalog') {
    return t('fixedRoutine.catalogHint');
  }
  if (section === 'scheduled' || section === 'custom') {
    if (layoutMode === 'spine') {
      return t('fixedRoutine.spineHiddenHint');
    }
    if (layoutMode === 'sections') {
      return t('fixedRoutine.sectionsHintShort');
    }
    return t('fixedRoutine.bagHintShort');
  }
  return layoutModeHint(layoutMode);
}

const FLOW_MEAL_SLOT_PANEL_HEIGHT = 56;
const BRUTAL_SHADOW_SM = 2;

/** 시안 `w-10 h-10 border bg-white brutal-shadow-sm` */
function FlowBrutalActionButton({
  accessibilityLabel,
  accessibilityState,
  disabled,
  borderColor: _borderColor,
  backgroundColor,
  pressedBg,
  shadowColor,
  width,
  minWidth,
  onPress,
  children,
  /** true면 프레스·활성 시 배경/투명도 변화 없음 */
  lockVisual = false,
}: {
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean; expanded?: boolean; disabled?: boolean };
  disabled?: boolean;
  borderColor: string;
  backgroundColor: string;
  pressedBg: string;
  shadowColor: string;
  width?: number;
  minWidth?: number;
  onPress: () => void;
  children: ReactNode;
  lockVisual?: boolean;
}) {
  return (
    <View
      style={[
        styles.brutalBtnShell,
        { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.brutalBtnShadow,
          {
            backgroundColor: shadowColor,
            transform: [{ translateX: BRUTAL_SHADOW_SM }, { translateY: BRUTAL_SHADOW_SM }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        disabled={disabled}
        hitSlop={disabled ? 0 : 8}
        onPress={onPress}
        style={({ pressed }) => [
          styles.flowBrutalBtn,
          width != null ? { width } : null,
          minWidth != null ? { minWidth } : null,
          {
            backgroundColor:
              lockVisual || !pressed || disabled ? backgroundColor : pressedBg,
            opacity: disabled ? 0.55 : lockVisual ? 1 : pressed ? 0.92 : 1,
          },
        ]}>
        {children}
      </Pressable>
    </View>
  );
}

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCORDION_OPEN_MS = 280;
const ACCORDION_CLOSE_MS = 220;
const ACCORDION_EASING = Easing.out(Easing.cubic);

/** 탭 remount 시에도 펼친 높이를 바로 복원해 포스트잇 깜빡임을 막음 */
const accordionHeightCache = new Map<string, number>();

function useMeasuredAccordion(expanded: boolean, cacheKey?: string) {
  const cachedHeight = cacheKey ? (accordionHeightCache.get(cacheKey) ?? 0) : 0;
  const progress = useSharedValue(expanded ? 1 : 0);
  const contentHeight = useSharedValue(cachedHeight);
  /** 접힌 동안 본문 트리를 아예 내림 — 첫 진입 비용을 헤더만으로 제한 */
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      const knownHeight = cacheKey
        ? (accordionHeightCache.get(cacheKey) ?? contentHeight.value)
        : contentHeight.value;
      if (knownHeight > 0) {
        contentHeight.value = knownHeight;
        progress.value = withTiming(1, {
          duration: ACCORDION_OPEN_MS,
          easing: ACCORDION_EASING,
        });
      } else {
        // 첫 기본 펼침: 측정 전이라도 progress=1로 본문이 보이게
        progress.value = 1;
      }
      return;
    }
    progress.value = withTiming(
      0,
      { duration: ACCORDION_CLOSE_MS, easing: ACCORDION_EASING },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [cacheKey, contentHeight, expanded, progress]);

  const panelStyle = useAnimatedStyle(() => {
    if (contentHeight.value <= 0) {
      return {
        opacity: expanded ? 1 : 0,
        overflow: 'hidden' as const,
        transform: [{ translateY: 0 }],
      };
    }
    return {
      opacity: progress.value,
      height: progress.value * contentHeight.value,
      overflow: 'hidden' as const,
      transform: [{ translateY: (1 - progress.value) * -6 }],
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const onContentLayout = useCallback(
    (height: number) => {
      if (height <= 0 || Math.abs(height - contentHeight.value) <= 0.5) return;
      if (cacheKey) accordionHeightCache.set(cacheKey, height);
      contentHeight.value = height;
      if (!expanded) return;
      if (progress.value < 1) {
        progress.value = withTiming(1, {
          duration: ACCORDION_OPEN_MS,
          easing: ACCORDION_EASING,
        });
      } else {
        progress.value = 1;
      }
    },
    [cacheKey, contentHeight, expanded, progress],
  );

  return { mounted, panelStyle, chevronStyle, onContentLayout };
}

type FlowCardProps = {
  item: FixedFlowSetItem;
  catalog: PriorityCatalogRow | undefined;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  actionBg: string;
  actionHoverBg: string;
  shadow: string;
  isFocusStarted: boolean;
  isInTodayPlan: boolean;
  isCompleted: boolean;
  mealSlots?: DayMealSlot[];
  showMealSlotPicker?: boolean;
  onToggleMealSlot?: (slot: DayMealSlot) => void;
  showSpineTimePicker?: boolean;
  spineStartMinutes?: number;
  spineEndMinutes?: number;
  spineEndsNextCalendarDay?: boolean;
  spineTimeIsSuggested?: boolean;
  baseDateKey?: string;
  onChangeSpineTime?: (
    startMinutes: number,
    endMinutes: number,
    endsNextCalendarDay: boolean,
  ) => void;
  /** 키패드에 가리지 않도록 패널을 스크롤 영역 안으로 */
  onEnsureVisibleAboveKeyboard?: (windowY: number, height: number) => void;
  startNotifyEnabled?: boolean;
  onToggleStartNotify?: () => void;
  onOpenSettings: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
};

function FlowItemCard({
  item,
  catalog,
  isDark,
  ink,
  muted,
  line,
  actionBg,
  actionHoverBg,
  shadow,
  isFocusStarted,
  isInTodayPlan,
  isCompleted,
  mealSlots = [],
  showMealSlotPicker,
  onToggleMealSlot,
  showSpineTimePicker,
  spineStartMinutes,
  spineEndMinutes,
  spineEndsNextCalendarDay,
  spineTimeIsSuggested,
  baseDateKey,
  onChangeSpineTime,
  onEnsureVisibleAboveKeyboard,
  startNotifyEnabled = false,
  onToggleStartNotify,
  onOpenSettings,
  onToggleEnabled,
  onDelete,
}: FlowCardProps) {
  const { t, locale } = useTranslation();
  /** 액션 버튼 면은 흰색이므로 포스트잇 잉크(밝은 색)와 분리 */
  const actionInk = '#000000';
  const actionMuted = 'rgba(0,0,0,0.55)';
  const [mealSlotExpanded, setMealSlotExpanded] = useState(false);
  const [spineTimeExpanded, setSpineTimeExpanded] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const detailAccordion = useMeasuredAccordion(
    detailExpanded,
    `flow-detail:${item.categoryKey}`,
  );
  const spineTimePanelRef = useRef<View>(null);
  const expandProgress = useSharedValue(0);
  const spineExpandProgress = useSharedValue(0);
  const label = catalog?.label ?? getPickerCategoryLabel(item.categoryKey);
  const enabled = item.enabled !== false;
  const categoryKey = item.categoryKey;
  const icon = resolveCategoryCatalogIcon(categoryKey);
  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';
  const shouldPulse = Boolean(isInTodayPlan && isFocusStarted && enabled && !isCompleted);
  const pulse = useRef(new Animated.Value(1)).current;
  const iconBoxBg = categoryAccentColorPastel(categoryKey);
  const brutalShadow = shadow;

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulse]);

  const categoryIconColor = activeIconColorByCategory(categoryKey);
  const iconColor = resolveFixedRoutineItemIconColor({
    categoryAccentColor: categoryIconColor,
    isInTodayPlan,
  });
  /** 적용 여부와 무관하게 라벨 색 유지 — 적용은 스위치·버튼 문구로만 표시 */
  const labelColor = isCompleted ? muted : ink;

  const mealSlotIconHighlighted = mealSlots.length > 0 || mealSlotExpanded;

  useEffect(() => {
    expandProgress.value = withTiming(mealSlotExpanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expandProgress, mealSlotExpanded]);

  const mealSlotPanelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: expandProgress.value * FLOW_MEAL_SLOT_PANEL_HEIGHT,
    transform: [
      { translateY: (1 - expandProgress.value) * -8 },
      { scale: 0.96 + expandProgress.value * 0.04 },
    ],
  }));

  const mealSlotIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + expandProgress.value * 0.08 }],
  }));

  const spineTimeIconHighlighted =
    Boolean(spineStartMinutes != null && spineEndMinutes != null) || spineTimeExpanded;
  const spineTimeLabel =
    spineStartMinutes != null && spineEndMinutes != null
      ? formatSpineScheduleRangeLabel({
        startMinutes: spineStartMinutes,
        endMinutes: spineEndMinutes,
        endsNextCalendarDay: spineEndsNextCalendarDay === true,
        endDayCaption:
          spineEndsNextCalendarDay === true
            ? baseDateKey
              ? formatDateKeyCompact(addDaysToLocalDateKey(baseDateKey, 1), locale)
              : t('dayPlan.nextDayPrefix')
            : null,
      })
      : null;

  useEffect(() => {
    spineExpandProgress.value = withTiming(spineTimeExpanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [spineExpandProgress, spineTimeExpanded]);

  const spineTimeIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + spineExpandProgress.value * 0.08 }],
  }));

  const handleToggleSpineTimeExpand = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpineTimeExpanded((prev) => !prev);
  };

  const handleToggleMealSlotExpand = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMealSlotExpanded((prev) => !prev);
  };

  const handleToggleMealSlot = (slot: DayMealSlot) => {
    onToggleMealSlot?.(slot);
  };

  const showStartNotify = Boolean(
    (showSpineTimePicker && onChangeSpineTime) || (showMealSlotPicker && onToggleMealSlot),
  );
  const canStartNotify = showSpineTimePicker
    ? spineStartMinutes != null && spineEndMinutes != null
    : mealSlots.length > 0;

  const handleToggleStartNotify = () => {
    if (!canStartNotify) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (showMealSlotPicker && onToggleMealSlot) {
        setMealSlotExpanded(true);
        Alert.alert(t('alert.startNotify.title'), t('alert.startNotify.pickMealSlot'));
        return;
      }
      if (showSpineTimePicker && onChangeSpineTime) {
        setSpineTimeExpanded(true);
        Alert.alert(t('alert.startNotify.title'), t('alert.startNotify.pickStartEnd'));
        return;
      }
      Alert.alert(t('alert.startNotify.title'), t('alert.startNotify.pickStartTime'));
      return;
    }
    onToggleStartNotify?.();
  };

  return (
    <View
      style={[
        styles.flowRowWrap,
        { borderBottomColor: line, opacity: enabled ? 1 : 0.5 },
      ]}>
      <View style={styles.flowRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailExpanded }}
          accessibilityLabel={
            detailExpanded
              ? t('dayPlan.collapseA11y', { label })
              : t('dayPlan.expandA11y', { label })
          }
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDetailExpanded((value) => !value);
          }}
          style={({ pressed }) => [styles.flowRowMain, pressed && { opacity: 0.82 }]}>
          <View
            style={[
              styles.flowIconBoxShell,
              { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.flowIconBoxShadow,
                {
                  backgroundColor: brutalShadow,
                  borderColor: line,
                  transform: [
                    { translateX: BRUTAL_SHADOW_SM },
                    { translateY: BRUTAL_SHADOW_SM },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.flowIconBox,
                { backgroundColor: iconBoxBg, borderColor: line },
              ]}>
              <Animated.View
                style={[
                  shouldPulse ? { opacity: pulse } : undefined,
                  isCompleted && { opacity: 0.5 },
                ]}>
                <IconSymbol name={icon as any} size={18} color={iconColor} />
              </Animated.View>
            </View>
          </View>
          <View style={styles.flowRowTextCol}>
            <ThemedText
              style={[styles.flowRowTitle, { color: labelColor }]}
              numberOfLines={1}>
              {label}
            </ThemedText>
            {showSpineTimePicker && spineTimeLabel ? (
              <ThemedText
                style={[
                  styles.flowRowTime,
                  { color: muted, opacity: spineTimeIsSuggested ? 0.72 : 1 },
                ]}
                numberOfLines={1}>
                {spineTimeIsSuggested ? t('common.suggested', { time: spineTimeLabel }) : spineTimeLabel}
              </ThemedText>
            ) : null}
          </View>
          <View
            style={[
              styles.flowDetailChevronShell,
              { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
            ]}>
            <View
              pointerEvents="none"
              style={[styles.flowDetailChevronShadow, { backgroundColor: brutalShadow }]}
            />
            <View style={[styles.flowDetailChevronFace, { backgroundColor: actionBg }]}>
              <Reanimated.View style={detailAccordion.chevronStyle}>
                <IconSymbol name="chevron.down" size={13} color={actionInk} />
              </Reanimated.View>
            </View>
          </View>
        </Pressable>
        {showMealSlotPicker && onToggleMealSlot ? (
          <FlowBrutalActionButton
            accessibilityLabel={
              mealSlots.length > 0
                ? t('fixedRoutine.mealSlotA11y', { label, slots: mealSlots.map((slot) => getDayMealSlotLabel(slot)).join(', ') })
                : t('fixedRoutine.mealSlotPickA11y', { label })
            }
            accessibilityState={{
              selected: mealSlotIconHighlighted,
              expanded: mealSlotExpanded,
            }}
            borderColor={line}
            backgroundColor={actionBg}
            pressedBg={actionHoverBg}
            shadowColor={brutalShadow}
            width={Math.max(32, mealSlotPickerBtnWidth(mealSlots))}
            onPress={handleToggleMealSlotExpand}>
            <Reanimated.View style={mealSlotIconAnimatedStyle}>
              <CatalogRowMealSlotSelectedIcons
                selectedSlots={mealSlots}
                color={mealSlotIconHighlighted ? actionInk : actionMuted}
                mutedColor={actionMuted}
                size={12}
                compactSize={8}
              />
            </Reanimated.View>
          </FlowBrutalActionButton>
        ) : null}
        {showSpineTimePicker && onChangeSpineTime ? (
          <FlowBrutalActionButton
            accessibilityLabel={
              spineStartMinutes != null && spineEndMinutes != null
                ? t('fixedRoutine.timeA11y', {
                  label,
                  time: formatSpineScheduleRangeLabel({
                    startMinutes: spineStartMinutes,
                    endMinutes: spineEndMinutes,
                    endsNextCalendarDay: spineEndsNextCalendarDay === true,
                    endDayCaption:
                      spineEndsNextCalendarDay === true
                        ? baseDateKey
                          ? formatDateKeyCompact(addDaysToLocalDateKey(baseDateKey, 1), locale)
                          : t('dayPlan.nextDayPrefix')
                        : null,
                  }),
                })
                : t('fixedRoutine.timePickA11y', { label })
            }
            accessibilityState={{
              selected: spineTimeIconHighlighted,
              expanded: spineTimeExpanded,
            }}
            borderColor={line}
            backgroundColor={actionBg}
            pressedBg={actionHoverBg}
            shadowColor={brutalShadow}
            onPress={handleToggleSpineTimeExpand}>
            <Reanimated.View style={spineTimeIconAnimatedStyle}>
              <IconSymbol
                name="clock.fill"
                size={13}
                color={spineTimeIconHighlighted ? actionInk : actionMuted}
              />
            </Reanimated.View>
          </FlowBrutalActionButton>
        ) : null}
        {showStartNotify && onToggleStartNotify ? (
          <FlowBrutalActionButton
            accessibilityLabel={t('fixedRoutine.startNotifyA11y', { label, state: startNotifyEnabled ? t('common.on') : t('common.off') })}
            accessibilityState={{ selected: startNotifyEnabled }}
            borderColor={line}
            backgroundColor={actionBg}
            pressedBg={actionHoverBg}
            shadowColor={brutalShadow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleToggleStartNotify();
            }}>
            <IconSymbol
              name={startNotifyEnabled ? 'bell.fill' : 'bell'}
              size={13}
              color={startNotifyEnabled ? actionInk : canStartNotify ? actionInk : actionMuted}
            />
          </FlowBrutalActionButton>
        ) : null}
        <FlowBrutalActionButton
          accessibilityLabel={t('dayPlan.detailSettingsA11y', { label })}
          borderColor={line}
          backgroundColor={actionBg}
          pressedBg={actionHoverBg}
          shadowColor={brutalShadow}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSettings();
          }}>
          <IconSymbol name="slider.horizontal.3" size={13} color={actionInk} />
        </FlowBrutalActionButton>
        <FlowBrutalActionButton
          accessibilityLabel={t('fixedRoutine.deleteRoutineA11y', { label })}
          borderColor={line}
          backgroundColor={actionBg}
          pressedBg={actionHoverBg}
          shadowColor={brutalShadow}
          onPress={onDelete}>
          <IconSymbol name="trash" size={13} color={actionMuted} />
        </FlowBrutalActionButton>
        <Switch
          accessibilityLabel={t('fixedRoutine.toggleA11y', { label, state: enabled ? t('common.on') : t('common.off') })}
          value={enabled}
          onValueChange={(next) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleEnabled(next);
          }}
          trackColor={{ false: trackOff, true: '#000000' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={trackOff}
          style={styles.flowSwitch}
        />
      </View>
      {detailAccordion.mounted ? (
        <Reanimated.View style={[styles.flowDetailPanel, detailAccordion.panelStyle]}>
          <View
            style={[styles.flowDetailMeasure, { borderTopColor: line }]}
            onLayout={(event) => {
              detailAccordion.onContentLayout(event.nativeEvent.layout.height);
            }}>
            <PriorityBagRowAccordionPanel
              categoryKey={categoryKey}
              label={label}
              startMinutes={showSpineTimePicker ? spineStartMinutes : undefined}
              endMinutes={showSpineTimePicker ? spineEndMinutes : undefined}
              ink={ink}
              muted={muted}
              line={line}
              isDark={isDark}
            />
          </View>
        </Reanimated.View>
      ) : null}
      {showMealSlotPicker && onToggleMealSlot ? (
        <Reanimated.View
          pointerEvents={mealSlotExpanded ? 'auto' : 'none'}
          style={[
            styles.flowMealSlotPanel,
            mealSlotPanelAnimatedStyle,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
              borderTopColor: line,
            },
          ]}>
          <CatalogRowMealSlotChips
            selectedSlots={mealSlots}
            ink={ink}
            muted={muted}
            line={line}
            isDark={isDark}
            onToggleSlot={handleToggleMealSlot}
            contentInsetLeft={8}
          />
        </Reanimated.View>
      ) : null}
      {showSpineTimePicker && onChangeSpineTime && spineTimeExpanded ? (
        <View
          ref={spineTimePanelRef}
          style={[
            styles.flowSpineTimePanel,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
            },
          ]}>
          <CatalogRowSpineTimePanel
            startMinutes={spineStartMinutes ?? 9 * 60}
            endMinutes={spineEndMinutes ?? 9 * 60 + 30}
            endsNextCalendarDay={spineEndsNextCalendarDay}
            baseDateKey={baseDateKey}
            ink={ink}
            muted={muted}
            line={line}
            isDark={isDark}
            onScheduleChange={onChangeSpineTime}
            onRequestScrollIntoView={() => {
              const measureAndEnsure = () => {
                spineTimePanelRef.current?.measureInWindow((_x, y, _w, h) => {
                  onEnsureVisibleAboveKeyboard?.(y, h);
                });
              };
              requestAnimationFrame(measureAndEnsure);
              // 키패드 애니메이션·KeyboardAvoidingView 레이아웃 반영 후 재측정
              setTimeout(measureAndEnsure, 120);
              setTimeout(measureAndEnsure, 280);
            }}
            contentInsetLeft={8}
          />
        </View>
      ) : null}
    </View>
  );
}

type AddItemModalProps = {
  visible: boolean;
  title: string;
  sections: AddablePriorityCatalogSection[];
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onConfirm: (keys: string[]) => void;
  onCreateCustom: () => void;
};

function AddItemModal({
  visible,
  title,
  sections,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
  onCreateCustom,
}: AddItemModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setSelectedKeys(new Set());
  }, [visible]);

  const selectedCount = selectedKeys.size;

  const toggleSelection = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedCount === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm([...selectedKeys]);
    onClose();
  }, [onClose, onConfirm, selectedCount, selectedKeys]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalSheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.modalHeader, { borderBottomColor: line }]}>
          <ThemedText style={[styles.modalTitle, { color: ink }]}>{title}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 20, gap: 2 }}
          keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('fixedRoutine.createNew')}
            onPress={() => {
              onClose();
              onCreateCustom();
            }}
            style={({ pressed }) => [styles.modalCreateRow, pressed && { opacity: 0.72 }]}>
            <IconSymbol name="plus.circle.fill" size={20} color={ink} />
            <ThemedText style={[styles.modalRowLabel, { color: ink }]}>{t('fixedRoutine.createNew')}</ThemedText>
          </Pressable>
          {sections.map((section) => (
            <View key={section.groupKey}>
              <ThemedText style={[styles.modalSectionTitle, { color: muted }]}>{section.title}</ThemedText>
              {section.items.map((cat) => {
                const selected = selectedKeys.has(cat.key);
                return (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t('fixedRoutine.selectItemA11y', { label: cat.label, state: selected ? t('common.selected') : t('common.select') })}
                    onPress={() => toggleSelection(cat.key)}
                    style={({ pressed }) => [
                      styles.modalPickRow,
                      {
                        borderBottomColor: line,
                        backgroundColor: selected
                          ? isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)'
                          : 'transparent',
                      },
                      pressed && { opacity: 0.72 },
                    ]}>
                    <IconSymbol
                      name={resolveCategoryCatalogIcon(cat.key) as any}
                      size={18}
                      color={activeIconColorByCategory(cat.key)}
                    />
                    <ThemedText style={[styles.modalRowLabel, { color: ink }]}>{cat.label}</ThemedText>
                    <IconSymbol
                      name={selected ? 'checkmark.circle.fill' : 'circle'}
                      size={18}
                      color={selected ? ink : muted}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {sections.length === 0 ? (
            <ThemedText style={[styles.modalEmpty, { color: muted }]}>
              {t('fixedRoutine.modalEmpty')}
            </ThemedText>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.modalFooter,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectedCount > 0 ? t('fixedRoutine.addItemsA11y', { count: selectedCount }) : t('fixedRoutine.pickItems')}
            disabled={selectedCount === 0}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.modalConfirmBtn,
              {
                backgroundColor: selectedCount > 0 ? ink : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                opacity: pressed && selectedCount > 0 ? 0.9 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.modalConfirmLabel,
                { color: selectedCount > 0 ? (isDark ? '#09090b' : '#fff') : muted },
              ]}>
              {selectedCount > 0 ? t('fixedRoutine.addCount', { count: selectedCount }) : t('fixedRoutine.pickItems')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type GroupAccordionProps = {
  setItem: FixedFlowSet;
  isPresetScheduleSet: boolean;
  mealSlotLayoutEnabled: boolean;
  spineLayoutEnabled: boolean;
  priorityStart: string;
  priorityEnd: string;
  baseDateKey?: string;
  isExpanded: boolean;
  isActiveForToday: boolean;
  applyBlocked: boolean;
  catalogByKey: Map<string, PriorityCatalogRow>;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  actionBg: string;
  actionHoverBg: string;
  shadow: string;
  sectionBg: string;
  isFocusStarted: boolean;
  isCategoryInTodayPlan: (categoryKey: string) => boolean;
  isCategoryCompleted: (categoryKey: string) => boolean;
  onToggleExpand: () => void;
  onToggleActiveForToday: () => void;
  onApplyBlocked: () => void;
  canDeleteSet: boolean;
  onDeleteSet: () => void;
  onRenameSet?: (nextName: string) => void;
  onToggleItem: (categoryKey: string, enabled: boolean) => void;
  onDeleteItem: (categoryKey: string, label: string) => void;
  onOpenAddItem?: () => void;
  onToggleItemMealSlot?: (categoryKey: string, slot: DayMealSlot) => void;
  onChangeItemSpineTime?: (
    categoryKey: string,
    startMinutes: number,
    endMinutes: number,
    endsNextCalendarDay: boolean,
  ) => void;
  onEnsureVisibleAboveKeyboard?: (windowY: number, height: number) => void;
  isStartNotifyEnabled?: (categoryKey: string) => boolean;
  onToggleStartNotify?: (categoryKey: string) => void;
  onOpenCategorySettings: (categoryKey: string) => void;
  postItFaceColorId: PostItFaceColorId;
  onSelectPostItFaceColor: (id: PostItFaceColorId) => void;
};

function GroupAccordion({
  setItem,
  isPresetScheduleSet,
  mealSlotLayoutEnabled,
  spineLayoutEnabled,
  priorityStart,
  priorityEnd,
  baseDateKey,
  isExpanded,
  isActiveForToday,
  applyBlocked,
  catalogByKey,
  isDark,
  ink: baseInk,
  muted: baseMuted,
  line: baseLine,
  actionBg: baseActionBg,
  actionHoverBg: baseActionHoverBg,
  shadow: _baseShadow,
  sectionBg: _baseSectionBg,
  isFocusStarted,
  isCategoryInTodayPlan,
  isCategoryCompleted,
  onToggleExpand,
  onToggleActiveForToday,
  onApplyBlocked,
  canDeleteSet,
  onDeleteSet,
  onRenameSet,
  onToggleItem,
  onDeleteItem,
  onOpenAddItem,
  onToggleItemMealSlot,
  onChangeItemSpineTime,
  onEnsureVisibleAboveKeyboard,
  isStartNotifyEnabled,
  onToggleStartNotify,
  onOpenCategorySettings,
  postItFaceColorId,
  onSelectPostItFaceColor,
}: GroupAccordionProps) {
  const { t } = useTranslation();
  const usesLightInk = postItFaceUsesLightInk(postItFaceColorId);
  const sectionBg = resolvePostItFaceColor(postItFaceColorId, isDark);
  const ink = resolvePostItFaceInk(postItFaceColorId, baseInk);
  const muted = resolvePostItFaceMuted(postItFaceColorId, baseMuted);
  const line = usesLightInk ? 'rgba(255,255,255,0.22)' : baseLine;
  /** 액션 버튼은 항상 흰 면 + 검정 아이콘 (어두운 포스트잇에서도 아이콘이 보이게) */
  const actionBg = '#FFFFFF';
  const actionHoverBg = 'rgba(255,255,255,0.92)';
  const actionInk = '#000000';
  const actionMuted = 'rgba(0,0,0,0.55)';
  const shadow = '#000000';
  const groupAccordion = useMeasuredAccordion(isExpanded, `group:${setItem.id}`);
  const displaySetName = resolveFixedFlowSetDisplayName(setItem);
  const enabledCount = setItem.items.filter((x) => x.enabled !== false).length;
  const totalCount = setItem.items.length;
  const canRenameSet = !isPresetScheduleSet && Boolean(onRenameSet);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displaySetName);

  useEffect(() => {
    if (!isEditingName) {
      setNameDraft(displaySetName);
    }
  }, [isEditingName, displaySetName]);

  const commitRename = useCallback(() => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(displaySetName);
      setIsEditingName(false);
      return;
    }
    if (trimmed !== setItem.name && trimmed !== displaySetName) {
      onRenameSet?.(trimmed);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditingName(false);
  }, [nameDraft, onRenameSet, setItem.name, displaySetName]);

  const cancelRename = useCallback(() => {
    setNameDraft(displaySetName);
    setIsEditingName(false);
  }, [displaySetName]);

  const startRename = useCallback(() => {
    if (!canRenameSet) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameDraft(displaySetName);
    setIsEditingName(true);
  }, [canRenameSet, displaySetName]);

  const useSpineLayout = spineLayoutEnabled;
  /** 목록 모드에서는 시간 UI 없음 — 시각·시작 알림은 타임라인 모드에서만 */
  const useStartTimePicker = useSpineLayout;
  const useMealSlotFlatPickerLayout = mealSlotLayoutEnabled && !spineLayoutEnabled;
  const spineSchedules = useMemo(() => {
    if (!useStartTimePicker) return new Map();
    return resolveFixedFlowSpineSchedules({
      items: setItem.items,
      priorityStart,
      priorityEnd,
    });
  }, [priorityEnd, priorityStart, setItem.items, useStartTimePicker]);

  const applyChipBlocked = applyBlocked && !isActiveForToday;
  const disableApplyToggle = applyChipBlocked;
  const applyLabel = isActiveForToday ? t('fixedRoutine.applying') : t('fixedRoutine.apply');
  const applyA11yLabel = isActiveForToday
    ? t('fixedRoutine.unapply')
    : applyChipBlocked
      ? t('fixedRoutine.applyBlockedA11y')
      : t('fixedRoutine.apply');
  const ruleLabel = isPresetScheduleSet ? getFixedFlowPresetScheduleLabel(setItem.applyRule) : null;
  const scheduleHint = isPresetScheduleSet ? getFixedFlowPresetScheduleHint(setItem.applyRule) : null;

  return (
    <PostItCardShell
      isDark={isDark}
      faceColor={sectionBg}
      borderColor={postItFaceColorId === 'white' && !isDark ? 'rgba(0,0,0,0.16)' : undefined}
      borderWidth={postItFaceColorId === 'white' && !isDark ? StyleSheet.hairlineWidth : 0}>
    <View style={styles.accordionSectionInner}>
      <View style={[styles.accordionHeader, { backgroundColor: 'transparent' }]}>
        {canRenameSet && isEditingName ? (
          <View style={styles.renameGroupRow}>
            <ThemedTextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={commitRename}
              placeholder={t('fixedRoutine.groupNamePlaceholder')}
              placeholderTextColor={muted}
              style={[styles.renameGroupInput, { color: ink }]}
              accessibilityLabel={t('fixedRoutine.editGroupNameA11y')}
            />
            <View style={styles.renameGroupActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('fixedRoutine.cancelRenameA11y')}
                onPress={cancelRename}
                hitSlop={6}>
                <ThemedText style={[styles.renameGroupCancel, { color: muted }]}>{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('fixedRoutine.saveGroupNameA11y')}
                onPress={commitRename}
                style={[styles.renameGroupSave, { backgroundColor: ink, borderColor: ink }]}>
                <ThemedText
                  style={[
                    styles.renameGroupSaveLabel,
                    { color: usesLightInk ? sectionBg : isDark ? '#09090b' : '#fff' },
                  ]}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.accordionHeaderMain}>
              {canRenameSet ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('fixedRoutine.renameGroupA11y', { name: displaySetName })}
                  accessibilityHint={t('fixedRoutine.renameHint')}
                  onPress={startRename}
                  style={({ pressed }) => [
                    styles.accordionTitlePress,
                    pressed && { opacity: 0.72 },
                  ]}>
                  <ThemedText
                    style={[styles.accordionTitle, styles.accordionTitleText, { color: ink }]}
                    numberOfLines={1}>
                    {displaySetName}
                  </ThemedText>
                  <IconSymbol name="pencil" size={10} color={muted} />
                </Pressable>
              ) : (
                <ThemedText
                  style={[styles.accordionTitle, styles.accordionTitleText, { color: ink }]}
                  numberOfLines={1}>
                  {displaySetName}
                </ThemedText>
              )}
            </View>
            {isPresetScheduleSet && ruleLabel ? (
              <View
                style={[
                  styles.brutalBtnShell,
                  { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.brutalBtnShadow,
                    {
                      backgroundColor: shadow,
                      transform: [
                        { translateX: BRUTAL_SHADOW_SM },
                        { translateY: BRUTAL_SHADOW_SM },
                      ],
                    },
                  ]}
                />
                <View
                  accessibilityRole="text"
                  accessibilityLabel={ruleLabel}
                  style={[styles.rulePill, { backgroundColor: sectionBg }]}>
                  <ThemedText
                    style={[styles.rulePillText, { color: ink }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}>
                    {ruleLabel}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <FlowBrutalActionButton
              accessibilityLabel={applyA11yLabel}
              accessibilityState={{ disabled: disableApplyToggle }}
              disabled={disableApplyToggle}
              borderColor={line}
              backgroundColor={actionBg}
              pressedBg={actionBg}
              shadowColor={shadow}
              width={58}
              lockVisual
              onPress={() => {
                if (disableApplyToggle) {
                  if (applyChipBlocked) onApplyBlocked();
                  return;
                }
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleActiveForToday();
              }}>
              <ThemedText
                style={[styles.headerApplyChipLabel, { color: actionInk }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}>
                {applyLabel}
              </ThemedText>
            </FlowBrutalActionButton>
            {!isPresetScheduleSet && canDeleteSet ? (
              <View
                style={[
                  styles.brutalBtnShell,
                  { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.brutalBtnShadow,
                    {
                      backgroundColor: shadow,
                      borderColor: line,
                      transform: [
                        { translateX: BRUTAL_SHADOW_SM },
                        { translateY: BRUTAL_SHADOW_SM },
                      ],
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('fixedRoutine.deleteGroupA11y', { name: displaySetName })}
                  onPress={onDeleteSet}
                  style={({ pressed }) => [
                    styles.headerDeleteBtn,
                    {
                      borderColor: line,
                      backgroundColor: pressed ? actionHoverBg : actionBg,
                    },
                    pressed && { opacity: 0.92 },
                  ]}>
                  <IconSymbol name="trash" size={12} color={actionMuted} />
                </Pressable>
              </View>
            ) : null}
            <FlowBrutalActionButton
              accessibilityLabel={t('fixedRoutine.expandA11y', {
                name: displaySetName,
                action: isExpanded ? t('common.collapse') : t('common.expand'),
              })}
              accessibilityState={{ expanded: isExpanded }}
              borderColor={line}
              backgroundColor={actionBg}
              pressedBg={actionBg}
              shadowColor={shadow}
              width={50}
              lockVisual
              onPress={onToggleExpand}>
              <View style={styles.accordionHeaderRight}>
                <ThemedText style={[styles.countPillText, { color: actionInk }]}>
                  {enabledCount}/{totalCount}
                </ThemedText>
                <Reanimated.View style={groupAccordion.chevronStyle}>
                  <IconSymbol name="chevron.down" size={11} color={actionInk} />
                </Reanimated.View>
              </View>
            </FlowBrutalActionButton>
          </>
        )}
      </View>

      {groupAccordion.mounted ? (
        <Reanimated.View style={[styles.groupAccordionPanel, groupAccordion.panelStyle]}>
        <View
          style={[
            styles.accordionBody,
            {
              borderTopColor: usesLightInk
                ? 'rgba(255,255,255,0.22)'
                : isDark
                  ? 'rgba(241,239,255,0.22)'
                  : 'rgba(24,26,46,0.12)',
            },
          ]}
          onLayout={(event) => {
            groupAccordion.onContentLayout(event.nativeEvent.layout.height);
          }}>
          <PostItFaceColorChips
            compact
            selectedId={postItFaceColorId}
            isDark={isDark}
            ink={ink}
            shadowColor="#000000"
            onSelect={onSelectPostItFaceColor}
          />
          {scheduleHint ? (
            <ThemedText style={[styles.accordionRuleHint, { color: muted }]}>{scheduleHint}</ThemedText>
          ) : null}
          {(() => {
            if (totalCount === 0) {
              return (
                <ThemedText style={[styles.accordionEmpty, { color: muted }]}>
                  {t('fixedRoutine.groupEmpty')}
                </ThemedText>
              );
            }
            return null;
          })()}
          <View style={styles.cardList}>
            {setItem.items.map((item, itemIndex) => {
              const cat = catalogByKey.get(item.categoryKey);
              const itemLabel = cat?.label ?? getPickerCategoryLabel(item.categoryKey);
              const schedule = useStartTimePicker
                ? spineSchedules.get(item.categoryKey)
                : undefined;
              const itemMealSlots = useMealSlotFlatPickerLayout
                ? resolveFixedFlowItemMealSlots(item, itemIndex)
                : [];
              return (
                <FlowItemCard
                  key={item.categoryKey}
                  item={item}
                  catalog={cat}
                  isDark={isDark}
                  ink={ink}
                  muted={muted}
                  line={line}
                  actionBg={actionBg}
                  actionHoverBg={actionHoverBg}
                  shadow={shadow}
                  isFocusStarted={isFocusStarted}
                  isInTodayPlan={isCategoryInTodayPlan(item.categoryKey)}
                  isCompleted={isCategoryCompleted(item.categoryKey)}
                  mealSlots={itemMealSlots}
                  showMealSlotPicker={useMealSlotFlatPickerLayout}
                  onToggleMealSlot={
                    useMealSlotFlatPickerLayout
                      ? (slot) => onToggleItemMealSlot?.(item.categoryKey, slot)
                      : undefined
                  }
                  showSpineTimePicker={useStartTimePicker}
                  spineStartMinutes={schedule?.startMinutes}
                  spineEndMinutes={schedule?.endMinutes}
                  spineEndsNextCalendarDay={schedule?.endsNextCalendarDay}
                  spineTimeIsSuggested={schedule?.isSuggested === true}
                  baseDateKey={baseDateKey}
                  onChangeSpineTime={
                    useStartTimePicker
                      ? (startMinutes, endMinutes, endsNextCalendarDay) =>
                        onChangeItemSpineTime?.(
                          item.categoryKey,
                          startMinutes,
                          endMinutes,
                          endsNextCalendarDay,
                        )
                      : undefined
                  }
                  onEnsureVisibleAboveKeyboard={onEnsureVisibleAboveKeyboard}
                  startNotifyEnabled={isStartNotifyEnabled?.(item.categoryKey) ?? false}
                  onToggleStartNotify={
                    onToggleStartNotify
                      ? () => onToggleStartNotify(item.categoryKey)
                      : undefined
                  }
                  onOpenSettings={() => onOpenCategorySettings(item.categoryKey)}
                  onToggleEnabled={(enabled) => onToggleItem(item.categoryKey, enabled)}
                  onDelete={() => onDeleteItem(item.categoryKey, itemLabel)}
                />
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fixedRoutine.addItem')}
              onPress={onOpenAddItem}
              style={({ pressed }) => [
                styles.addRow,
                { opacity: pressed ? 0.88 : 1 },
              ]}>
              <IconSymbol name="plus" size={12} color={muted} />
              <ThemedText style={[styles.addRowLabel, { color: muted }]}>{t('fixedRoutine.addItem')}</ThemedText>
            </Pressable>
          </View>
        </View>
        </Reanimated.View>
      ) : null}
    </View>
    </PostItCardShell>
  );
}

type FixedRoutinePageProps = {
  /** 루틴 탭 내부 — 고정 루틴(프리셋) 커스텀만 표시 */
  embeddedPresetOnly?: boolean;
  /** 루틴 탭 내부 — 나만의 루틴(커스텀 그룹)만 표시 */
  embeddedCustomOnly?: boolean;
  /** 상위 화면에서 보기 모드(목록·시간대·타임라인)를 제어할 때 */
  controlledLayoutMode?: DayPlanLayoutMode;
  hideLayoutModeHeader?: boolean;
};

export function FixedRoutinePage({
  embeddedPresetOnly = false,
  embeddedCustomOnly = false,
  controlledLayoutMode,
  hideLayoutModeHeader = false,
}: FixedRoutinePageProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const isEmbedded = embeddedPresetOnly || embeddedCustomOnly;
  const [catalogTick, setCatalogTick] = useState(0);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>(
    () => listAllCustomFlowCatalogEntries(),
  );
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>(
    () => listCustomCatalogGroups(),
  );
  const [postItFaceByGroup, setPostItFaceByGroup] = useState<PostItFaceColorByGroup>(
    () => loadPostItFaceColorByGroup(),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (!embeddedCustomOnly) return new Set();
    const allSets = useFixedFlowSetsStore.getState().sets;
    const firstPreset = BUILTIN_PRESET_SCHEDULE_SET_IDS.map((id) =>
      allSets.find((setItem) => setItem.id === id),
    ).find((setItem): setItem is FixedFlowSet => Boolean(setItem));
    if (firstPreset) return new Set([firstPreset.id]);
    const firstCustom = allSets.find((setItem) => setItem.applyRule === 'manual');
    return firstCustom ? new Set([firstCustom.id]) : new Set();
  });
  const [section, setSection] = useState<FixedRoutineSection>('catalog');
  const [internalLayoutMode, setInternalLayoutMode] = useState<DayPlanLayoutMode>('bag');
  const layoutMode = controlledLayoutMode ?? internalLayoutMode;
  /** 시안 `px-margin-mobile` 20 */
  const horizontalPad =
    isEmbedded || section === 'catalog' || section === 'templates' ? 20 : 16;

  const [priorityWindowSheetOpen, setPriorityWindowSheetOpen] = useState(false);
  const [mealSlotScheduleSheetOpen, setMealSlotScheduleSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addItemSetId, setAddItemSetId] = useState<string | null>(null);

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const targetSetIdRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const { height: windowHeight } = useWindowDimensions();

  const handleSelectPostItFaceColor = useCallback(
    (setId: string, colorId: PostItFaceColorId) => {
      setPostItFaceByGroup(
        savePostItFaceColorForGroup(`my-routine:${setId}`, colorId),
      );
    },
    [],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const ensureVisibleAboveKeyboard = useCallback(
    (windowY: number, height: number) => {
      const kb = keyboardHeightRef.current;
      if (kb <= 0) return;
      const keyboardTop = windowHeight - kb;
      const fieldBottom = windowY + height;
      const overlap = fieldBottom - keyboardTop + 24;
      if (overlap <= 0) return;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollOffsetRef.current + overlap),
        animated: true,
      });
    },
    [windowHeight],
  );

  const [nowTick, setNowTick] = useState(() => Date.now());
  const contentOpacity = useSharedValue(0);

  const layoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const hydrateLayoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.hydrate);
  const canManageCustomGroups = embeddedCustomOnly || false;
  const useSectionsRoutineLayout = layoutMode === 'sections';
  const useSpineRoutineLayout = layoutMode === 'spine';

  const {
    sets,
    activeSetIds,
    activeSetIdsByLayoutMode,
    hydrate,
    addSet,
    toggleSetForToday,
    removeSet,
    renameSet,
    addCategoryToSet,
    removeCategoryFromSet,
    setCategoryEnabledInSet,
    toggleCategoryMealSlotInSet,
    setCategorySpineScheduleInSet,
    fixedRoutineApplyLayoutMode,
    setFixedRoutineApplyLayoutMode,
    isHydrated: isFixedFlowHydrated,
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      sets: s.sets,
      activeSetIds: s.activeSetIds,
      activeSetIdsByLayoutMode: s.activeSetIdsByLayoutMode,
      hydrate: s.hydrate,
      addSet: s.addSet,
      toggleSetForToday: s.toggleSetForToday,
      removeSet: s.removeSet,
      renameSet: s.renameSet,
      addCategoryToSet: s.addCategoryToSet,
      removeCategoryFromSet: s.removeCategoryFromSet,
      setCategoryEnabledInSet: s.setCategoryEnabledInSet,
      toggleCategoryMealSlotInSet: s.toggleCategoryMealSlotInSet,
      setCategorySpineScheduleInSet: s.setCategorySpineScheduleInSet,
      fixedRoutineApplyLayoutMode: s.fixedRoutineApplyLayoutMode,
      setFixedRoutineApplyLayoutMode: s.setFixedRoutineApplyLayoutMode,
      isHydrated: s.isHydrated,
    })),
  );

  const {
    planMode,
    priorityStart,
    priorityEnd,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    isFocusStarted,
    priorityCategoryOrder,
    prioritySectionsCategoryOrder,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
    setPriorityStart,
    setPriorityEnd,
    syncOvernightPriorityPlanDates,
    setPriorityCategoryOrder,
    filterCompletedFocusKeysToPriorityOrder,
    categoryLabelEpoch,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      isFocusStarted: s.isFocusStarted,
      priorityCategoryOrder: s.priorityCategoryOrder,
      prioritySectionsCategoryOrder: s.prioritySectionsCategoryOrder,
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
      setPriorityStart: s.setPriorityStart,
      setPriorityEnd: s.setPriorityEnd,
      syncOvernightPriorityPlanDates: s.syncOvernightPriorityPlanDates,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
      categoryLabelEpoch: s.categoryLabelEpoch,
    })),
  );

  const planBlocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const {
    schedule: mealSlotSchedule,
    persistSchedule: persistMealSlotSchedule,
    syncWithPriorityWindow: syncMealSlotScheduleWithPriorityWindow,
  } = useDayMealSlotSchedule();
  const [startNotifyRevision, setStartNotifyRevision] = useState(0);

  useEffect(() => {
    syncMealSlotScheduleWithPriorityWindow(
      priorityStart,
      priorityEnd,
      isOvernightHhmmRange(priorityStart, priorityEnd),
    );
  }, [priorityStart, priorityEnd, syncMealSlotScheduleWithPriorityWindow]);

  const handleToggleStartNotify = useCallback(async (categoryKey: string) => {
    const nextEnabled = !isRoutineStartNotifyEnabled(categoryKey);
    const ok = await persistRoutineStartNotifyToggle(categoryKey, nextEnabled);
    setStartNotifyRevision((n) => n + 1);
    if (nextEnabled && !ok) {
      Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
      return;
    }
    void Haptics.notificationAsync(
      nextEnabled && ok
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  }, []);

  const isStartNotifyEnabledForCategory = useCallback(
    (categoryKey: string) => {
      void startNotifyRevision;
      return isRoutineStartNotifyEnabled(categoryKey);
    },
    [startNotifyRevision],
  );

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

  const isCategoryCompleted = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(categoryKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  const isCategoryInTodayPlan = useCallback(
    (categoryKey: string) => {
      const matches = (key: string) => resolvePriorityRoutineCategoryKey(key) === categoryKey;

      if (useSpineRoutineLayout) {
        return collectSpineTimelineCategoryKeys(planBlocks).some(matches);
      }
      if (useSectionsRoutineLayout) {
        return prioritySectionsCategoryOrder.some(matches);
      }
      return priorityCategoryOrder.some(matches);
    },
    [
      planBlocks,
      priorityCategoryOrder,
      prioritySectionsCategoryOrder,
      useSectionsRoutineLayout,
      useSpineRoutineLayout,
    ],
  );

  const handleToggleItemMealSlot = useCallback(
    (setId: string, categoryKey: string, slot: DayMealSlot) => {
      toggleCategoryMealSlotInSet(setId, categoryKey, slot);
      void Haptics.selectionAsync();
    },
    [toggleCategoryMealSlotInSet],
  );

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const priorityWindowEndedForToday = useMemo(
    () =>
      isPriorityWindowEndedForToday({
        planMode,
        priorityStart,
        priorityEnd,
        priorityPlanDateKey,
        priorityPlanDateKeyEnd,
        nowKey: getLocalDateKey(),
        nowMin: getLocalMinutesOfDayNow(),
      }),
    [
      planMode,
      priorityStart,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      nowTick,
    ],
  );

  const handleApplyBlocked = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('alert.focusEnded.title'), t('fixedRoutine.focusEndedApply'));
  }, []);

  const presetSets = useMemo(() => {
    return BUILTIN_PRESET_SCHEDULE_SET_IDS.map((id) =>
      sets.find((setItem) => setItem.id === id),
    ).filter((setItem): setItem is FixedFlowSet => Boolean(setItem));
  }, [sets]);

  const customSets = useMemo(
    () => sets.filter((setItem) => setItem.applyRule === 'manual'),
    [sets],
  );

  const visibleSets = useMemo(() => {
    if (embeddedPresetOnly) return presetSets;
    // 나만의 루틴 탭 — 데일리·주말(프리셋) + 직접 만든 그룹을 한 목록으로
    if (embeddedCustomOnly) return [...presetSets, ...customSets];
    return [];
  }, [customSets, embeddedCustomOnly, embeddedPresetOnly, presetSets]);

  useEffect(() => {
    if (controlledLayoutMode !== undefined) return;
    setInternalLayoutMode((prev) =>
      coerceDayPlanLayoutMode(fixedRoutineApplyLayoutMode, layoutModeVisibility) || prev,
    );
  }, [controlledLayoutMode, fixedRoutineApplyLayoutMode, layoutModeVisibility]);

  // 상위(목록·시간대·타임라인) 탭과 스토어 편집 모드를 항상 맞춤
  useEffect(() => {
    if (controlledLayoutMode === undefined) return;
    if (fixedRoutineApplyLayoutMode === controlledLayoutMode) return;
    setFixedRoutineApplyLayoutMode(controlledLayoutMode);
  }, [controlledLayoutMode, fixedRoutineApplyLayoutMode, setFixedRoutineApplyLayoutMode]);

  const reloadCatalog = useCallback(() => {
    setCatalogTick((n) => n + 1);
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
  }, []);

  useEffect(() => {
    // 앱 부트스트랩에서 이미 hydrate된 경우 재로드하지 않는다.
    // 탭 첫 마운트에서 같은 데이터를 다시 set하면 포스트잇 전체가 재렌더된다.
    hydrate();
    hydrateLayoutModeVisibility();
  }, [hydrate, hydrateLayoutModeVisibility]);

  useEffect(() => {
    contentOpacity.value = isFixedFlowHydrated
      ? withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      : 0;
  }, [contentOpacity, isFixedFlowHydrated]);

  useEffect(() => subscribeCustomFlowCatalog(reloadCatalog), [reloadCatalog]);

  /** 세트 id 구성이 바뀔 때만 — 사라진 id만 정리. 나만의 루틴은 첫 그룹만 기본 펼침 */
  const visibleSetIdsKey = useMemo(
    () => visibleSets.map((setItem) => setItem.id).join('\0'),
    [visibleSets],
  );

  useEffect(() => {
    if (!visibleSetIdsKey) {
      setExpandedIds((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    const ids = visibleSetIdsKey.split('\0').filter(Boolean);
    const valid = new Set(ids);
    setExpandedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
      }
      if (embeddedCustomOnly && next.size === 0 && ids[0]) {
        next.add(ids[0]!);
      }
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  }, [embeddedCustomOnly, section, visibleSetIdsKey]);

  useEffect(() => {
    if (!canManageCustomGroups) {
      setIsAddingGroup(false);
      setNewGroupName('');
    }
  }, [canManageCustomGroups]);

  /** 항목 추가 모달이 열릴 때마다 카탈로그를 최신으로 갱신 */
  useEffect(() => {
    if (addItemModalOpen) reloadCatalog();
  }, [addItemModalOpen, reloadCatalog]);

  const catalog = useMemo(() => {
    void catalogTick;
    void categoryLabelEpoch;
    return buildPriorityCatalogRows();
  }, [catalogTick, categoryLabelEpoch]);
  const catalogByKey = useMemo(() => new Map(catalog.map((x) => [x.key, x])), [catalog]);

  const addableSectionsForModal = useMemo(() => {
    const setItem = sets.find((s) => s.id === addItemSetId);
    if (!setItem) return [];
    const excludedKeys = new Set(setItem.items.map((x) => x.categoryKey));
    void catalogTick;
    void categoryLabelEpoch;
    return buildAddablePriorityCatalogSections({
      excludedKeys,
      customFlowEntries,
      customGroups,
    });
  }, [catalogTick, categoryLabelEpoch, customFlowEntries, customGroups, sets, addItemSetId]);

  const toggleExpanded = useCallback((setId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  }, []);

  const handleDeleteSet = useCallback(
    (setId: string) => {
      if (isBuiltinPresetScheduleSet({ id: setId, applyRule: 'manual' })) return;
      const target = sets.find((s) => s.id === setId);
      if (!target) return;
      Alert.alert(
        t('fixedRoutine.deleteGroupTitle', { name: resolveFixedFlowSetDisplayName(target) }),
        t('fixedRoutine.deleteGroupMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              removeSet(setId);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [sets, removeSet],
  );

  const submitNewGroup = useCallback(() => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setIsAddingGroup(false);
      setNewGroupName('');
      return;
    }
    addSet(trimmed);
    setNewGroupName('');
    setIsAddingGroup(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextSets = useFixedFlowSetsStore.getState().sets;
    const created = nextSets[nextSets.length - 1];
    if (created) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedIds((prev) => new Set([...prev, created.id]));
    }
  }, [addSet, newGroupName]);

  const handleCreateCustomFlow = useCallback(
    ({
      name,
      groupKey,
      icon,
      accentColor,
      templateKey,
      summary,
      templateDataConfig,
    }: {
      name: string;
      groupKey: string;
      icon: string;
      accentColor: string;
      templateKey: CustomFlowTemplateKey;
      summary?: string;
      templateDataConfig?: unknown;
    }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey =
        typeof groupKey === 'string' && groupKey.trim().length > 0
          ? groupKey.trim()
          : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
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
      reloadCatalog();
      const targetSetId = targetSetIdRef.current ?? addItemSetId ?? sets[0]?.id;
      if (targetSetId) addCategoryToSet(targetSetId, id);
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [addCategoryToSet, sets, addItemSetId, reloadCatalog],
  );

  const openAddItemModal = useCallback((setId: string) => {
    targetSetIdRef.current = setId;
    setAddItemSetId(setId);
    setAddItemModalOpen(true);
  }, []);

  const addItemModalTitle = t('fixedRoutine.addItemTitle');

  const activeSection = embeddedPresetOnly
    ? ('scheduled' as const)
    : embeddedCustomOnly
      ? ('custom' as const)
      : section;
  const isCityPopCatalogSurface =
    activeSection === 'catalog' || activeSection === 'templates';
  const useBrutalSurface = isEmbedded || isCityPopCatalogSurface;
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  /** 이전 앱 배경 — warm beige (페이지 배경만 유지) */
  const shellBg =
    isEmbedded || isCityPopCatalogSurface
      ? isDark
        ? tone.bg
        : tone.bg
      : c.bg;
  const cardBg = useBrutalSurface
    ? isDark
      ? tone.surfaceAlt
      : '#FFFFFF'
    : c.containerLowest;
  const actionBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const actionHoverBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(168, 218, 220, 0.35)';
  const shadow = isDark ? tone.solidShadow : tone.text;
  const sectionBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const ink = useBrutalSurface ? tone.text : c.onSurface;
  const muted = useBrutalSurface ? tone.textMuted : c.onVariant;
  const line = useBrutalSurface ? tone.border : c.catBorderIdle;
  const activeSetIdsForLayout =
    activeSetIdsByLayoutMode?.[layoutMode] ?? activeSetIds ?? [];
  const isSetActiveForToday = useCallback(
    (setItem: FixedFlowSet) => activeSetIdsForLayout.includes(setItem.id),
    [activeSetIdsForLayout],
  );
  const sectionHint = sectionHintText(activeSection, layoutMode);
  const addGroupFaceId = DEFAULT_POST_IT_FACE_COLOR_ID;
  const addGroupFace = resolvePostItFaceColor(addGroupFaceId, isDark);
  const addGroupInk = resolvePostItFaceInk(addGroupFaceId, ink);
  const addGroupMuted = resolvePostItFaceMuted(addGroupFaceId, muted);
  const addGroupLine = postItFaceUsesLightInk(addGroupFaceId)
    ? 'rgba(255,255,255,0.28)'
    : 'rgba(0,0,0,0.18)';
  const addGroupActionBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.72)';
  const addGroupActionHover = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.92)';

  const openRoutineTemplateDetail = useCallback(
    (templateKey: CustomFlowTemplateKey) => {
      router.push({
        pathname: '/routine-template-detail',
        params: { templateKey },
      });
    },
    [router],
  );

  const openCategorySettings = useCallback(
    (categoryKey: string) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [router],
  );

  const atmosphereVariant: RoutineAtmosphereVariant = embeddedCustomOnly
    ? 'myRoutines'
    : embeddedPresetOnly
      ? 'fixed'
      : activeSection === 'templates'
        ? 'templates'
        : 'catalog';

  const pageBody = (
    <>
      <View
        style={[
          styles.stickyHeader,
          isEmbedded && hideLayoutModeHeader && styles.stickyHeaderEmbedded,
          { paddingHorizontal: horizontalPad, backgroundColor: 'transparent' },
        ]}>
        {!isEmbedded ? (
          <FixedRoutineSectionTabs
            section={section}
            onSelectSection={setSection}
            c={c}
            isDark={isDark}
          />
        ) : null}
        {canManageCustomGroups ? (
          isAddingGroup ? (
            <PostItCardShell
              compact
              isDark={isDark}
              faceColor={addGroupFace}
              style={styles.addGroupCardOuter}
              contentStyle={styles.addGroupCard}>
              <ThemedText style={[styles.addGroupCaption, { color: addGroupMuted }]}>
                {t('fixedRoutine.addGroupA11y')}
              </ThemedText>
              <ThemedTextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
                maxLength={24}
                placeholder={t('fixedRoutine.newGroupPlaceholder')}
                placeholderTextColor={addGroupMuted}
                style={[
                  styles.addGroupInput,
                  { color: addGroupInk, borderBottomColor: addGroupLine },
                ]}
                returnKeyType="done"
                onSubmitEditing={submitNewGroup}
                accessibilityLabel={t('fixedRoutine.newGroupPlaceholder')}
              />
              <View style={styles.addGroupActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  onPress={() => {
                    setIsAddingGroup(false);
                    setNewGroupName('');
                  }}
                  style={({ pressed }) => [
                    styles.addGroupCancelBtn,
                    {
                      borderColor: addGroupLine,
                      backgroundColor: pressed ? addGroupActionHover : addGroupActionBg,
                    },
                  ]}>
                  <ThemedText style={[styles.addGroupCancel, { color: addGroupInk }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('fixedRoutine.addGroupA11y')}
                  onPress={submitNewGroup}
                  style={({ pressed }) => [
                    styles.addGroupSubmit,
                    {
                      backgroundColor: addGroupInk,
                      borderColor: addGroupInk,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <ThemedText
                    style={[styles.addGroupSubmitLabel, { color: addGroupFace }]}>
                    {t('common.add')}
                  </ThemedText>
                </Pressable>
              </View>
            </PostItCardShell>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fixedRoutine.addGroupA11y')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsAddingGroup(true);
              }}
              style={({ pressed }) => [
                styles.addGroupTriggerHit,
                pressed && { opacity: 0.9, transform: [{ translateX: 1 }, { translateY: 1 }] },
              ]}>
              <PostItCardShell
                compact
                isDark={isDark}
                faceColor={addGroupFace}
                style={styles.addGroupTriggerOuter}
                contentStyle={styles.addGroupTrigger}>
                <View style={styles.addGroupTriggerMain}>
                  <ThemedText
                    style={[styles.addGroupTriggerLabel, { color: addGroupInk, flexShrink: 1 }]}
                    numberOfLines={2}>
                    {t('fixedRoutine.addGroup')}
                  </ThemedText>
                  <View
                    style={[
                      styles.addGroupPlusFace,
                      { backgroundColor: addGroupActionBg, borderColor: addGroupLine },
                    ]}
                    pointerEvents="none">
                    <IconSymbol name="plus" size={13} color={addGroupInk} />
                  </View>
                </View>
              </PostItCardShell>
            </Pressable>
          )
        ) : activeSection !== 'catalog' &&
          activeSection !== 'templates' &&
          (!hideLayoutModeHeader || isEmbedded) ? (
          <ThemedText style={[styles.sectionHint, { color: muted }]}>
            {sectionHint}
          </ThemedText>
        ) : null}
      </View>
      {!isEmbedded ? (
        <View
          style={[
            styles.cachedCatalogPane,
            activeSection !== 'catalog' && styles.cachedCatalogPaneHidden,
          ]}
          pointerEvents={activeSection === 'catalog' ? 'auto' : 'none'}
          accessibilityElementsHidden={activeSection !== 'catalog'}
          importantForAccessibility={activeSection === 'catalog' ? 'auto' : 'no-hide-descendants'}>
          <RoutineCatalogManageContent />
        </View>
      ) : null}
      {activeSection !== 'catalog' ? (
        <KeyboardAvoidingView
          style={styles.scrollKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={{
              paddingBottom: 24 + insets.bottom,
              paddingHorizontal: horizontalPad,
              paddingTop: 8,
            }}
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}>
            {activeSection === 'templates' ? (
              <RoutineTemplateListPanel
                ink={ink}
                muted={muted}
                line={line}
                cardBg={cardBg}
                isDark={isDark}
                onPressTemplate={openRoutineTemplateDetail}
              />
            ) : (
              <>
                {useSpineRoutineLayout ? (
                  <FixedRoutinePriorityWindowCard
                    priorityStart={priorityStart}
                    priorityEnd={priorityEnd}
                    planDateKey={priorityPlanDateKey}
                    planDateKeyEnd={priorityPlanDateKeyEnd}
                    isDark={isDark}
                    ink={ink}
                    muted={muted}
                    line={line}
                    cardBg={cardBg}
                    onPressSettings={() => setPriorityWindowSheetOpen(true)}
                  />
                ) : null}
                {useSectionsRoutineLayout ? (
                  <FixedRoutineMealSlotScheduleCard
                    schedule={mealSlotSchedule}
                    isDark={isDark}
                    ink={ink}
                    muted={muted}
                    line={line}
                    cardBg={cardBg}
                    onPressSettings={() => setMealSlotScheduleSheetOpen(true)}
                  />
                ) : null}
                <View style={styles.accordionList}>
                  {visibleSets.map((setItem) => (
                    <GroupAccordion
                      key={setItem.id}
                      setItem={setItem}
                      isPresetScheduleSet={isBuiltinPresetScheduleSet(setItem)}
                      mealSlotLayoutEnabled={useSectionsRoutineLayout}
                      spineLayoutEnabled={useSpineRoutineLayout}
                      priorityStart={priorityStart}
                      priorityEnd={priorityEnd}
                      baseDateKey={
                        priorityPlanDateKey <= priorityPlanDateKeyEnd
                          ? priorityPlanDateKey
                          : priorityPlanDateKeyEnd
                      }
                      isExpanded={expandedIds.has(setItem.id)}
                      isActiveForToday={isSetActiveForToday(setItem)}
                      applyBlocked={priorityWindowEndedForToday}
                      catalogByKey={catalogByKey}
                      isDark={isDark}
                      ink={ink}
                      muted={muted}
                      line={line}
                      actionBg={actionBg}
                      actionHoverBg={actionHoverBg}
                      shadow={shadow}
                      sectionBg={sectionBg}
                      isFocusStarted={isFocusStarted}
                      isCategoryInTodayPlan={isCategoryInTodayPlan}
                      isCategoryCompleted={isCategoryCompleted}
                      onToggleExpand={() => toggleExpanded(setItem.id)}
                      onToggleActiveForToday={() => {
                        toggleSetForToday(setItem.id, layoutMode);
                      }}
                      onApplyBlocked={handleApplyBlocked}
                      canDeleteSet
                      onDeleteSet={() => handleDeleteSet(setItem.id)}
                      onRenameSet={(nextName) => renameSet(setItem.id, nextName)}
                      onToggleItem={(categoryKey, enabled) => {
                        setCategoryEnabledInSet(setItem.id, categoryKey, enabled);
                      }}
                      onDeleteItem={(categoryKey, itemLabel) => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const isActiveInTodayList = isCategoryInTodayPlan(categoryKey);
                        Alert.alert(
                          t('fixedRoutine.deleteItemTitle', { label: itemLabel }),
                          t(
                            isActiveInTodayList
                              ? 'fixedRoutine.deleteActiveItemMessage'
                              : 'fixedRoutine.deleteItemMessage',
                          ),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('common.delete'),
                              style: 'destructive',
                              onPress: () => {
                                removeCategoryFromSet(setItem.id, categoryKey);
                                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              },
                            },
                          ],
                        );
                      }}
                      onOpenAddItem={() => openAddItemModal(setItem.id)}
                      onToggleItemMealSlot={(categoryKey, slot) =>
                        handleToggleItemMealSlot(setItem.id, categoryKey, slot)
                      }
                      onChangeItemSpineTime={(categoryKey, startMinutes, endMinutes, endsNextCalendarDay) => {
                        setCategorySpineScheduleInSet(
                          setItem.id,
                          categoryKey,
                          startMinutes,
                          endMinutes,
                          endsNextCalendarDay,
                        );
                        notifyFixedFlowApplyScheduleChanged();
                        void Haptics.selectionAsync();
                      }}
                      onEnsureVisibleAboveKeyboard={ensureVisibleAboveKeyboard}
                      isStartNotifyEnabled={isStartNotifyEnabledForCategory}
                      onToggleStartNotify={(categoryKey) => {
                        void handleToggleStartNotify(categoryKey);
                      }}
                      onOpenCategorySettings={openCategorySettings}
                      postItFaceColorId={
                        postItFaceByGroup[`my-routine:${setItem.id}`] ??
                        DEFAULT_POST_IT_FACE_COLOR_ID
                      }
                      onSelectPostItFaceColor={(colorId) =>
                        handleSelectPostItFaceColor(setItem.id, colorId)
                      }
                    />
                  ))}
                </View>

                {canManageCustomGroups && customSets.length === 0 ? (
                  <ThemedText style={[styles.sectionEmpty, { color: muted }]}>
                    {t('fixedRoutine.noCustomGroups')}
                  </ThemedText>
                ) : null}
                <RoutineAtmosphereFooterStrip
                  variant={embeddedCustomOnly ? 'myRoutines' : 'fixed'}
                  isDark={isDark}
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      <AddItemModal
        visible={addItemModalOpen}
        title={addItemModalTitle}
        sections={addableSectionsForModal}
        isDark={isDark}
        ink={ink}
        muted={muted}
        surface={cardBg}
        line={line}
        onClose={() => {
          setAddItemModalOpen(false);
          setAddItemSetId(null);
        }}
        onConfirm={(keys) => {
          if (!addItemSetId) return;
          keys.forEach((key) =>
            addCategoryToSet(addItemSetId, key),
          );
        }}
        onCreateCustom={() => {
          targetSetIdRef.current = addItemSetId;
          setCreateSheetOpen(true);
        }}
      />

      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onCreate={handleCreateCustomFlow}
        initialGroupKey={DEFAULT_CUSTOM_FLOW_GROUP_KEY}
        isDark={isDark}
        ink={ink}
        muted={muted}
        line={line}
        surface={cardBg}
      />

      <FixedRoutinePriorityWindowSheet
        visible={priorityWindowSheetOpen}
        priorityStart={priorityStart}
        priorityEnd={priorityEnd}
        isDark={isDark}
        onClose={() => setPriorityWindowSheetOpen(false)}
        onSave={(start, end) => {
          setPriorityStart(start);
          setPriorityEnd(end);
          syncOvernightPriorityPlanDates();
        }}
      />

      <DayMealSlotScheduleSheet
        visible={mealSlotScheduleSheetOpen}
        schedule={mealSlotSchedule}
        isDark={isDark}
        priorityStart={priorityStart}
        priorityEnd={priorityEnd}
        onClose={() => setMealSlotScheduleSheetOpen(false)}
        onSave={persistMealSlotSchedule}
      />

    </>
  );

  if (isEmbedded) {
    return (
      <View style={[styles.embeddedRoot, { backgroundColor: shellBg }]}>
        <RoutineTabAtmosphere variant={atmosphereVariant} isDark={isDark} />
        <Reanimated.View style={[styles.foreground, { opacity: contentOpacity }]}>
          {isFixedFlowHydrated ? pageBody : null}
        </Reanimated.View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: shellBg }]}>
      <RoutineTabAtmosphere variant={atmosphereVariant} isDark={isDark} />
      <Reanimated.View style={[styles.foreground, { opacity: contentOpacity }]}>
        {isFixedFlowHydrated ? pageBody : null}
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  embeddedRoot: {
    flex: 1,
    minHeight: 0,
  },
  foreground: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    paddingTop: CityPopSpacing.base,
    paddingBottom: CityPopSpacing.base,
    gap: 10,
    zIndex: 2,
  },
  stickyHeaderEmbedded: {
    paddingTop: CityPopSpacing.sm,
    paddingBottom: CityPopSpacing.base,
    gap: 10,
  },
  cachedCatalogPane: { flex: 1, backgroundColor: 'transparent' },
  cachedCatalogPaneHidden: { display: 'none' },
  scrollKeyboardRoot: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  sectionHint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  sectionEmpty: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 10,
  },
  accordionList: {
    gap: 12,
    marginBottom: 14,
  },
  accordionSection: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionSectionInner: {
    width: '100%',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  renameGroupRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renameGroupInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  renameGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  renameGroupCancel: {
    fontSize: 12,
    fontWeight: '500',
  },
  renameGroupSave: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 1,
  },
  renameGroupSaveLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  accordionHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  accordionTitleText: {
    flex: 1,
    minWidth: 0,
  },
  accordionTitlePress: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  rulePill: {
    width: 58,
    height: 32,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  rulePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
    lineHeight: 14,
  },
  headerApplyChip: {
    height: 28,
    paddingHorizontal: 9,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerApplyChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
    lineHeight: 14,
  },
  headerDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 0,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  groupAccordionPanel: {
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
  },
  accordionBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 4,
  },
  accordionRuleHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  accordionEmpty: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  addGroupCardOuter: {
    alignSelf: 'stretch',
    maxWidth: 320,
    marginBottom: 4,
  },
  addGroupCard: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  addGroupCaption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  addGroupInput: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 22,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  addGroupCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addGroupCancel: {
    fontSize: 13,
    fontWeight: '500',
  },
  addGroupSubmit: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addGroupSubmitLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  addGroupTriggerHit: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
  },
  addGroupTriggerOuter: {
    marginBottom: 4,
  },
  addGroupTrigger: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addGroupTriggerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addGroupTriggerLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  addGroupPlusFace: {
    width: 26,
    height: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardList: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  flowRowWrap: {
    borderBottomWidth: 1,
    paddingBottom: 0,
  },
  flowDetailPanel: {
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
  },
  flowDetailMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  flowSpineTimePanel: {
    marginTop: -2,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flowMealSlotPanel: {
    marginTop: -2,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  flowSlotBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: 3,
  },
  flowRowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flowRowTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  flowDetailChevronShell: {
    position: 'relative',
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  flowDetailChevronShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    transform: [{ translateX: BRUTAL_SHADOW_SM }, { translateY: BRUTAL_SHADOW_SM }],
  },
  flowDetailChevronFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  rowDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brutalBtnShell: {
    position: 'relative',
  },
  brutalBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  flowBrutalBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  flowIconBoxShell: {
    position: 'relative',
  },
  flowIconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  flowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  flowRowTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  flowRowTime: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  flowSwitch: {
    transform: [{ scaleX: 0.68 }, { scaleY: 0.72 }],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  addRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalSheet: { flex: 1 },
  modalScroll: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  modalSectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  modalPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  modalConfirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalConfirmLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalEmpty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 20,
  },
});
