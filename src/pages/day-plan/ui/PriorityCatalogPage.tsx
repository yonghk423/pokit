import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
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
  useDayPlanDraftStore,
  useDayPlanStore,
  useDayPlanLayoutModeVisibilityStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { PokitIconPalette } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendCustomFlowCatalogEntry,
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
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
} from '../lib/dayPlanEditorShared';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import {
  catalogLayoutModeActiveLabel,
  catalogLayoutModeLead,
  resolveCatalogLayoutMode,
  resolveCatalogSelectedKeys,
  resolveCatalogTargetMealSlot,
  toggleCatalogItemForLayoutMode,
} from '../lib/priorityCatalogLayoutMode';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { DayMealSlotTargetChips } from './DayMealSlotTargetChips';
import { FixedRoutinePage } from './FixedRoutinePage';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { EditCatalogGroupSheet } from './EditCatalogGroupSheet';
import { MoveCustomFlowGroupSheet } from './MoveCustomFlowGroupSheet';
import { PriorityCatalogPageTabs, type PriorityCatalogPageTab } from './PriorityCatalogPageTabs';
import { PriorityCatalogPanel } from './PriorityCatalogPanel';

/** 시트에서 넘긴 그룹 키를 저장용으로 확정 — 검증 실패 시에만 기본 생산성 그룹 */
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

