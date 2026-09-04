import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  createCustomFlowCategoryId,
  deleteCustomFlowCategory,
  dismissCatalogGroupWithItemReassign,
  buildInitialCustomFlowDetailConfig,
  type CustomFlowTemplateKey,
  isCustomFlowCategoryKey,
  isPriorityWindowEndedForToday,
  isSystemCatalogGroupKey,
  notifyFixedFlowApplyScheduleChanged,
  resolveCategoryCatalogIcon,
  getLocalMinutesOfDayNow,
  getLocalDateKey,
  useDayPlanDraftStore,
  useDayPlanStore,
  useDayPlanLayoutModeVisibilityStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import {
  appendCustomFlowCatalogEntry,
  appendRoutineCatalogSelectionKeys,
  createCustomCatalogGroup,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  hideStandardCatalogKey,
  isCustomCatalogGroupKey,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  loadRoutineCatalogSelectionKeys,
  resolveCatalogItemGroupKey,
  saveGoalDetailCategoryConfig,
  saveRoutineCatalogSelectionKeys,
  updateCatalogItemGroup,
  updateCustomCatalogGroup,
  updateSystemCatalogGroupMeta,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
  type DayMealSlot,
} from '@shared/lib/storage';
import { coerceDayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
} from '../lib/dayPlanEditorShared';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import {
  catalogLayoutModeActiveLabel,
  catalogLayoutModeLead,
  findSpineBlockIdForCategory,
  resolveCatalogLayoutMode,
  resolveCatalogSelectedKeys,
  resolveCatalogSpineScheduleForKey,
  resolveCatalogTargetMealSlot,
  toggleCatalogItemForLayoutMode,
} from '../lib/priorityCatalogLayoutMode';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import { CreateCatalogEntryChoiceSheet } from './CreateCatalogEntryChoiceSheet';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { EditCatalogGroupSheet } from './EditCatalogGroupSheet';
import { MoveCustomFlowGroupSheet } from './MoveCustomFlowGroupSheet';
import { PriorityCatalogPanel } from './PriorityCatalogPanel';

function resolveCatalogGroupKeyForPersist(raw: string): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  if (isSystemCatalogGroupKey(t)) return t;
  if (listCustomCatalogGroups().some((g) => g.key === t)) return t;
  if (isCustomCatalogGroupKey(t)) return t;
  return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
}

function bookColors(c: DayPlanPalette, isDark: boolean) {
  if (isDark) {
    return {
      cover: c.containerLow,
      ink: c.onSurface,
      inkMuted: c.onVariant,
    };
  }
  return {
    cover: c.containerLow,
    ink: c.onSurface,
    inkMuted: c.onVariant,
  };
}

type Props = {
  controlledLayoutMode?: DayPlanLayoutMode;
  showLayoutModeTabs?: boolean;
};

