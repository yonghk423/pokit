import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Platform, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildInitialCustomFlowDetailConfig,
  createCustomFlowCategoryId,
  deleteCustomFlowCategory,
  isCustomFlowCategoryKey,
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
import { RoutineAtmosphereFooterStrip } from '@shared/ui/routine-atmosphere';
import {
  appendCustomFlowCatalogEntry,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  hideStandardCatalogKey,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
  subscribeCustomFlowCatalog,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
} from '@shared/lib/storage';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
} from '../lib/dayPlanEditorShared';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { PriorityCatalogPanel } from './PriorityCatalogPanel';

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
    shadow: '#000000',
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
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>(
    () => listAllCustomFlowCatalogEntries(),
  );
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>(
    () => listCustomCatalogGroups(),
  );

  const reloadCatalogData = useCallback(() => {
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
  }, []);

  // 포커스마다 전체 카탈로그를 재생성하지 않고 실제 저장 변경에만 갱신한다.
  useEffect(
    () => subscribeCustomFlowCatalog(reloadCatalogData),
    [reloadCatalogData],
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

  const openCreateSheet = useCallback(() => {
    setCreateSheetOpen(true);
  }, []);

  const handleCreateCustomFlow = useCallback(
    ({
      name,
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
      appendCustomFlowCatalogEntry({ id, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
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

  const scrollBottomPad = useMemo(
    () => tabBarScrollBottomInset(insets.bottom),
    [insets.bottom],
  );

  return (
    <>
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
          onDeleteCatalogItem={onDeleteCatalogItem}
          manageOnly
          onCreatePress={openCreateSheet}
        />
        <RoutineAtmosphereFooterStrip variant="catalog" isDark={isDark} />
      </ScrollView>
      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onCreate={handleCreateCustomFlow}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        line={editorial.line}
        surface={editorial.sheetSurface}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: CityPopSpacing.md,
  },
});