export function PriorityCatalogPage() {
  const router = useRouter();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateListMutation = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
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
    () => coerceLayoutMode(catalogLayoutMode),
    [catalogLayoutMode, coerceLayoutMode],
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
    if (effectiveCatalogLayoutMode === catalogLayoutMode) return;
    setPlanMode('priority');
    setPriorityMealSlotLayoutEnabled(effectiveCatalogLayoutMode === 'sections');
    setPrioritySpineLayoutEnabled(effectiveCatalogLayoutMode === 'spine');
  }, [
    catalogLayoutMode,
    effectiveCatalogLayoutMode,
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
        filterCompletedFocusKeysToPriorityOrder: (order) =>
          useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(order),
        registerOtherCategoryResolverFromStorage,
        bumpCategoryLabelEpoch: () => useDayPlanDraftStore.getState().bumpCategoryLabelEpoch(),
      });
    },
    [],
  );

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [catalogPageTab, setCatalogPageTab] = useState<PriorityCatalogPageTab>('catalog');
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
      templateDataConfig,
    }: {
      name: string;
      groupKey: string;
      icon: string;
      accentColor: string;
      templateKey: CustomFlowTemplateKey;
      templateDataConfig?: unknown;
    }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
      const trimmed = name.trim();
      const next = buildInitialCustomFlowDetailConfig(templateKey, {
        ...(trimmed.length > 0 ? { displayName: trimmed } : {}),
        icon,
        accentColor,
        ...(templateDataConfig ? { templateSeed: templateDataConfig } : {}),
      });
      saveGoalDetailCategoryConfig(id, next);
      appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });
      registerOtherCategoryResolverFromStorage();
      void loadGoalDetailCategoryConfig(id);
      reloadCatalogData();
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey: id, source: 'catalog' },
      });
    },
    [reloadCatalogData, router],
  );

  const scrollBottomPad = useMemo(
    () => tabBarScrollBottomInset(insets.bottom) + 88,
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
            '집중 시간이 끝났어요',
            '오늘 집중 구간이 종료되어 지금은 담을 수 없어요. 오늘 탭에서 집중 시간을 변경한 뒤 다시 담아 주세요.',
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
          targetMealSlot: catalogTargetMealSlot,
        },
        catalogToggleActions,
      );
      if (!result.ok && result.reason === 'spine_window_full') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          '타임라인에 담을 수 없어요',
          '집중 구간 안에 빈 시간이 없어요. 오늘 탭에서 시간을 조정한 뒤 다시 시도해 주세요.',
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
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      selectedCategoryKeys,
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
      if (label.length === 0 || subtitle.length === 0) {
        Alert.alert('입력 확인', '이름과 설명을 모두 입력해 주세요.');
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

  const performDeleteCatalogGroup = useCallback(
    (groupKey: string) => {
      animateListMutation();
      if (!dismissCatalogGroupWithItemReassign(groupKey)) {
        Alert.alert(
          '묶음을 삭제할 수 없어요',
          '다른 묶음도 숨겨져 있어서 항목을 옮길 곳이 없어요. 먼저 숨긴 묶음을 다시 표시한 뒤 시도해 주세요.',
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
          ? '생산성을 높이는 도구'
          : '건강 루틴'
        : '생산성을 높이는 도구';
      Alert.alert(
        '묶음 삭제',
        `「${currentLabel}」 묶음을 삭제할까요? 안에 있던 항목은 「${moveTargetLabel}」 묶음으로 옮겨져요.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
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
          '삭제할 수 없어요',
          '집중 실행 중인 항목은 삭제할 수 없어요. 집중을 마친 뒤 다시 시도해 주세요.',
        );
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isCustomFlowCategoryKey(categoryKey)) {
        Alert.alert(
          '루틴 삭제',
          `「${label}」 루틴을 삭제할까요? 담기·나만의 루틴과 설정에서 함께 제거됩니다.`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
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
        '항목 숨기기',
        `「${label}」 항목을 담기 목록에서 숨길까요? 오늘 우선 순위에 담겨 있으면 함께 빠집니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '숨기기',
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
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <View style={[styles.safe, { backgroundColor: shellBg }]}>
        <View style={[styles.stickyHeader, { backgroundColor: shellBg, paddingHorizontal: 20 }]}>
          {visibleLayoutModes.length > 0 ? (
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
          <PriorityCatalogPageTabs
            tab={catalogPageTab}
            onSelectTab={setCatalogPageTab}
            c={c}
            isDark={isDark}
            compact
          />
          {catalogPageTab === 'catalog' ? (
            <View style={styles.headerBlock}>
              <View style={styles.titleRow}>
                <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>오늘 집중할 것</ThemedText>
                <View
                  style={[
                    styles.modeBadge,
                    {
                      borderColor: editorial.line,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <ThemedText style={[styles.modeBadgeLabel, { color: editorial.muted }]}>
                    {catalogLayoutModeActiveLabel(effectiveCatalogLayoutMode)}에 담기
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.lead, { color: editorial.muted }]}>
                {catalogLayoutModeLead(effectiveCatalogLayoutMode)}
              </ThemedText>
              {effectiveCatalogLayoutMode === 'sections' ? (
                <DayMealSlotTargetChips
                  selectedSlot={catalogTargetMealSlot}
                  schedule={mealSlotSchedule}
                  isDark={isDark}
                  ink={editorial.ink}
                  muted={editorial.muted}
                  line={editorial.line}
                  onSelectSlot={setCatalogTargetMealSlot}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        {catalogPageTab === 'catalog' ? (
          <>
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
              />
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 루틴 만들기"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                openCreateSheet();
              }}
              style={({ pressed }) => [
                styles.fab,
                {
                  bottom: Math.max(insets.bottom, 12) + 12,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <View style={styles.fabInner}>
                <IconSymbol name="plus" size={26} color="#FAFAFA" />
              </View>
            </Pressable>
          </>
        ) : (
          <FixedRoutinePage
            embeddedPresetOnly
            controlledLayoutMode={effectiveCatalogLayoutMode}
            hideLayoutModeHeader
          />
        )}
      </View>
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
            ? '묶음을 삭제하면 안에 있던 항목은 다른 기본 묶음으로 옮겨져요.'
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
    </ThemedView>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
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
  fab: {
    position: 'absolute',
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#000000',
    zIndex: 30,
    elevation: 0,
    shadowOpacity: 0,
  },
  fabInner: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: PokitIconPalette.teal,
    alignItems: 'center',
    justifyContent: 'center',
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
