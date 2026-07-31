import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  buildInitialCustomFlowDetailConfig,
  createCustomFlowCategoryId,
  filterDayPlanFlowBlocks,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isPriorityWindowEndedForToday,
  resolveBlockCategoryKey,
  resolveCategoryCatalogIcon,
  resolveCategoryKeyFromLabel,
  collectSpineTimelineCategoryKeys,
  notifyFixedFlowApplyScheduleChanged,
  resolveFixedFlowSpineSchedules,
  formatMinuteOfDayKo,
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
  syncRoutineStartNotifications,
} from '@features/day-plan-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  coerceDayPlanLayoutMode,
  type DayPlanLayoutMode as StorageDayPlanLayoutMode,
} from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import {
  appendCustomFlowCatalogEntry,
  BUILTIN_PRESET_SCHEDULE_SET_IDS,
  DAY_MEAL_SLOT_LABEL,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  isBuiltinPresetScheduleSet,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  resolveFixedFlowItemMealSlots,
  saveGoalDetailCategoryConfig,
  subscribeCustomFlowCatalog,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { getPickerCategoryLabel, isOvernightHhmmRange } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import {
  getFixedFlowPresetScheduleHint,
  getFixedFlowPresetScheduleLabel,
} from '../lib/fixedFlowPresetLabels';
import {
  buildAddablePriorityCatalogSections,
  buildPriorityCatalogRows,
  type AddablePriorityCatalogSection,
  type PriorityCatalogRow,
} from '../lib/priorityCatalog';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import type { DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { DayMealSlotScheduleSheet } from './DayMealSlotScheduleSheet';
import { FixedRoutineLayoutModeHeader } from './FixedRoutineLayoutModeHeader';
import { FixedRoutineListModeCard } from './FixedRoutineListModeCard';
import { FixedRoutineMealSlotScheduleCard } from './FixedRoutineMealSlotScheduleCard';
import { FixedRoutinePriorityWindowCard } from './FixedRoutinePriorityWindowCard';
import { FixedRoutinePriorityWindowSheet } from './FixedRoutinePriorityWindowSheet';
import { FixedRoutineSectionTabs, type FixedRoutineSection } from './FixedRoutineSectionTabs';
import {
  CatalogRowMealSlotChips,
  CatalogRowMealSlotSelectedIcons,
  mealSlotPickerBtnWidth,
} from './CatalogRowMealSlotChips';
import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import { RoutineCatalogManageContent } from './RoutineCatalogManageContent';
import { RoutineTemplateListPanel } from './RoutineTemplateListPanel';

function layoutModeHint(mode: DayPlanLayoutMode): string {
  if (mode === 'spine') {
    return '집중 구간과 루틴별 시간을 정한 뒤 적용을 켜면 타임라인 보기에 반영돼요.';
  }
  if (mode === 'sections') {
    return '항목마다 새벽·아침·점심·저녁·밤을 고른 뒤 적용을 켜면 시간대 보기에 반영돼요.';
  }
  return '항목마다 시작 시간을 정할 수 있어요. 적용을 켜면 목록 보기에 반영되고, 시작 알림도 그 시각에 울려요.';
}

function sectionHintText(
  section: 'scheduled' | 'custom' | FixedRoutineSection,
  layoutMode: DayPlanLayoutMode,
): string {
  if (section === 'templates') {
    return '항목을 눌러 방식별 화면 구성을 확인할 수 있어요.';
  }
  if (section === 'catalog') {
    return '루틴을 만들고 묶음으로 정리해요. 행을 누르면 상세 설정을 열 수 있어요.';
  }
  if (section === 'scheduled' || section === 'custom') {
    if (layoutMode === 'spine') {
      return '항목별 시간을 정한 뒤 적용을 켜면 타임라인 보기에 반영돼요.';
    }
    if (layoutMode === 'sections') {
      return '항목마다 시간대를 고른 뒤 적용을 켜면 시간대 보기에 반영돼요.';
    }
    return '항목마다 시작 시간을 정한 뒤 적용을 켜면 목록 보기에 반영돼요.';
  }
  return layoutModeHint(layoutMode);
}

const FLOW_MEAL_SLOT_PANEL_HEIGHT = 56;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FlowCardProps = {
  item: FixedFlowSetItem;
  catalog: PriorityCatalogRow | undefined;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  iconBoxBg: string;
  isFocusStarted: boolean;
  isInTodayPlan: boolean;
  isCompleted: boolean;
  mealSlots?: DayMealSlot[];
  showMealSlotPicker?: boolean;
  onToggleMealSlot?: (slot: DayMealSlot) => void;
  showSpineTimePicker?: boolean;
  spineStartMinutes?: number;
  spineEndMinutes?: number;
  spineTimeIsSuggested?: boolean;
  priorityStart?: string;
  priorityEnd?: string;
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
  iconBoxBg,
  isFocusStarted,
  isInTodayPlan,
  isCompleted,
  mealSlots = [],
  showMealSlotPicker,
  onToggleMealSlot,
  showSpineTimePicker,
  spineStartMinutes,
  spineEndMinutes,
  spineTimeIsSuggested,
  priorityStart,
  priorityEnd,
  baseDateKey,
  onChangeSpineTime,
  onEnsureVisibleAboveKeyboard,
  startNotifyEnabled = false,
  onToggleStartNotify,
  onToggleEnabled,
  onDelete,
}: FlowCardProps) {
  const [mealSlotExpanded, setMealSlotExpanded] = useState(false);
  const [spineTimeExpanded, setSpineTimeExpanded] = useState(false);
  const spineTimePanelRef = useRef<View>(null);
  const expandProgress = useSharedValue(0);
  const spineExpandProgress = useSharedValue(0);
  const label = getPickerCategoryLabel(item.categoryKey);
  const enabled = item.enabled !== false;
  const categoryKey = item.categoryKey;
  const icon = resolveCategoryCatalogIcon(categoryKey);
  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';
  const shouldPulse = Boolean(isInTodayPlan && isFocusStarted && enabled && !isCompleted);
  const pulse = useRef(new Animated.Value(1)).current;

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
  const iconColor = shouldPulse
    ? categoryIconColor
    : isInTodayPlan && enabled
      ? isCompleted
        ? muted
        : categoryIconColor
      : muted;
  const labelColor =
    isInTodayPlan && enabled ? (isCompleted ? muted : ink) : muted;

  const settingsBorder = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)';
  const settingsBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
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
      ? `${formatMinuteOfDayKo(spineStartMinutes)}~${formatMinuteOfDayKo(spineEndMinutes)}`
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
      Alert.alert('시작 알림', '먼저 루틴 시작 시간을 정해 주세요.');
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
      <View style={styles.flowRowMain}>
        <View style={[styles.flowIconBox, { backgroundColor: iconBoxBg }]}>
          <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
            <IconSymbol name={icon as any} size={15} color={iconColor} />
          </Animated.View>
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
              {spineTimeIsSuggested ? `추천 ${spineTimeLabel}` : spineTimeLabel}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {showMealSlotPicker && onToggleMealSlot ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: mealSlotIconHighlighted,
            expanded: mealSlotExpanded,
          }}
          accessibilityLabel={
            mealSlots.length > 0
              ? `${label} 시간대 ${mealSlots.map((slot) => DAY_MEAL_SLOT_LABEL[slot]).join(', ')}`
              : `${label} 시간대 선택`
          }
          hitSlop={10}
          onPress={handleToggleMealSlotExpand}
          style={({ pressed }) => [
            styles.flowSlotBtn,
            {
              width: mealSlotPickerBtnWidth(mealSlots),
              borderColor: mealSlotIconHighlighted ? ink : settingsBorder,
              backgroundColor: mealSlotIconHighlighted
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(0,0,0,0.06)'
                : settingsBg,
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <Reanimated.View style={mealSlotIconAnimatedStyle}>
            <CatalogRowMealSlotSelectedIcons
              selectedSlots={mealSlots}
              color={mealSlotIconHighlighted ? ink : muted}
              mutedColor={muted}
              size={14}
              compactSize={9}
            />
          </Reanimated.View>
        </Pressable>
      ) : null}
      {showSpineTimePicker && onChangeSpineTime ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: spineTimeIconHighlighted,
            expanded: spineTimeExpanded,
          }}
          accessibilityLabel={
            spineStartMinutes != null && spineEndMinutes != null
              ? `${label} 시간 ${formatMinuteOfDayKo(spineStartMinutes)}~${formatMinuteOfDayKo(spineEndMinutes)}`
              : `${label} 시간 선택`
          }
          hitSlop={10}
          onPress={handleToggleSpineTimeExpand}
          style={({ pressed }) => [
            styles.flowSlotBtn,
            {
              borderColor: spineTimeIconHighlighted ? ink : settingsBorder,
              backgroundColor: spineTimeIconHighlighted
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(0,0,0,0.06)'
                : settingsBg,
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <Reanimated.View style={spineTimeIconAnimatedStyle}>
            <IconSymbol
              name="clock.fill"
              size={14}
              color={spineTimeIconHighlighted ? ink : muted}
            />
          </Reanimated.View>
        </Pressable>
      ) : null}
      {showStartNotify && onToggleStartNotify ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: startNotifyEnabled, disabled: !canStartNotify }}
          accessibilityLabel={`${label} 시작 알림 ${startNotifyEnabled ? '켜짐' : '꺼짐'}`}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleToggleStartNotify();
          }}
          style={({ pressed }) => [
            styles.flowSlotBtn,
            {
              borderColor: startNotifyEnabled ? ink : settingsBorder,
              backgroundColor: startNotifyEnabled
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(0,0,0,0.06)'
                : settingsBg,
              opacity: pressed ? 0.72 : canStartNotify ? 1 : 0.45,
            },
          ]}>
          <IconSymbol
            name={startNotifyEnabled ? 'bell.fill' : 'bell'}
            size={14}
            color={startNotifyEnabled ? ink : muted}
          />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 루틴 삭제`}
        onPress={onDelete}
        style={({ pressed }) => [
          styles.rowDeleteBtn,
          { backgroundColor: iconBoxBg, borderColor: line },
          pressed && { opacity: 0.72 },
        ]}>
        <IconSymbol name="trash" size={14} color={muted} />
      </Pressable>
      <Switch
        accessibilityLabel={`${label} ${enabled ? '켜짐' : '꺼짐'}`}
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
      {showSpineTimePicker && onChangeSpineTime && priorityStart && priorityEnd && spineTimeExpanded ? (
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
            endsNextCalendarDay={
              spineStartMinutes != null &&
              spineEndMinutes != null &&
              spineEndMinutes < spineStartMinutes
            }
            baseDateKey={baseDateKey}
            ink={ink}
            muted={muted}
            line={line}
            isDark={isDark}
            priorityStart={priorityStart}
            priorityEnd={priorityEnd}
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
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 20, gap: 2 }}
          keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새로운 루틴 만들기"
            onPress={() => {
              onClose();
              onCreateCustom();
            }}
            style={({ pressed }) => [styles.modalCreateRow, pressed && { opacity: 0.72 }]}>
            <IconSymbol name="plus.circle.fill" size={20} color={ink} />
            <ThemedText style={[styles.modalRowLabel, { color: ink }]}>새로운 루틴 만들기</ThemedText>
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
                    accessibilityLabel={`${cat.label} ${selected ? '선택됨' : '선택'}`}
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
              추가할 수 있는 항목이 없어요. 위에서 새로운 루틴을 만들어 보세요.
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
            accessibilityLabel={selectedCount > 0 ? `${selectedCount}개 항목 추가` : '항목을 선택해 주세요'}
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
              {selectedCount > 0 ? `${selectedCount}개 추가` : '항목을 선택해 주세요'}
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
  cardBg: string;
  iconBoxBg: string;
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
  ink,
  muted,
  line,
  cardBg,
  iconBoxBg,
  sectionBg,
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
}: GroupAccordionProps) {
  const enabledCount = setItem.items.filter((x) => x.enabled !== false).length;
  const totalCount = setItem.items.length;
  const canRenameSet = !isPresetScheduleSet && Boolean(onRenameSet);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(setItem.name);

  useEffect(() => {
    if (!isEditingName) {
      setNameDraft(setItem.name);
    }
  }, [isEditingName, setItem.name]);

  const commitRename = useCallback(() => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(setItem.name);
      setIsEditingName(false);
      return;
    }
    if (trimmed !== setItem.name) {
      onRenameSet?.(trimmed);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditingName(false);
  }, [nameDraft, onRenameSet, setItem.name]);

  const cancelRename = useCallback(() => {
    setNameDraft(setItem.name);
    setIsEditingName(false);
  }, [setItem.name]);

  const startRename = useCallback(() => {
    if (!canRenameSet) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameDraft(setItem.name);
    setIsEditingName(true);
  }, [canRenameSet, setItem.name]);

  const useSpineLayout = spineLayoutEnabled;
  /** 목록 모드도 루틴별 시작·종료 시각을 직접 둘 수 있음(시작 알림·타임라인 공유) */
  const useBagStartTimePicker = !spineLayoutEnabled && !mealSlotLayoutEnabled;
  const useStartTimePicker = useSpineLayout || useBagStartTimePicker;
  const useMealSlotFlatPickerLayout = mealSlotLayoutEnabled && !spineLayoutEnabled;
  const spineSchedules = useMemo(() => {
    if (!useStartTimePicker) return new Map();
    if (useBagStartTimePicker) {
      // 목록 모드: 저장된 시각만 표시(추천 시각으로 알림 가능처럼 보이지 않게)
      const out = new Map<
        string,
        { startMinutes: number; endMinutes: number; endsNextCalendarDay?: boolean; isSuggested: boolean }
      >();
      for (const item of setItem.items) {
        if (item.enabled === false) continue;
        const start = item.spineStartMinutes;
        const end = item.spineEndMinutes;
        if (typeof start !== 'number' || typeof end !== 'number') continue;
        const endsNext = item.spineEndsNextCalendarDay === true;
        if (endsNext ? end >= start : end <= start) continue;
        out.set(item.categoryKey, {
          startMinutes: start,
          endMinutes: end,
          endsNextCalendarDay: endsNext || undefined,
          isSuggested: false,
        });
      }
      return out;
    }
    return resolveFixedFlowSpineSchedules({
      items: setItem.items,
      priorityStart,
      priorityEnd,
    });
  }, [
    priorityEnd,
    priorityStart,
    setItem.items,
    useBagStartTimePicker,
    useStartTimePicker,
  ]);
  
  const applyChipBlocked = applyBlocked && !isActiveForToday;
  const disableApplyToggle = applyChipBlocked;
  const applyLabel = isActiveForToday ? '적용 중' : '적용하기';
  const applyA11yLabel = isActiveForToday
    ? '적용 해제'
    : applyChipBlocked
      ? '집중 시간이 끝나 적용하기를 할 수 없음'
      : '적용하기';
  const ruleLabel = isPresetScheduleSet ? getFixedFlowPresetScheduleLabel(setItem.applyRule) : null;
  const scheduleHint = isPresetScheduleSet ? getFixedFlowPresetScheduleHint(setItem.applyRule) : null;

  return (
    <View style={[styles.accordionSection, { backgroundColor: sectionBg, borderColor: line }]}>
      <View style={styles.accordionHeader}>
        {canRenameSet && isEditingName ? (
          <View style={styles.renameGroupRow}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={commitRename}
              placeholder="그룹 이름"
              placeholderTextColor={muted}
              style={[styles.renameGroupInput, { color: ink }]}
              accessibilityLabel="그룹 이름 수정"
            />
            <View style={styles.renameGroupActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이름 수정 취소"
                onPress={cancelRename}
                hitSlop={6}>
                <ThemedText style={[styles.renameGroupCancel, { color: muted }]}>취소</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 이름 저장"
                onPress={commitRename}
                style={[styles.renameGroupSave, { backgroundColor: ink, borderColor: ink }]}>
                <ThemedText style={[styles.renameGroupSaveLabel, { color: isDark ? '#09090b' : '#fff' }]}>
                  저장
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
              accessibilityLabel={`${setItem.name} 이름 수정`}
              accessibilityHint="탭하면 그룹 이름을 바꿀 수 있어요"
              onPress={startRename}
              style={({ pressed }) => [
                styles.accordionTitlePress,
                pressed && { opacity: 0.72 },
              ]}>
              <ThemedText
                style={[styles.accordionTitle, styles.accordionTitleText, { color: ink }]}
                numberOfLines={1}>
                {setItem.name}
              </ThemedText>
              <IconSymbol name="pencil" size={11} color={muted} />
            </Pressable>
          ) : (
            <ThemedText
              style={[styles.accordionTitle, styles.accordionTitleText, { color: ink }]}
              numberOfLines={1}>
              {setItem.name}
            </ThemedText>
          )}
          {isPresetScheduleSet && ruleLabel ? (
            <View
              accessibilityRole="text"
              accessibilityLabel={ruleLabel}
              style={[
                styles.rulePill,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
              ]}>
              <ThemedText style={[styles.rulePillText, { color: muted }]}>{ruleLabel}</ThemedText>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: disableApplyToggle }}
          accessibilityLabel={applyA11yLabel}
          onPress={() => {
            if (disableApplyToggle) {
              if (applyChipBlocked) onApplyBlocked();
              return;
            }
            onToggleActiveForToday();
          }}
          style={({ pressed }) => [
            styles.headerApplyChip,
            {
              borderColor: isActiveForToday ? ink : line,
              backgroundColor: isActiveForToday
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(0,0,0,0.08)'
                : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
              opacity: disableApplyToggle ? 0.42 : pressed ? 0.88 : 1,
            },
          ]}>
          <ThemedText
            style={[
              styles.headerApplyChipLabel,
              { color: isActiveForToday ? ink : muted },
            ]}
            numberOfLines={1}>
            {applyLabel}
          </ThemedText>
        </Pressable>
        {!isPresetScheduleSet && canDeleteSet ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${setItem.name} 그룹 삭제`}
            onPress={onDeleteSet}
            style={({ pressed }) => [
              styles.headerDeleteBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              pressed && { opacity: 0.72 },
            ]}>
            <IconSymbol name="trash" size={13} color={muted} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${setItem.name} ${isExpanded ? '접기' : '펼치기'}`}
          onPress={onToggleExpand}
          style={({ pressed }) => [styles.accordionHeaderRight, pressed && { opacity: 0.85 }]}>
          <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <ThemedText style={[styles.countPillText, { color: muted }]}>
              {enabledCount}/{totalCount}
            </ThemedText>
          </View>
          <IconSymbol name={isExpanded ? 'chevron.up' : 'chevron.down'} size={12} color={muted} />
        </Pressable>
          </>
        )}
      </View>

      {isExpanded ? (
        <View style={[styles.accordionBody, { borderTopColor: line }]}>
          {scheduleHint ? (
            <ThemedText style={[styles.accordionRuleHint, { color: muted }]}>{scheduleHint}</ThemedText>
          ) : null}
          {(() => {
            if (totalCount === 0) {
              return (
                <ThemedText style={[styles.accordionEmpty, { color: muted }]}>
                  아직 항목이 없어요. 아래에서 추가해 주세요.
                </ThemedText>
              );
            }
            return null;
          })()}
              <View style={[styles.cardList, { backgroundColor: cardBg, borderColor: line }]}>
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
                      iconBoxBg={iconBoxBg}
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
                      spineTimeIsSuggested={schedule?.isSuggested === true}
                      priorityStart={priorityStart}
                      priorityEnd={priorityEnd}
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
                      onToggleEnabled={(enabled) => onToggleItem(item.categoryKey, enabled)}
                      onDelete={() => onDeleteItem(item.categoryKey, itemLabel)}
                    />
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="새 항목 추가"
                  onPress={onOpenAddItem}
                  style={({ pressed }) => [
                    styles.addRow,
                    { opacity: pressed ? 0.88 : 1 },
                  ]}>
                  <IconSymbol name="plus" size={14} color={muted} />
                  <ThemedText style={[styles.addRowLabel, { color: muted }]}>새 항목 추가</ThemedText>
                </Pressable>
              </View>
        </View>
      ) : null}
    </View>
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
  const horizontalPad = isEmbedded ? 20 : 16;

  const [catalogTick, setCatalogTick] = useState(0);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [section, setSection] = useState<FixedRoutineSection>('catalog');
  const [internalLayoutMode, setInternalLayoutMode] = useState<DayPlanLayoutMode>('bag');
  const layoutMode = controlledLayoutMode ?? internalLayoutMode;
  
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
  
  const layoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const hydrateLayoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.hydrate);
  const visibleLayoutModes = useMemo(
    () =>
      (['bag', 'sections', 'spine'] as const).filter(
        (mode) => layoutModeVisibility[mode as StorageDayPlanLayoutMode],
      ),
    [layoutModeVisibility],
  );
  const canManageCustomGroups = embeddedCustomOnly || false;
  const useSectionsRoutineLayout = layoutMode === 'sections';
  const useSpineRoutineLayout = layoutMode === 'spine';

  const {
    sets,
    activeSetIds,
    activeSetIdsByLayoutMode,
    hydrate,
    reloadFromStorage,
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
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      sets: s.sets,
      activeSetIds: s.activeSetIds,
      activeSetIdsByLayoutMode: s.activeSetIdsByLayoutMode,
      hydrate: s.hydrate,
      reloadFromStorage: s.reloadFromStorage,
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
    bumpCategoryLabelEpoch,
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
      bumpCategoryLabelEpoch: s.bumpCategoryLabelEpoch,
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
      Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
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
      if (useSpineRoutineLayout) {
        return collectSpineTimelineCategoryKeys(planBlocks).includes(categoryKey);
      }
      if (useSectionsRoutineLayout) {
        return prioritySectionsCategoryOrder.includes(categoryKey);
      }
      return priorityCategoryOrder.includes(categoryKey);
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
      void syncRoutineStartNotifications();
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
    Alert.alert(
      '집중 시간이 끝났어요',
      '오늘 집중 구간이 종료되어 지금은 적용할 수 없어요. 오늘 탭에서 집중 시간을 변경한 뒤 다시 적용해 주세요.',
    );
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
    if (embeddedCustomOnly) return customSets;
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

  const handleSelectLayoutMode = useCallback(
    (mode: DayPlanLayoutMode) => {
      const next = coerceDayPlanLayoutMode(mode, layoutModeVisibility);
      setFixedRoutineApplyLayoutMode(next);
      if (controlledLayoutMode === undefined) {
        setInternalLayoutMode(next);
      }
      notifyFixedFlowApplyScheduleChanged();
    },
    [controlledLayoutMode, layoutModeVisibility, setFixedRoutineApplyLayoutMode],
  );

  const reloadCatalog = useCallback(() => {
    setCatalogTick((n) => n + 1);
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
  }, []);

  useEffect(() => {
    hydrate();
    reloadFromStorage();
    reloadCatalog();
  }, [hydrate, reloadCatalog, reloadFromStorage]);

  useFocusEffect(
    useCallback(() => {
      hydrateLayoutModeVisibility();
    }, [hydrateLayoutModeVisibility]),
  );

  useFocusEffect(
    useCallback(() => {
      reloadCatalog();
      bumpCategoryLabelEpoch();
    }, [bumpCategoryLabelEpoch, reloadCatalog]),
  );

  useEffect(() => subscribeCustomFlowCatalog(reloadCatalog), [reloadCatalog]);

  useEffect(() => {
    if (visibleSets.length === 0) return;
    setExpandedIds(new Set(visibleSets.map((setItem) => setItem.id)));
  }, [section, visibleSets]);

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        `"${target.name}" 삭제`,
        '이 그룹을 삭제할까요? 안에 있는 항목도 함께 사라져요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
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

  const addItemModalTitle = '항목 추가';

  const shellBg = c.bg;
  const cardBg = c.containerLowest;
  const iconBoxBg = c.containerLow;
  const sectionBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const ink = c.onSurface;
  const muted = c.onVariant;
  const line = c.catBorderIdle;
  const dashedBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
  const activeSetIdsForLayout =
    activeSetIdsByLayoutMode?.[layoutMode] ?? activeSetIds ?? [];
  const isSetActiveForToday = useCallback(
    (setItem: FixedFlowSet) => activeSetIdsForLayout.includes(setItem.id),
    [activeSetIdsForLayout],
  );
  const activeSection = embeddedPresetOnly
    ? ('scheduled' as const)
    : embeddedCustomOnly
      ? ('custom' as const)
      : section;
  const sectionHint = sectionHintText(activeSection, layoutMode);

  const openRoutineTemplateDetail = useCallback(
    (templateKey: CustomFlowTemplateKey) => {
      router.push({
        pathname: '/routine-template-detail',
        params: { templateKey },
      });
    },
    [router],
  );

  const pageBody = (
    <>
      <View
        style={[
          styles.stickyHeader,
          isEmbedded && hideLayoutModeHeader && styles.stickyHeaderEmbedded,
          { paddingHorizontal: horizontalPad, backgroundColor: shellBg },
        ]}>
        {!isEmbedded ? (
          <FixedRoutineSectionTabs
            section={section}
            onSelectSection={setSection}
            c={c}
            isDark={isDark}
          />
        ) : null}
        {activeSection !== 'templates' && activeSection !== 'catalog' && !hideLayoutModeHeader ? (
          <FixedRoutineLayoutModeHeader
            layoutMode={layoutMode}
            onSelectLayoutMode={handleSelectLayoutMode}
            visibleLayoutModes={visibleLayoutModes}
            c={c}
            isDark={isDark}
          />
        ) : null}
        {!hideLayoutModeHeader || isEmbedded || activeSection === 'templates' ? (
          activeSection !== 'catalog' ? (
            <ThemedText style={[styles.sectionHint, { color: muted }]}>
              {sectionHint}
            </ThemedText>
          ) : null
        ) : null}
      </View>
      {activeSection === 'catalog' ? (
        <RoutineCatalogManageContent />
      ) : (
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
            {!useSpineRoutineLayout && !useSectionsRoutineLayout ? (
              <FixedRoutineListModeCard
                ink={ink}
                muted={muted}
                line={line}
                cardBg={cardBg}
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
                  cardBg={cardBg}
                  iconBoxBg={iconBoxBg}
                  sectionBg={sectionBg}
                  isFocusStarted={isFocusStarted}
                  isCategoryInTodayPlan={isCategoryInTodayPlan}
                  isCategoryCompleted={isCategoryCompleted}
                  onToggleExpand={() => toggleExpanded(setItem.id)}
                  onToggleActiveForToday={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    Alert.alert(
                      `"${itemLabel}" 삭제`,
                      '이 항목을 그룹에서 삭제할까요?',
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
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
                    void syncRoutineStartNotifications();
                    void Haptics.selectionAsync();
                  }}
                  onEnsureVisibleAboveKeyboard={ensureVisibleAboveKeyboard}
                  isStartNotifyEnabled={isStartNotifyEnabledForCategory}
                  onToggleStartNotify={(categoryKey) => {
                    void handleToggleStartNotify(categoryKey);
                  }}
                />
              ))}
            </View>

            {canManageCustomGroups && visibleSets.length === 0 ? (
              <ThemedText style={[styles.sectionEmpty, { color: muted }]}>
                아직 나만의 루틴 그룹이 없어요. 아래에서 그룹을 추가해 보세요.
              </ThemedText>
            ) : null}

            {canManageCustomGroups && (isAddingGroup ? (
              <View style={[styles.addGroupCard, { borderColor: dashedBorder, backgroundColor: iconBoxBg }]}>
                <TextInput
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="새 그룹 이름"
                  placeholderTextColor={muted}
                  autoFocus
                  style={[styles.addGroupInput, { color: ink }]}
                  returnKeyType="done"
                  onSubmitEditing={submitNewGroup}
                />
                <View style={styles.addGroupActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="취소"
                    onPress={() => {
                      setIsAddingGroup(false);
                      setNewGroupName('');
                    }}>
                    <ThemedText style={[styles.addGroupCancel, { color: muted }]}>취소</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="그룹 추가"
                    onPress={submitNewGroup}
                    style={[styles.addGroupSubmit, { backgroundColor: ink }]}>
                    <ThemedText style={[styles.addGroupSubmitLabel, { color: isDark ? '#09090b' : '#fff' }]}>
                      추가
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 추가"
                onPress={() => setIsAddingGroup(true)}
                style={({ pressed }) => [
                  styles.addGroupTrigger,
                  { borderColor: dashedBorder, opacity: pressed ? 0.88 : 1 },
                ]}>
                <IconSymbol name="plus" size={18} color={muted} />
                <ThemedText style={[styles.addGroupTriggerLabel, { color: muted }]}>그룹 추가</ThemedText>
                <ThemedText style={[styles.addGroupHint, { color: muted }]}>
                  이름을 눌러 바꾸고, 헤더 휴지통으로 그룹을 삭제할 수 있어요
                </ThemedText>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      )}

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
    return <View style={[styles.embeddedRoot, { backgroundColor: shellBg }]}>{pageBody}</View>;
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      {pageBody}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  embeddedRoot: {
    flex: 1,
    minHeight: 0,
  },
  stickyHeader: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    zIndex: 2,
  },
  stickyHeaderEmbedded: {
    paddingTop: 0,
    paddingBottom: 6,
    gap: 6,
  },
  scrollKeyboardRoot: { flex: 1 },
  scroll: { flex: 1 },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  sectionEmpty: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 10,
  },
  accordionList: {
    gap: 6,
    marginBottom: 12,
  },
  accordionSection: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.28,
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
    fontWeight: '600',
  },
  renameGroupSave: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 2,
  },
  renameGroupSaveLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  accordionHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontSize: 14,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    flexShrink: 0,
  },
  rulePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerApplyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
    flexShrink: 0,
  },
  headerApplyChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  headerDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    paddingLeft: 2,
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
  accordionBody: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  accordionRuleHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  accordionEmpty: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  addGroupTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  addGroupTriggerLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  addGroupHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  addGroupCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 0,
    padding: 12,
    gap: 10,
  },
  addGroupInput: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
  },
  addGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  addGroupCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addGroupSubmit: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  addGroupSubmitLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardList: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  flowRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  rowDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowRowTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  flowRowTime: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  flowSwitch: {
    transform: [{ scaleX: 0.72 }, { scaleY: 0.78 }],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 36,
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