export function PriorityCatalogContent({
  controlledLayoutMode,
  showLayoutModeTabs = true,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);
  const bc = bookColors(c, isDark);

  const editorial = useMemo(() => {
    if (isDark) {
      return {
        ink: bc.ink,
        muted: bc.inkMuted,
        line: 'rgba(255,255,255,0.2)',
      };
    }
    return {
      ink: bc.ink,
      muted: bc.inkMuted,
      line: c.catBorderIdle,
    };
  }, [isDark, bc.ink, bc.inkMuted, c.catBorderIdle]);

  const animateListMutation = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, []);

  const {
    priorityCategoryOrder,
    setPriorityCategoryOrder,
    prioritySectionsCategoryOrder,
    setPrioritySectionsCategoryOrder,
    priorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
    appendPrioritySectionsCategoryKeys,
    appendPrioritySectionsWithMealSlot,
    addPrioritySectionMealSlot,
    setPrioritySectionsMealSlots,
    prioritySectionsMealSlots,
    priorityMealSlotOverrides,
    setPriorityMealSlotOverride,
    isFocusStarted,
    planMode,
    priorityStart,
    priorityEnd,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    bumpCategoryLabelEpoch,
    categoryLabelEpoch,
    filterCompletedFocusKeysToPriorityOrder,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityCategoryOrder: s.priorityCategoryOrder,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      prioritySectionsCategoryOrder: s.prioritySectionsCategoryOrder,
      setPrioritySectionsCategoryOrder: s.setPrioritySectionsCategoryOrder,
      priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
      prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
      setPlanMode: s.setPlanMode,
      setPriorityMealSlotLayoutEnabled: s.setPriorityMealSlotLayoutEnabled,
      setPrioritySpineLayoutEnabled: s.setPrioritySpineLayoutEnabled,
      appendPrioritySectionsCategoryKeys: s.appendPrioritySectionsCategoryKeys,
      appendPrioritySectionsWithMealSlot: s.appendPrioritySectionsWithMealSlot,
      addPrioritySectionMealSlot: s.addPrioritySectionMealSlot,
      setPrioritySectionsMealSlots: s.setPrioritySectionsMealSlots,
      prioritySectionsMealSlots: s.prioritySectionsMealSlots,
      priorityMealSlotOverrides: s.priorityMealSlotOverrides,
      setPriorityMealSlotOverride: s.setPriorityMealSlotOverride,
      isFocusStarted: s.isFocusStarted,
      planMode: s.planMode,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      bumpCategoryLabelEpoch: s.bumpCategoryLabelEpoch,
      categoryLabelEpoch: s.categoryLabelEpoch,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
    })),
  );

  const planBlocks = useDayPlanStore((s) => s.blocks);
  const addPlanBlock = useDayPlanStore((s) => s.addBlock);
  const removePlanBlock = useDayPlanStore((s) => s.removeBlock);
  const updatePlanBlock = useDayPlanStore((s) => s.updateBlock);

  const { schedule: mealSlotSchedule } = useDayMealSlotSchedule();
  const [catalogTargetMealSlot, setCatalogTargetMealSlot] = useState<DayMealSlot>(() =>
    resolveCatalogTargetMealSlot({
      schedule: mealSlotSchedule,
      nowMinutes: getLocalMinutesOfDayNow(),
    }),
  );

  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const coerceLayoutMode = useDayPlanLayoutModeVisibilityStore((s) => s.coerceMode);
  const hydrateLayoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.hydrate);

  const catalogLayoutMode = useMemo(
    () =>
      resolveCatalogLayoutMode({
        priorityMealSlotLayoutEnabled,
        prioritySpineLayoutEnabled,
      }),
    [priorityMealSlotLayoutEnabled, prioritySpineLayoutEnabled],
  );

  const effectiveCatalogLayoutMode = useMemo(
    () => controlledLayoutMode ?? coerceDayPlanLayoutMode(catalogLayoutMode, visibility),
    [catalogLayoutMode, controlledLayoutMode, visibility],
  );

  useEffect(() => {
    if (effectiveCatalogLayoutMode !== 'sections') return;
    setCatalogTargetMealSlot(
      resolveCatalogTargetMealSlot({
        schedule: mealSlotSchedule,
        nowMinutes: getLocalMinutesOfDayNow(),
      }),
    );
  }, [effectiveCatalogLayoutMode, mealSlotSchedule]);

  const visibleLayoutModes = useMemo(
    () => (['bag', 'sections', 'spine'] as const).filter((mode) => visibility[mode]),
    [visibility],
  );

  useEffect(() => {
    hydrateLayoutModeVisibility();
  }, [hydrateLayoutModeVisibility]);

  useEffect(() => {
    if (controlledLayoutMode !== undefined) return;
    const eff = coerceLayoutMode(catalogLayoutMode);
    if (eff === catalogLayoutMode) return;
    setPlanMode('priority');
    setPriorityMealSlotLayoutEnabled(eff === 'sections');
    setPrioritySpineLayoutEnabled(eff === 'spine');
  }, [
    catalogLayoutMode,
    controlledLayoutMode,
    coerceLayoutMode,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
  ]);

  const onSelectCatalogLayoutMode = useCallback(
    (mode: DayPlanLayoutMode) => {
      const nextMode = coerceLayoutMode(mode);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPlanMode('priority');
      setPriorityMealSlotLayoutEnabled(nextMode === 'sections');
      setPrioritySpineLayoutEnabled(nextMode === 'spine');
    },
    [coerceLayoutMode, setPlanMode, setPriorityMealSlotLayoutEnabled, setPrioritySpineLayoutEnabled],
  );

  const selectedCategoryKeys = useMemo(
    () =>
      resolveCatalogSelectedKeys({
        layoutMode: effectiveCatalogLayoutMode,
        priorityCategoryOrder,
        prioritySectionsCategoryOrder,
        planBlocks,
      }),
    [
      effectiveCatalogLayoutMode,
      planBlocks,
      priorityCategoryOrder,
      prioritySectionsCategoryOrder,
    ],
  );

  const catalogToggleActions = useMemo(
    () => ({
      setPriorityCategoryOrder,
      saveRoutineCatalogSelectionKeys,
      appendPrioritySectionsCategoryKeys,
      appendPrioritySectionsWithMealSlot,
      setPrioritySectionsCategoryOrder,
      addPrioritySectionMealSlot,
      addPlanBlock,
      removePlanBlock,
      getPriorityCategoryOrder: () => useDayPlanDraftStore.getState().priorityCategoryOrder,
      getPrioritySectionsCategoryOrder: () =>
        useDayPlanDraftStore.getState().prioritySectionsCategoryOrder,
    }),
    [
      addPlanBlock,
      addPrioritySectionMealSlot,
      appendPrioritySectionsCategoryKeys,
      appendPrioritySectionsWithMealSlot,
      removePlanBlock,
      setPriorityCategoryOrder,
      setPrioritySectionsCategoryOrder,
    ],
  );

  const resolveCatalogSpineSchedule = useCallback(
    (categoryKey: string) => {
      const schedule = resolveCatalogSpineScheduleForKey({
        categoryKey,
        planBlocks,
        priorityStart,
        priorityEnd,
        nowMinutes: getLocalMinutesOfDayNow(),
      });
      return {
        startMinutes: schedule.startMinutes,
        endMinutes: schedule.endMinutes,
      };
    },
    [planBlocks, priorityEnd, priorityStart],
  );

  const onChangeCatalogSpineTime = useCallback(
    (key: string, startMinutes: number, endMinutes: number) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      if (effectiveCatalogLayoutMode !== 'spine') return;

      if (isFocusStarted && selectedCategoryKeys.includes(trimmed)) {
        void Haptics.selectionAsync();
        return;
      }

      const windowEnded = isPriorityWindowEndedForToday({
        planMode,
        priorityStart,
        priorityEnd,
        priorityPlanDateKey,
        priorityPlanDateKeyEnd,
      });
      if (windowEnded) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          t('alert.focusEnded.title'),
          t('catalog.focusEndedChangeTime'),
        );
        return;
      }

      animateListMutation();
      void Haptics.selectionAsync();

      let end = endMinutes;
      if (end <= startMinutes) {
        end = Math.min(24 * 60, startMinutes + 15);
      }

      const blockId = findSpineBlockIdForCategory(planBlocks, trimmed);
      const label = getPickerCategoryLabel(trimmed);

      if (blockId) {
        const result = updatePlanBlock(blockId, { startMinutes, endMinutes: end });
        if (!result.ok) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (result.reason === 'in_the_past') {
            Alert.alert(t('catalog.cannotChangeTimeTitle'), t('catalog.cannotChangePastTime'));
          } else if (result.reason === 'invalid_range') {
            Alert.alert(t('catalog.checkTimeTitle'), t('dayPlan.blockEndAfterStart'));
          }
        }
        return;
      }

      const result = addPlanBlock({
        title: label,
        category: label,
        categoryKey: trimmed,
        startMinutes,
        endMinutes: end,
        blockOrigin: 'spineTimeline',
        planDateKey: getLocalDateKey(),
      });
      if (!result.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (result.reason === 'in_the_past') {
          Alert.alert(t('catalog.cannotAddTimelineTitle'), t('catalog.cannotChangePastTime'));
        } else {
          Alert.alert(
            t('catalog.cannotAddTimelineTitle'),
            t('catalog.timelineFull'),
          );
        }
        return;
      }
      appendRoutineCatalogSelectionKeys([trimmed]);
    },
    [
      animateListMutation,
      effectiveCatalogLayoutMode,
      isFocusStarted,
      planBlocks,
      planMode,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      selectedCategoryKeys,
      updatePlanBlock,
      addPlanBlock,
    ],
  );

  const runDeleteCustomFlow = useCallback(
    (categoryKey: string) => {
      deleteCustomFlowCategory(categoryKey, {
        hydrateFixedFlowSets: () => useFixedFlowSetsStore.getState().hydrate(),
        getTodayAppliedCategoryKeys: () =>
          useFixedFlowSetsStore.getState().todayAppliedCategoryKeys,
        reloadFixedFlowSetsFromStorage: () =>
          useFixedFlowSetsStore.getState().reloadFromStorage(),
        notifyFixedFlowApplyScheduleChanged,
        getPriorityCategoryOrder: () => useDayPlanDraftStore.getState().priorityCategoryOrder,
        setPriorityCategoryOrder: (order) =>
          useDayPlanDraftStore.getState().setPriorityCategoryOrder(order),
        getPrioritySectionsCategoryOrder: () =>
          useDayPlanDraftStore.getState().prioritySectionsCategoryOrder,
        setPrioritySectionsCategoryOrder: (order) =>
          useDayPlanDraftStore.getState().setPrioritySectionsCategoryOrder(order),
        filterCompletedFocusKeysToPriorityOrder: (order) =>
          useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(order),
        registerOtherCategoryResolverFromStorage,
        bumpCategoryLabelEpoch: () => useDayPlanDraftStore.getState().bumpCategoryLabelEpoch(),
      });
    },
    [],
  );

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createChoiceSheetOpen, setCreateChoiceSheetOpen] = useState(false);
  const [createGroupSheetOpen, setCreateGroupSheetOpen] = useState(false);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);

  const reloadCatalogData = useCallback(() => {
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
  }, []);

  useEffect(() => {
    reloadCatalogData();
  }, [reloadCatalogData]);

  useFocusEffect(
    useCallback(() => {
      hydrateLayoutModeVisibility();
      reloadCatalogData();
      useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
      const order = useDayPlanDraftStore.getState().priorityCategoryOrder;
      const saved = loadRoutineCatalogSelectionKeys();
      if (saved.length === 0 && order.length > 0) {
        saveRoutineCatalogSelectionKeys(order);
        return;
      }
      const missing = saved.filter((key) => !order.includes(key));
      if (missing.length > 0) {
        useDayPlanDraftStore.getState().setPriorityCategoryOrder([...order, ...missing]);
      }
    }, [hydrateLayoutModeVisibility, reloadCatalogData]),
  );

  const customFlowPickerItems = useMemo(() => {
    return customFlowEntries.map((e) => {
      const item = getPickerCategoryItem(e.id);
      return {
        key: e.id,
        label: getPickerCategoryLabel(e.id),
        icon: (item?.icon ?? resolveCategoryCatalogIcon(e.id)) as typeof PICKER_CATEGORIES[number]['icon'],
      };
    });
  }, [customFlowEntries, categoryLabelEpoch]);

  const [createSheetGroupKey, setCreateSheetGroupKey] = useState<string | undefined>(undefined);
  const [editGroupSheet, setEditGroupSheet] = useState<{
    groupKey: string;
    label: string;
    subtitle: string;
    isSystemGroup: boolean;
  } | null>(null);
  const [moveFlowSheet, setMoveFlowSheet] = useState<{
    categoryKey: string;
    label: string;
    groupKey: string;
  } | null>(null);

  const openCreateSheet = useCallback((groupKey?: string) => {
    const safe =
      groupKey && (isSystemCatalogGroupKey(groupKey) || isCustomCatalogGroupKey(groupKey))
        ? groupKey
        : 'productivity';
    setCreateSheetGroupKey(safe);
    setCreateSheetOpen(true);
  }, []);

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
      reloadCatalogData();
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [reloadCatalogData],
  );

  const scrollBottomPad = useMemo(
    () => tabBarScrollBottomInset(insets.bottom),
    [insets.bottom],
  );

  const shellBg = c.containerLow;

  const onCatalogTap = useCallback(
    (key: string) => {
      const alreadyIn = selectedCategoryKeys.includes(key);
      if (isFocusStarted && alreadyIn) {
        void Haptics.selectionAsync();
        return;
      }
      if (!alreadyIn) {
        const windowEnded = isPriorityWindowEndedForToday({
          planMode,
          priorityStart,
          priorityEnd,
          priorityPlanDateKey,
          priorityPlanDateKeyEnd,
        });
        if (windowEnded) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            t('alert.focusEnded.title'),
            t('catalog.focusEndedAdd'),
          );
          return;
        }
      }
      animateListMutation();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = toggleCatalogItemForLayoutMode(
        {
          layoutMode: effectiveCatalogLayoutMode,
          key,
          selected: alreadyIn,
          priorityStart,
          priorityEnd,
          planBlocks,
          nowMinutes: getLocalMinutesOfDayNow(),
          targetMealSlot: priorityMealSlotOverrides[key.trim()] ?? catalogTargetMealSlot,
        },
        catalogToggleActions,
      );
      if (!result.ok && result.reason === 'spine_window_full') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          t('catalog.cannotAddTimelineTitle'),
          t('catalog.timelineFull'),
        );
      }
    },
    [
      animateListMutation,
      catalogToggleActions,
      catalogTargetMealSlot,
      effectiveCatalogLayoutMode,
      isFocusStarted,
      planBlocks,
      planMode,
      priorityEnd,
      priorityMealSlotOverrides,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      selectedCategoryKeys,
    ],
  );

  const onToggleCatalogMealSlot = useCallback(
    (key: string, slot: DayMealSlot) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      if (isFocusStarted && selectedCategoryKeys.includes(trimmed)) {
        void Haptics.selectionAsync();
        return;
      }
      if (effectiveCatalogLayoutMode !== 'sections') return;

      void Haptics.selectionAsync();

      const inOrder = selectedCategoryKeys.includes(trimmed);
      if (!inOrder) {
        const override = priorityMealSlotOverrides[trimmed];
        setPriorityMealSlotOverride(trimmed, override === slot ? null : slot);
        return;
      }

      animateListMutation();

      const currentSlots = prioritySectionsMealSlots[trimmed] ?? [];
      const hasSlot = currentSlots.includes(slot);

      if (hasSlot) {
        const nextSlots = currentSlots.filter((item) => item !== slot);
        if (nextSlots.length === 0) {
          setPrioritySectionsCategoryOrder((prev) => prev.filter((item) => item !== trimmed));
          setPrioritySectionsMealSlots(trimmed, null);
        } else {
          setPrioritySectionsMealSlots(trimmed, nextSlots);
        }
        return;
      }

      addPrioritySectionMealSlot(trimmed, slot);
    },
    [
      addPrioritySectionMealSlot,
      animateListMutation,
      effectiveCatalogLayoutMode,
      isFocusStarted,
      priorityMealSlotOverrides,
      prioritySectionsMealSlots,
      selectedCategoryKeys,
      setPriorityMealSlotOverride,
      setPrioritySectionsCategoryOrder,
      setPrioritySectionsMealSlots,
    ],
  );

  const onOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      if (isFocusStarted && selectedCategoryKeys.includes(categoryKey)) {
        void Haptics.selectionAsync();
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [isFocusStarted, selectedCategoryKeys, router],
  );

  const onEditCatalogGroup = useCallback(
    (groupKey: string, currentLabel: string, currentSubtitle: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditGroupSheet({
        groupKey,
        label: currentLabel,
        subtitle: currentSubtitle,
        isSystemGroup: isSystemCatalogGroupKey(groupKey),
      });
    },
    [],
  );

  const onSaveEditCatalogGroup = useCallback(
    ({ label, subtitle }: { label: string; subtitle: string }) => {
      if (!editGroupSheet) return;
      if (label.length === 0) {
        Alert.alert(t('catalog.inputCheckTitle'), t('catalog.enterName'));
        return;
      }
      if (editGroupSheet.isSystemGroup && isSystemCatalogGroupKey(editGroupSheet.groupKey)) {
        updateSystemCatalogGroupMeta(editGroupSheet.groupKey, { label, subtitle });
      } else {
        updateCustomCatalogGroup(editGroupSheet.groupKey, { label, subtitle });
      }
      reloadCatalogData();
      setEditGroupSheet(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [editGroupSheet, reloadCatalogData],
  );

  const onSaveCreateCatalogGroup = useCallback(
    ({ label, subtitle }: { label: string; subtitle: string }) => {
      if (label.length === 0) {
        Alert.alert(t('catalog.inputCheckTitle'), t('catalog.enterName'));
        return;
      }
      if (listCustomCatalogGroups().some((g) => g.label === label)) {
        Alert.alert(t('catalog.duplicateGroupTitle'), t('catalog.duplicateGroupMessage'));
        return;
      }
      const created = createCustomCatalogGroup(label, subtitle);
      if (!created) {
        Alert.alert(t('catalog.createGroupFailedTitle'), t('catalog.createGroupFailedMessage'));
        return;
      }
      reloadCatalogData();
      setCreateGroupSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [reloadCatalogData],
  );

  const performDeleteCatalogGroup = useCallback(
    (groupKey: string) => {
      animateListMutation();
      if (!dismissCatalogGroupWithItemReassign(groupKey)) {
        Alert.alert(
          t('catalog.cannotDeleteGroupTitle'),
          t('catalog.cannotDeleteGroupMessage'),
        );
        return;
      }
      reloadCatalogData();
      setEditGroupSheet(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [animateListMutation, reloadCatalogData],
  );

  const onDeleteCatalogGroup = useCallback(
    (groupKey: string, currentLabel: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const moveTargetLabel = isSystemCatalogGroupKey(groupKey)
        ? groupKey === 'health'
          ? t('catalog.groupProductivity')
          : t('catalog.groupHealth')
        : t('catalog.groupProductivity');
      Alert.alert(
        t('catalog.deleteGroupTitle'),
        t('catalog.deleteGroupMessage', { current: currentLabel, target: moveTargetLabel }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => performDeleteCatalogGroup(groupKey),
          },
        ],
      );
    },
    [performDeleteCatalogGroup],
  );

  const onDeleteCatalogItem = useCallback(
    (categoryKey: string, label: string) => {
      if (isFocusStarted && selectedCategoryKeys.includes(categoryKey)) {
        void Haptics.selectionAsync();
        Alert.alert(
          t('catalog.cannotDeleteTitle'),
          t('catalog.cannotDeleteFocusActive'),
        );
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isCustomFlowCategoryKey(categoryKey)) {
        Alert.alert(
          t('catalog.deleteRoutineTitle'),
          t('catalog.deleteRoutineMessage', { label }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: () => {
                animateListMutation();
                runDeleteCustomFlow(categoryKey);
                reloadCatalogData();
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            },
          ],
        );
        return;
      }
      Alert.alert(
        t('catalog.hideItemTitle'),
        t('catalog.hideItemMessage', { label }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.hide'),
            style: 'destructive',
            onPress: () => {
              animateListMutation();
              hideStandardCatalogKey(categoryKey);
              const nextOrder = priorityCategoryOrder.filter((k) => k !== categoryKey);
              setPriorityCategoryOrder(nextOrder);
              saveRoutineCatalogSelectionKeys(nextOrder);
              filterCompletedFocusKeysToPriorityOrder(nextOrder);
              bumpCategoryLabelEpoch();
              reloadCatalogData();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [
      animateListMutation,
      bumpCategoryLabelEpoch,
      filterCompletedFocusKeysToPriorityOrder,
      isFocusStarted,
      priorityCategoryOrder,
      reloadCatalogData,
      runDeleteCustomFlow,
      setPriorityCategoryOrder,
    ],
  );

  const onMoveCatalogFlow = useCallback((categoryKey: string, label: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoveFlowSheet({
      categoryKey,
      label,
      groupKey: resolveCatalogItemGroupKey(categoryKey),
    });
  }, []);

  const onSaveMoveCatalogFlow = useCallback(
    (groupKey: string) => {
      if (!moveFlowSheet) return;
      const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
      updateCatalogItemGroup(moveFlowSheet.categoryKey, safeGroupKey);
      reloadCatalogData();
      setMoveFlowSheet(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [moveFlowSheet, reloadCatalogData],
  );

  return (
    <>
      <View style={[styles.stickyHeader, { paddingHorizontal: 16 }]}>
        {showLayoutModeTabs && visibleLayoutModes.length > 0 ? (
          <View style={styles.layoutModeRow}>
            <DayPlanLayoutModeTabs
              mode={effectiveCatalogLayoutMode}
              onSelectMode={onSelectCatalogLayoutMode}
              c={c}
              isDark={isDark}
              visibleModes={visibleLayoutModes}
              showLabels
            />
          </View>
        ) : null}
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>{t('catalog.pageTitle')}</ThemedText>
            <View style={styles.titleRowEnd}>
              <View
                style={[
                  styles.modeBadge,
                  {
                    borderColor: editorial.line,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  },
                ]}>
                <ThemedText style={[styles.modeBadgeLabel, { color: editorial.muted }]}>
                  {t('catalog.addToMode', { mode: catalogLayoutModeActiveLabel(effectiveCatalogLayoutMode, t) })}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('catalog.createNewA11y')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setCreateChoiceSheetOpen(true);
                }}
                style={({ pressed }) => [
                  styles.headerAddButton,
                  { opacity: pressed ? 0.92 : 1 },
                ]}>
                <View style={styles.headerAddButtonInner}>
                  <IconSymbol name="plus" size={18} color="#FAFAFA" style={styles.headerAddIcon} />
                </View>
              </Pressable>
            </View>
          </View>
          <ThemedText style={[styles.lead, { color: editorial.muted }]}>
            {catalogLayoutModeLead(effectiveCatalogLayoutMode, t)}
          </ThemedText>
        </View>
      </View>
      <ScrollView
        style={[styles.scroll, { backgroundColor: shellBg }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: scrollBottomPad,
            paddingTop: 8,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <PriorityCatalogPanel
          key={categoryLabelEpoch}
          editorial={editorial}
          priorityCategoryOrder={selectedCategoryKeys}
          isFocusStarted={isFocusStarted}
          onCatalogTap={onCatalogTap}
          onOpenCategorySettings={onOpenCategorySettings}
          customFlowPickerItems={customFlowPickerItems}
          customFlowEntries={customFlowEntries}
          customGroups={customGroups}
          isDark={isDark}
          onRenameCustomGroup={onEditCatalogGroup}
          onDeleteCatalogGroup={onDeleteCatalogGroup}
          onMoveCustomFlow={onMoveCatalogFlow}
          onDeleteCatalogItem={onDeleteCatalogItem}
          sectionsCatalogEnabled={effectiveCatalogLayoutMode === 'sections'}
          prioritySectionsMealSlots={prioritySectionsMealSlots}
          priorityMealSlotOverrides={priorityMealSlotOverrides}
          defaultMealSlot={catalogTargetMealSlot}
          onToggleCatalogMealSlot={onToggleCatalogMealSlot}
          spineCatalogEnabled={effectiveCatalogLayoutMode === 'spine'}
          priorityStart={priorityStart}
          priorityEnd={priorityEnd}
          resolveSpineSchedule={resolveCatalogSpineSchedule}
          onChangeCatalogSpineTime={onChangeCatalogSpineTime}
        />
      </ScrollView>
      <CreateCatalogEntryChoiceSheet
        visible={createChoiceSheetOpen}
        onClose={() => setCreateChoiceSheetOpen(false)}
        onCreateRoutine={() => {
          setCreateChoiceSheetOpen(false);
          setTimeout(() => openCreateSheet(), 80);
        }}
        onCreateGroup={() => {
          setCreateChoiceSheetOpen(false);
          setTimeout(() => setCreateGroupSheetOpen(true), 80);
        }}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={shellBg}
        line={editorial.line}
      />
      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onCreate={handleCreateCustomFlow}
        initialGroupKey={createSheetGroupKey}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        line={editorial.line}
        surface={shellBg}
      />
      <EditCatalogGroupSheet
        visible={createGroupSheetOpen}
        mode="create"
        onClose={() => setCreateGroupSheetOpen(false)}
        initialLabel=""
        initialSubtitle=""
        onSave={onSaveCreateCatalogGroup}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={shellBg}
      />
      <EditCatalogGroupSheet
        visible={editGroupSheet != null}
        onClose={() => setEditGroupSheet(null)}
        initialLabel={editGroupSheet?.label ?? ''}
        initialSubtitle={editGroupSheet?.subtitle ?? ''}
        onSave={onSaveEditCatalogGroup}
        onDelete={
          editGroupSheet
            ? () => {
              if (!editGroupSheet) return;
              onDeleteCatalogGroup(editGroupSheet.groupKey, editGroupSheet.label);
            }
            : undefined
        }
        deleteHint={
          editGroupSheet?.isSystemGroup
            ? t('catalog.deleteGroupHint')
            : undefined
        }
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={shellBg}
      />
      <MoveCustomFlowGroupSheet
        visible={moveFlowSheet != null}
        onClose={() => setMoveFlowSheet(null)}
        flowLabel={moveFlowSheet?.label ?? ''}
        initialGroupKey={moveFlowSheet?.groupKey ?? DEFAULT_CUSTOM_FLOW_GROUP_KEY}
        onSave={onSaveMoveCatalogFlow}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={shellBg}
      />
    </>
  );
}

const HEADER_ADD_BUTTON_SIZE = 36;

const styles = StyleSheet.create({
  stickyHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
    zIndex: 2,
  },
  layoutModeRow: {
    marginBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerBlock: {
    gap: 8,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerAddButton: {
    width: HEADER_ADD_BUTTON_SIZE,
    height: HEADER_ADD_BUTTON_SIZE,
    borderRadius: HEADER_ADD_BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#000000',
    flexShrink: 0,
  },
  headerAddButtonInner: {
    flex: 1,
    borderRadius: HEADER_ADD_BUTTON_SIZE / 2,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddIcon: {
    marginTop: 1,
  },
  modeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  modeBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  lead: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
});
