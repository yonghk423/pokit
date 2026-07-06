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
  useDayPlanDraftStore,
  useDayPlanStore,
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
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { EditCatalogGroupSheet } from './EditCatalogGroupSheet';
import { MoveCustomFlowGroupSheet } from './MoveCustomFlowGroupSheet';
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
    isFocusStarted,
    planMode,
    priorityStart,
    priorityEnd,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    bumpCategoryLabelEpoch,
    filterCompletedFocusKeysToPriorityOrder,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityCategoryOrder: s.priorityCategoryOrder,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      isFocusStarted: s.isFocusStarted,
      planMode: s.planMode,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      bumpCategoryLabelEpoch: s.bumpCategoryLabelEpoch,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
    })),
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
      reloadCatalogData();
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
    }, [reloadCatalogData]),
  );

  const customFlowPickerItems = useMemo(() => {
    return customFlowEntries.map((e) => {
      const item = getPickerCategoryItem(e.id);
      return {
        key: e.id,
        label: getPickerCategoryLabel(e.id),
        icon: (item?.icon ?? 'person.fill') as typeof PICKER_CATEGORIES[number]['icon'],
      };
    });
  }, [customFlowEntries]);

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
    }: {
      name: string;
      groupKey: string;
      icon: string;
      accentColor: string;
      templateKey: CustomFlowTemplateKey;
    }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
      const trimmed = name.trim();
      const next = buildInitialCustomFlowDetailConfig(templateKey, {
        ...(trimmed.length > 0 ? { displayName: trimmed } : {}),
        icon,
        accentColor,
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
      const alreadyIn = priorityCategoryOrder.includes(key);
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
      const nextOrder = priorityCategoryOrder.includes(key)
        ? priorityCategoryOrder.filter((k) => k !== key)
        : [...priorityCategoryOrder, key];
      setPriorityCategoryOrder(nextOrder);
      saveRoutineCatalogSelectionKeys(nextOrder);
    },
    [
      animateListMutation,
      isFocusStarted,
      planMode,
      priorityCategoryOrder,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      setPriorityCategoryOrder,
    ],
  );

  const onOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      if (isFocusStarted && priorityCategoryOrder.includes(categoryKey)) {
        void Haptics.selectionAsync();
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [isFocusStarted, priorityCategoryOrder, router],
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
      if (isFocusStarted && priorityCategoryOrder.includes(categoryKey)) {
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
          <View style={styles.headerBlock}>
            <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>오늘 집중할 것</ThemedText>
            <ThemedText style={[styles.lead, { color: editorial.muted }]}>
              하루 동안 무엇에 집중할지 골라 담는 곳이에요. 탭한 항목은 오늘 탭 우선 순위에 순서대로 쌓여요. 부담스럽지 않게 필요한 만큼만
              담아도 돼요.
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
            editorial={editorial}
            priorityCategoryOrder={priorityCategoryOrder}
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
    zIndex: 2,
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
  pageTitle: {
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
