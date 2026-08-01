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

import {
  createCustomFlowCategoryId,
  deleteCustomFlowCategory,
  dismissCatalogGroupWithItemReassign,
  buildInitialCustomFlowDetailConfig,
  type CustomFlowTemplateKey,
  isCustomFlowCategoryKey,
  isSystemCatalogGroupKey,
  notifyFixedFlowApplyScheduleChanged,
  resolveCategoryCatalogIcon,
  useDayPlanDraftStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendCustomFlowCatalogEntry,
  createCustomCatalogGroup,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  hideStandardCatalogKey,
  isCustomCatalogGroupKey,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  resolveCatalogItemGroupKey,
  saveGoalDetailCategoryConfig,
  updateCatalogItemGroup,
  updateCustomCatalogGroup,
  updateSystemCatalogGroupMeta,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
} from '../lib/dayPlanEditorShared';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import { CreateCatalogEntryChoiceSheet } from './CreateCatalogEntryChoiceSheet';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
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
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    ink: tone.text,
    muted: tone.textMuted,
    line: tone.border,
    /** 이전 앱 배경 — warm beige (`#F5F2EB`) */
    shellBg: c.containerLow,
    sheetSurface: c.containerLow,
    actionBg: isDark ? tone.surfaceAlt : '#FFFFFF',
    actionHoverBg: tone.surfacePink,
    shadow: isDark ? tone.solidShadow : tone.text,
  };
}

/** 나만의 루틴 탭 — 루틴 목록 제작·관리 전용 (담기·모드별 시간 설정 없음) */
export function RoutineCatalogManageContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);
  const editorial = useMemo(() => bookColors(c, isDark), [c, isDark]);

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

  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  const bumpCategoryLabelEpoch = useDayPlanDraftStore((s) => s.bumpCategoryLabelEpoch);
  const filterCompletedFocusKeysToPriorityOrder = useDayPlanDraftStore(
    (s) => s.filterCompletedFocusKeysToPriorityOrder,
  );
  const setPriorityCategoryOrder = useDayPlanDraftStore((s) => s.setPriorityCategoryOrder);
  const setPrioritySectionsCategoryOrder = useDayPlanDraftStore(
    (s) => s.setPrioritySectionsCategoryOrder,
  );

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createChoiceSheetOpen, setCreateChoiceSheetOpen] = useState(false);
  const [createGroupSheetOpen, setCreateGroupSheetOpen] = useState(false);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
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
      bumpCategoryLabelEpoch();
    }, [bumpCategoryLabelEpoch, reloadCatalogData]),
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
        setPriorityCategoryOrder: (order) => setPriorityCategoryOrder(order),
        getPrioritySectionsCategoryOrder: () =>
          useDayPlanDraftStore.getState().prioritySectionsCategoryOrder,
        setPrioritySectionsCategoryOrder: (order) => setPrioritySectionsCategoryOrder(order),
        filterCompletedFocusKeysToPriorityOrder,
        registerOtherCategoryResolverFromStorage,
        bumpCategoryLabelEpoch,
      });
    },
    [
      bumpCategoryLabelEpoch,
      filterCompletedFocusKeysToPriorityOrder,
      setPriorityCategoryOrder,
      setPrioritySectionsCategoryOrder,
    ],
  );

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

  const onOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [router],
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

  const onSaveCreateCatalogGroup = useCallback(
    ({ label, subtitle }: { label: string; subtitle: string }) => {
      if (label.length === 0 || subtitle.length === 0) {
        Alert.alert('입력 확인', '이름과 설명을 모두 입력해 주세요.');
        return;
      }
      if (listCustomCatalogGroups().some((g) => g.label === label)) {
        Alert.alert('이미 있는 묶음', '같은 이름의 묶음이 있어요. 다른 이름을 써 주세요.');
        return;
      }
      const created = createCustomCatalogGroup(label, subtitle);
      if (!created) {
        Alert.alert('만들기 실패', '묶음을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isCustomFlowCategoryKey(categoryKey)) {
        Alert.alert(
          '루틴 삭제',
          `「${label}」 루틴을 삭제할까요? 나만의 루틴과 설정에서 함께 제거됩니다.`,
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
        `「${label}」 항목을 목록에서 숨길까요?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '숨기기',
            style: 'destructive',
            onPress: () => {
              animateListMutation();
              hideStandardCatalogKey(categoryKey);
              bumpCategoryLabelEpoch();
              reloadCatalogData();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [animateListMutation, bumpCategoryLabelEpoch, reloadCatalogData, runDeleteCustomFlow],
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

  const scrollBottomPad = useMemo(
    () => tabBarScrollBottomInset(insets.bottom),
    [insets.bottom],
  );

  return (
    <>
      <View style={[styles.stickyHeader, { paddingHorizontal: CityPopSpacing.marginMobile }]}>
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>루틴 목록</ThemedText>
              <ThemedText style={[styles.lead, { color: editorial.muted }]}>
                반복되는 할 일과 습관을 관리해요.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 루틴 또는 묶음 만들기"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCreateChoiceSheetOpen(true);
              }}
              style={({ pressed }) => [
                styles.headerAddButton,
                { opacity: pressed ? 0.92 : 1 },
              ]}>
              <View style={[styles.headerAddButtonInner, { backgroundColor: editorial.ink }]}>
                <IconSymbol name="plus" size={15} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        style={[styles.scroll, { backgroundColor: editorial.shellBg }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: scrollBottomPad,
            paddingTop: CityPopSpacing.base,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <PriorityCatalogPanel
          key={categoryLabelEpoch}
          editorial={editorial}
          priorityCategoryOrder={[]}
          isFocusStarted={false}
          onCatalogTap={() => {}}
          onOpenCategorySettings={onOpenCategorySettings}
          customFlowPickerItems={customFlowPickerItems}
          customFlowEntries={customFlowEntries}
          customGroups={customGroups}
          isDark={isDark}
          onRenameCustomGroup={onEditCatalogGroup}
          onDeleteCatalogGroup={onDeleteCatalogGroup}
          onMoveCustomFlow={onMoveCatalogFlow}
          onDeleteCatalogItem={onDeleteCatalogItem}
          manageOnly
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
        surface={editorial.sheetSurface}
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
        surface={editorial.sheetSurface}
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
        surface={editorial.sheetSurface}
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
        surface={editorial.sheetSurface}
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
        surface={editorial.sheetSurface}
      />
    </>
  );
}

const HEADER_ADD_BUTTON_SIZE = 34;

const styles = StyleSheet.create({
  stickyHeader: {
    paddingTop: CityPopSpacing.base,
    paddingBottom: CityPopSpacing.base,
    zIndex: 2,
  },
  headerBlock: {
    marginBottom: CityPopSpacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: CityPopSpacing.sm,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  headerAddButton: {
    width: HEADER_ADD_BUTTON_SIZE,
    height: HEADER_ADD_BUTTON_SIZE,
    borderRadius: HEADER_ADD_BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#000000',
    flexShrink: 0,
    marginBottom: 2,
  },
  headerAddButtonInner: {
    flex: 1,
    borderRadius: HEADER_ADD_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: CityPopSpacing.md,
  },
});
