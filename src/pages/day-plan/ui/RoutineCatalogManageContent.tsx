import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
  buildInitialCustomFlowDetailConfig,
  createCustomFlowCategoryId,
  deleteCustomFlowCategory,
  dismissCatalogGroupWithItemReassign,
  isCustomFlowCategoryKey,
  isSystemCatalogGroupKey,
  notifyFixedFlowApplyScheduleChanged,
  resolveCategoryCatalogIcon,
  useDayPlanDraftStore,
  useFixedFlowSetsStore,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { headerArtForVariant } from '@shared/ui/routine-atmosphere';
import { RoutineAtmosphereFooterStrip } from '@shared/ui/routine-atmosphere';
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
    /** City Pop warm beige */
    shellBg: isDark ? tone.bg : tone.bg,
    sheetSurface: isDark ? tone.surfaceAlt : tone.bg,
    actionBg: isDark ? tone.surfaceAlt : '#FFFFFF',
    actionHoverBg: tone.surfacePink,
    shadow: isDark ? tone.solidShadow : tone.primary,
  };
}

/** 나만의 루틴 탭 — 루틴 목록 제작·관리 전용 (담기·모드별 시간 설정 없음) */
export function RoutineCatalogManageContent() {
  const router = useRouter();
  const { t } = useTranslation();

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
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>(
    () => listAllCustomFlowCatalogEntries(),
  );
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>(
    () => listCustomCatalogGroups(),
  );
  const hasHandledInitialFocusRef = useRef(false);
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

  useFocusEffect(
    useCallback(() => {
      // 초기 데이터는 lazy state에서 동기적으로 읽는다. 마운트 직후 다시
      // 갱신하면 빈 화면과 완성된 목록 사이에 중간 프레임이 노출된다.
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }
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
    [editGroupSheet, reloadCatalogData, t],
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
    [reloadCatalogData, t],
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
    [animateListMutation, reloadCatalogData, t],
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
    [performDeleteCatalogGroup, t],
  );

  const onDeleteCatalogItem = useCallback(
    (categoryKey: string, label: string) => {
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
              bumpCategoryLabelEpoch();
              reloadCatalogData();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [animateListMutation, bumpCategoryLabelEpoch, reloadCatalogData, runDeleteCustomFlow, t],
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
              <ThemedText style={[styles.lead, { color: editorial.muted }]}>
                {t('catalog.managePageLead')}
              </ThemedText>
            </View>
            <View style={styles.headerArtSlot} pointerEvents="none">
              <Image
                source={headerArtForVariant('catalog')}
                style={styles.headerArt}
                resizeMode="contain"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('catalog.createNewA11y')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCreateChoiceSheetOpen(true);
              }}
              style={({ pressed }) => [
                styles.headerAddButtonShell,
                pressed && { opacity: 0.92 },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.headerAddButtonShadow,
                  {
                    backgroundColor: editorial.shadow,
                    borderColor: editorial.line,
                  },
                ]}
              />
              <View
                style={[
                  styles.headerAddButtonInner,
                  {
                    backgroundColor: editorial.ink,
                    borderColor: editorial.line,
                  },
                ]}>
                <IconSymbol name="plus" size={15} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        style={[styles.scroll, { backgroundColor: 'transparent' }]}
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
          editorial={editorial}
          priorityCategoryOrder={[]}
          isFocusStarted={false}
          onCatalogTap={() => { }}
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
        <RoutineAtmosphereFooterStrip variant="catalog" isDark={isDark} />
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
            ? t('catalog.deleteGroupHint')
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
    justifyContent: 'center',
  },
  headerArtSlot: {
    width: 72,
    height: 56,
    marginRight: 2,
    marginBottom: -2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  headerArt: {
    width: 88,
    height: 88,
    marginBottom: -18,
  },
  headerAddButtonShell: {
    width: HEADER_ADD_BUTTON_SIZE,
    height: HEADER_ADD_BUTTON_SIZE,
    position: 'relative',
    marginRight: 2,
    marginBottom: 4,
    flexShrink: 0,
  },
  headerAddButtonShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 0,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  headerAddButtonInner: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lead: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: CityPopSpacing.md,
  },
});
