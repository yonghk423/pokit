import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deleteCustomFlowCategory,
  formatBlockTimeRange,
  isCustomFlowCategoryKey,
  isDayPlanFlowBlock,
  isGoalDetailChecklistStyleCategoryKey,
  isInternalAutoRoutineLabel,
  mergeCustomFlowGoalDetailData,
  normalizeHealthIntakeDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  resolveCustomFlowTemplateKey,
  useDayPlanDraftStore,
  useDayPlanRuntimeStore,
  categoryReminderLabelKo,
  notifyFixedFlowApplyScheduleChanged,
  useDayPlanStore,
  useFixedFlowSetsStore,
  type DayPlanBlock,
} from '@entities/day-plan';
import { readRoutineDisplayNameFromConfig } from '@entities/day-plan/lib/routineDisplayName';
import {
  rescheduleDayPlanNotifications,
  syncMedicineReminderNotifications,
} from '@features/day-plan-notifications';
import { persistReminderTemplateNotificationRule } from '@features/category-reminder-notifications';
import { reconcileLiveActivityFromPlan } from '@features/live-activity-sync';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
  resolveCatalogItemGroupKey,
  updateCatalogItemGroup,
} from '@shared/lib/storage';
import { RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import type { GoalDetailCategoryKey } from '../model/types';
import { useGoalDetailSettingsRoute } from '../model/useGoalDetailSettingsRoute';
import { resolveGoalDetailModuleForTarget } from './category';
import { RoutineDeleteButton } from './category/lib/RoutineDeleteButton';
import { RoutineTitleField, ROUTINE_RENAME_LOCK_MESSAGES } from './category/lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from './category/lib/routineTitleFallback';
import { goalDetailSettingsPalette } from './category/lib/settingsPalette';
import { CustomFlowGroupField } from './category/other/ui/CustomFlowGroupField';
import { WATER_GOAL_DETAIL_THEME as WATER } from './category/water/lib/waterGoalDetailTheme';
import { CustomFlowTemplateMetaPill } from './CustomFlowTemplateMetaPill';
import { RoutineAppearanceField } from './lib/RoutineAppearanceField';
import { RoutineStartNotifyField } from '@features/day-plan-notifications';

function palette(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    onSurface: c.text,
    onVariant: c.textMuted,
    outline: c.textMuted,
    border: c.border,
  };
}

const PRIMARY = RetroFlatColors.light.primary;

type EditingTarget = {
  blockId: string;
  categoryKey: GoalDetailCategoryKey;
  timeLabel: string;
};

function inferCategoryKeyFromLabel(category: string): GoalDetailCategoryKey {
  return (resolveCategoryKeyFromLabel(category) ?? 'other') as GoalDetailCategoryKey;
}

function blockTimeLabel(block: DayPlanBlock): string {
  return formatBlockTimeRange(block);
}

function resolveGoalDetailHeaderTitle(args: {
  targets: EditingTarget[];
  sortedTargets: EditingTarget[];
  categoryKey: GoalDetailCategoryKey;
  dataByBlockId: Record<string, unknown>;
  previewTitleForBlock: (blockId: string, fallbackCategoryKey?: string) => string;
}): string {
  const primary = args.sortedTargets[0] ?? args.targets[0];
  const key = primary?.categoryKey ?? args.categoryKey;
  const data = primary ? args.dataByBlockId[primary.blockId] : undefined;

  const customName = readRoutineDisplayNameFromConfig(data);
  if (customName) return customName;

  if (primary) {
    const blockTitle = args.previewTitleForBlock(primary.blockId, key);
    if (blockTitle) return blockTitle;
  }

  return categoryReminderLabelKo(key);
}

function buildLoadedDataByBlockId(targets: EditingTarget[]): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const t of targets) {
    const byBlock = loadGoalDetailBlockConfig(t.blockId);
    const byCategory = loadGoalDetailCategoryConfig(t.categoryKey);
    const module = resolveGoalDetailModuleForTarget(t.categoryKey, byCategory ?? byBlock);
    const fallback = module.getInitialDataConfig?.() ?? {};
    if (
      isGoalDetailChecklistStyleCategoryKey(t.categoryKey) ||
      isCustomFlowCategoryKey(t.categoryKey)
    ) {
      next[t.blockId] = isCustomFlowCategoryKey(t.categoryKey)
        ? mergeCustomFlowGoalDetailData(byBlock, byCategory, fallback)
        : normalizeOtherDetailConfig(
            mergeCustomFlowGoalDetailData(byBlock, byCategory, fallback) as object,
          );
    } else if (t.categoryKey === 'healthIntake') {
      const merged = {
        ...(byCategory && typeof byCategory === 'object' ? byCategory : {}),
        ...(byBlock && typeof byBlock === 'object' ? byBlock : {}),
      };
      const displayName =
        readRoutineDisplayNameFromConfig(byBlock) ||
        readRoutineDisplayNameFromConfig(byCategory) ||
        '';
      next[t.blockId] = normalizeHealthIntakeDetailConfig({ ...merged, displayName });
    } else {
      next[t.blockId] = byBlock ?? byCategory ?? fallback;
    }
  }
  return next;
}

function waterReminderSyncFingerprint(raw: unknown): string {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return JSON.stringify({
    goalMl: o.goalMl,
    reminderPreset: o.reminderPreset,
    reminderCustomMin: o.reminderCustomMin,
    smartNotification: o.smartNotification,
    reminderTimes: o.reminderTimes,
  });
}

/** 자동 저장 레이스로 필드가 빠진 페이로드가 이전 값을 지우는 것을 막는다. */
function withPreservedRoutineFields(categoryKey: string, next: unknown): unknown {
  if (!next || typeof next !== 'object') return next;
  const o = { ...(next as Record<string, unknown>) };
  const prev = loadGoalDetailCategoryConfig(categoryKey);
  if (!prev || typeof prev !== 'object') return o;
  const prevO = prev as Record<string, unknown>;

  if (!('displayName' in o)) {
    const prevName = readRoutineDisplayNameFromConfig(prev);
    if (prevName.length > 0) o.displayName = prevName;
  }
  if (!('icon' in o) && typeof prevO.icon === 'string') {
    o.icon = prevO.icon;
  }
  if (!('accentColor' in o) && typeof prevO.accentColor === 'string') {
    o.accentColor = prevO.accentColor;
  }
  if (!('templateKey' in o) && typeof prevO.templateKey === 'string') {
    o.templateKey = prevO.templateKey;
  }
  return o;
}

function resolveCatalogGroupKeyForSettings(categoryKey: string): string {
  return resolveCatalogItemGroupKey(categoryKey);
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  /** 목표 상세는 항상 라이트(화이트) 기준 UI */
  const c = useMemo(() => palette(false), []);

  const { categoryKey, startBlockId, blockIds, source } = useGoalDetailSettingsRoute();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      const pinnedY = scrollOffsetRef.current;
      setKeyboardHeight(Math.max(0, event.endCoordinates?.height ?? 0));
      const restore = () => {
        scrollRef.current?.scrollTo({ y: pinnedY, animated: false });
      };
      requestAnimationFrame(restore);
      setTimeout(restore, 50);
      setTimeout(restore, 200);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const keyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
    useDayPlanDraftStore.getState().hydrate();
    registerOtherCategoryResolverFromStorage();
  }, []);

  useEffect(() => {
    return () => {
      useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
    };
  }, []);
  const blocks = useDayPlanStore((s) => s.blocks);
  const activeBlockId = useDayPlanRuntimeStore((s) => s.activeBlockId);
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);

  /** 실제 activity-session 활성 블록만 ‘실행 중’ — 오늘 담기 자동 집중(isFocusStarted)과 구분 */
  const isCategoryRunning = useCallback(
    (key: string) => {
      if (!activeBlockId) return false;
      const block = blocks.find((b) => b.id === activeBlockId);
      if (!block) return false;
      const blockKey =
        resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      return blockKey === key;
    },
    [activeBlockId, blocks],
  );

  const resolveRenameAccess = useCallback(
    (key: string) => {
      if (isCategoryRunning(key)) {
        return { allowRename: false, renameLockedReason: 'running' as const };
      }
      if (source === 'today') {
        return { allowRename: false, renameLockedReason: 'today' as const };
      }
      return { allowRename: true, renameLockedReason: null as const };
    },
    [isCategoryRunning, source],
  );

  const targets = useMemo<EditingTarget[]>(() => {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const ids = blockIds.length > 0 ? blockIds : startBlockId ? [startBlockId] : [];
    const uniqueIds = [...new Set(ids)];
    const rows: EditingTarget[] = [];

    for (const id of uniqueIds) {
      const b = byId.get(id);
      if (!b || !isDayPlanFlowBlock(b)) continue;
      rows.push({
        blockId: b.id,
        categoryKey: (resolveBlockCategoryKey(b) ??
          inferCategoryKeyFromLabel(b.category)) as GoalDetailCategoryKey,
        timeLabel: blockTimeLabel(b),
      });
    }

    if (rows.length > 0) return rows;
    return [
      {
        /** 일정 블록 없이 담기·우선순위에서만 열 때 — `single` 공유 키 대신 카테고리별로 분리 */
        blockId: startBlockId?.trim() || categoryKey,
        categoryKey,
        timeLabel: '-',
      },
    ];
  }, [blocks, blockIds, categoryKey, startBlockId]);

  const { validTargets, sortedTargets } = useMemo(() => {
    const valid = targets.filter((t) =>
      blocks.some((b) => b.id === t.blockId && isDayPlanFlowBlock(b)),
    );
    const rows = [...valid];
    rows.sort((a, b) => {
      const ba = blocks.find((x) => x.id === a.blockId);
      const bb = blocks.find((x) => x.id === b.blockId);
      const ma = ba?.startMinutes ?? 0;
      const mb = bb?.startMinutes ?? 0;
      return ma !== mb ? ma - mb : (ba?.order ?? 0) - (bb?.order ?? 0);
    });
    return { validTargets: valid, sortedTargets: rows };
  }, [targets, blocks]);

  const liveActivityChecklistFocusBlockId = useDayPlanStore(
    (s) => s.liveActivityChecklistFocusBlockId,
  );
  const setLiveActivityChecklistFocusBlockId = useDayPlanStore(
    (s) => s.setLiveActivityChecklistFocusBlockId,
  );

  /** 화면에 맞는 기본 강조: 단일 블록이면 그 블록, 여러 개면 첫 시간대(또는 이미 저장된 값 유지). */
  useEffect(() => {
    if (validTargets.length === 0) return;
    const idSet = new Set(validTargets.map((t) => t.blockId));
    const cur = useDayPlanStore.getState().liveActivityChecklistFocusBlockId;
    if (validTargets.length === 1) {
      const only = validTargets[0].blockId;
      if (cur !== only) setLiveActivityChecklistFocusBlockId(only);
      return;
    }
    if (!cur || !idSet.has(cur)) {
      setLiveActivityChecklistFocusBlockId(sortedTargets[0].blockId);
    }
  }, [validTargets, sortedTargets, setLiveActivityChecklistFocusBlockId]);

  const loadedDataByBlockId = useMemo(() => buildLoadedDataByBlockId(targets), [targets]);
  const targetBlockIdsKey = useMemo(
    () => targets.map((t) => t.blockId).sort().join('|'),
    [targets],
  );
  const [patchByBlockId, setPatchByBlockId] = useState<Record<string, unknown>>({});
  const [customFlowGroupByCategoryKey, setCustomFlowGroupByCategoryKey] = useState<
    Record<string, string>
  >({});
  const medicineReminderSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPatchByBlockId({});
  }, [targetBlockIdsKey]);

  useEffect(() => {
    for (const t of targets) {
      if (!isCustomFlowCategoryKey(t.categoryKey)) continue;
      const cfg =
        loadedDataByBlockId[t.blockId] ?? loadGoalDetailCategoryConfig(t.categoryKey);
      if (resolveCustomFlowTemplateKey(cfg) === 'reminder') {
        void persistReminderTemplateNotificationRule(t.categoryKey, cfg);
      }
    }
  }, [loadedDataByBlockId, targetBlockIdsKey, targets]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const t of targets) {
      next[t.categoryKey] = resolveCatalogGroupKeyForSettings(t.categoryKey);
    }
    setCustomFlowGroupByCategoryKey(next);
  }, [targets]);

  const dataByBlockId = useMemo(
    () => ({ ...loadedDataByBlockId, ...patchByBlockId }),
    [loadedDataByBlockId, patchByBlockId],
  );

  useEffect(
    () => () => {
      if (medicineReminderSyncTimerRef.current) {
        clearTimeout(medicineReminderSyncTimerRef.current);
      }
    },
    [],
  );

  const handleChangeDataConfig = useCallback((target: EditingTarget, next: unknown) => {
    const normalizedNext =
      target.categoryKey === 'healthIntake'
        ? normalizeHealthIntakeDetailConfig(next)
        : next;
    const persisted = withPreservedRoutineFields(target.categoryKey, normalizedNext);
    const serialized = JSON.stringify(persisted);
    let shouldPersist = true;
    setPatchByBlockId((prev) => {
      const current = prev[target.blockId];
      if (current !== undefined && JSON.stringify(current) === serialized) {
        shouldPersist = false;
        return prev;
      }
      return { ...prev, [target.blockId]: persisted };
    });
    if (!shouldPersist) return;

    saveGoalDetailBlockConfig(target.blockId, persisted);
    saveGoalDetailCategoryConfig(target.categoryKey, persisted);
    registerOtherCategoryResolverFromStorage();
    useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
    if (target.categoryKey === 'healthIntake' || target.categoryKey === 'medicine') {
      if (medicineReminderSyncTimerRef.current) {
        clearTimeout(medicineReminderSyncTimerRef.current);
      }
      medicineReminderSyncTimerRef.current = setTimeout(() => {
        medicineReminderSyncTimerRef.current = null;
        void syncMedicineReminderNotifications();
      }, 450);
    }
    if (target.categoryKey === 'water') {
      const prevWater = loadGoalDetailCategoryConfig('water');
      if (waterReminderSyncFingerprint(prevWater) !== waterReminderSyncFingerprint(persisted)) {
        useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
      }
    }
    if (
      isCustomFlowCategoryKey(target.categoryKey) &&
      resolveCustomFlowTemplateKey(persisted) === 'reminder'
    ) {
      void persistReminderTemplateNotificationRule(target.categoryKey, persisted);
    }
  }, []);

  const handleDeleteCustomFlow = useCallback(
    (categoryKey: GoalDetailCategoryKey) => {
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
      router.back();
    },
    [router],
  );

  const handleChangeCatalogGroup = useCallback(
    (categoryKey: GoalDetailCategoryKey, groupKey: string) => {
      updateCatalogItemGroup(categoryKey, groupKey);
      setCustomFlowGroupByCategoryKey((prev) => ({ ...prev, [categoryKey]: groupKey }));
    },
    [],
  );

  const handleCompleteAndStart = useCallback(() => {
    const keysToAppend: string[] = [];
    for (const t of targets) {
      const data = dataByBlockId[t.blockId];
      if (t.categoryKey === 'medicine') {
        const cfg = normalizeMedicineDetailConfig(data ?? {});
        if (cfg.dosesPerDay <= 0) continue;
      }
      keysToAppend.push(t.categoryKey);
    }
    appendGoalDetailCommittedCategoryKeys(keysToAppend);

    void (async () => {
      const dayPlanState = useDayPlanStore.getState();
      useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
        dateKey: dayPlanState.dateKey,
        blocks: dayPlanState.blocks,
      });
      await rescheduleDayPlanNotifications();
      await syncMedicineReminderNotifications();
      useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();

      const ids = sortedTargets
        .map((t) => t.blockId)
        .filter(
          (id) =>
            Boolean(id) &&
            id !== 'single' &&
            !id.startsWith('customFlow:') &&
            blocks.some((b) => b.id === id && isDayPlanFlowBlock(b)),
        );
      if (ids.length === 0) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/day-plan');
        }
        return;
      }
      const focusId = dayPlanState.liveActivityChecklistFocusBlockId;
      const startForReview = focusId && ids.includes(focusId) ? focusId : ids[0];
      router.replace({
        pathname: '/flow-review',
        params: {
          startBlockId: startForReview,
          blockIds: JSON.stringify(ids),
        },
      });
    })();
  }, [blocks, dataByBlockId, router, sortedTargets, targets]);

  const previewTitleForBlock = useCallback(
    (blockId: string, fallbackCategoryKey?: string) => {
      const b = blocks.find((x) => x.id === blockId);
      const firstLine = b?.title?.trim().split('\n')[0]?.trim() ?? '';
      if (firstLine && !isInternalAutoRoutineLabel(firstLine)) return firstLine;
      if (fallbackCategoryKey) return categoryReminderLabelKo(fallbackCategoryKey);
      return '';
    },
    [blocks],
  );

  const waterDetailUi =
    categoryKey === 'water' && targets.length > 0 && targets.every((t) => t.categoryKey === 'water');
  const workNoteUi =
    targets.length === 1 && categoryKey === 'work' && sortedTargets.length <= 1;
  const readingLibraryUi =
    targets.length === 1 && categoryKey === 'reading' && sortedTargets.length <= 1;
  const customFlowRoutineUi =
    targets.length === 1 && isCustomFlowCategoryKey(categoryKey);
  const contentFlush = waterDetailUi || workNoteUi || readingLibraryUi;
  /** 접기 없이 한 화면에 루틴 설정을 모두 보여 준다 */
  const routineMetaVisible = targets.length === 1;
  const medicineOnlyUi =
    sortedTargets.length === 1 && sortedTargets.every((t) => t.categoryKey === 'medicine');
  const immersive = waterDetailUi ? WATER : null;
  const screenBg = c.bg;
  const headerBg = c.bg;
  const headerBorder = c.border;
  const headerFg = c.onSurface;
  // 프레임 축소·scrollToEnd 없이 content 패딩만 — 중간 TextInput 포커스 시 맨 아래 점프 방지
  const scrollBottomPad =
    Platform.OS === 'ios' && keyboardOpen
      ? Math.max(24, keyboardHeight + 16)
      : workNoteUi
        ? 0
        : 8;

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  const headerTitle = useMemo(() => {
    void categoryLabelEpoch;
    const stored = loadGoalDetailCategoryConfig(categoryKey);
    const storedName = readRoutineDisplayNameFromConfig(stored);
    if (storedName) return storedName;
    return resolveGoalDetailHeaderTitle({
      targets,
      sortedTargets,
      categoryKey,
      dataByBlockId,
      previewTitleForBlock,
    });
  }, [
    categoryLabelEpoch,
    targets,
    sortedTargets,
    categoryKey,
    dataByBlockId,
    previewTitleForBlock,
  ]);

  const singleTarget = targets.length === 1 ? targets[0] : null;
  const singleTargetRenameAccess = singleTarget
    ? resolveRenameAccess(singleTarget.categoryKey)
    : null;

  const handleHeaderDisplayNameChange = useCallback(
    (displayName: string) => {
      if (!singleTarget) return;
      const base = dataByBlockId[singleTarget.blockId];
      const merged = base && typeof base === 'object' ? { ...(base as object) } : {};
      let next: unknown = { ...merged, displayName };
      if (singleTarget.categoryKey === 'healthIntake') {
        next = normalizeHealthIntakeDetailConfig(next);
      }
      handleChangeDataConfig(singleTarget, next);
    },
    [singleTarget, dataByBlockId, handleChangeDataConfig],
  );

  const headerTitleFallback = useMemo(() => {
    if (!singleTarget) return '';
    return resolveRoutineTitleFallback(
      singleTarget.categoryKey,
      previewTitleForBlock(singleTarget.blockId, singleTarget.categoryKey),
    );
  }, [singleTarget, previewTitleForBlock]);

  const settingsPalette = useMemo(() => goalDetailSettingsPalette(false), []);

  const handleGoBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
    router.back();
  }, [router]);

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: screenBg }]}
      darkColor={screenBg}
      lightColor={screenBg}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: headerBg,
              borderBottomColor: headerBorder,
            },
          ]}>
          <Pressable
            onPress={handleGoBack}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={headerFg} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            {singleTarget && singleTargetRenameAccess ? (
              <RoutineTitleField
                value={readRoutineDisplayNameFromConfig(dataByBlockId[singleTarget.blockId])}
                onChangeValue={handleHeaderDisplayNameChange}
                fallback={headerTitleFallback}
                allowRename={singleTargetRenameAccess.allowRename}
                renameLockedReason={singleTargetRenameAccess.renameLockedReason}
                palette={settingsPalette}
                size="header"
                showLockHint={false}
              />
            ) : (
              <ThemedText
                style={[styles.headerTitle, { color: headerFg }]}
                numberOfLines={1}
                accessibilityRole="header">
                {headerTitle}
              </ThemedText>
            )}
          </View>
          {/* 위젯 설정 기능은 현재 계획이 없어 비활성화.
              단, 헤더 `space-between` 레이아웃에서 타이틀 위치가 흔들리지 않도록 오른쪽 자리는 placeholder로 남겨둡니다. */}
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollFlex}
          scrollEnabled={!medicineOnlyUi}
          bounces={!medicineOnlyUi}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: scrollBottomPad,
              backgroundColor: c.bg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}>
          {singleTarget && singleTargetRenameAccess?.renameLockedReason ? (
            <View style={[styles.renameLockBanner, { borderBottomColor: headerBorder }]}>
              <IconSymbol name="lock.fill" size={13} color={c.onVariant} />
              <ThemedText style={[styles.renameLockBannerText, { color: c.onVariant }]}>
                {ROUTINE_RENAME_LOCK_MESSAGES[singleTargetRenameAccess.renameLockedReason]}
              </ThemedText>
            </View>
          ) : null}
          <View
            style={[
              contentFlush ? styles.paddedFlush : styles.padded,
              workNoteUi && styles.paddedWorkNote,
            ]}>
            {sortedTargets.length > 1 ? (
              <View
                style={[
                  styles.startPickerCard,
                  {
                    borderColor: c.border,
                    backgroundColor: RetroFlatColors.light.bgMint,
                  },
                ]}>
                <ThemedText style={[styles.startPickerTitle, { color: c.onSurface }]}>
                  먼저 진행할 루틴
                </ThemedText>
                <ThemedText style={[styles.startPickerSub, { color: c.onVariant }]}>
                  선택한 블록이 체크리스트 맨 위·진행 중으로 표시돼요.
                </ThemedText>
                <View style={styles.startPickerList}>
                  {sortedTargets.map((t) => {
                    const title = previewTitleForBlock(t.blockId, t.categoryKey);
                    const selected = liveActivityChecklistFocusBlockId === t.blockId;
                    return (
                      <Pressable
                        key={t.blockId}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setLiveActivityChecklistFocusBlockId(t.blockId);
                          reconcileLiveActivityFromPlan();
                        }}
                        style={({ pressed }) => [
                          styles.startPickerRow,
                          {
                            borderColor: selected
                              ? immersive?.primary ?? PRIMARY
                              : c.border,
                            backgroundColor: selected
                              ? waterDetailUi
                                ? 'rgba(34,211,238,0.16)'
                                : RetroFlatColors.light.surface
                              : pressed
                                ? 'rgba(0,0,0,0.02)'
                                : 'transparent',
                          },
                        ]}>
                        <View
                          style={[
                            styles.radioOuter,
                            {
                              borderColor: selected
                                ? immersive?.primary ?? PRIMARY
                                : c.outline,
                            },
                          ]}>
                          {selected ? (
                            <View
                              style={[
                                styles.radioInner,
                                immersive && { backgroundColor: immersive.primary },
                              ]}
                            />
                          ) : null}
                        </View>
                        <View style={styles.startPickerRowText}>
                          <ThemedText
                            style={[styles.startPickerRowTitle, { color: c.onSurface }]}
                            numberOfLines={2}>
                            {title}
                          </ThemedText>
                          <ThemedText style={[styles.startPickerRowMeta, { color: c.onVariant }]}>
                            {t.timeLabel}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {targets.map((t, idx) => {
              const dataConfig = dataByBlockId[t.blockId] ?? {};
              const module = resolveGoalDetailModuleForTarget(t.categoryKey, dataConfig);
              const Settings = module.Settings;
              const previewTitle = previewTitleForBlock(t.blockId, t.categoryKey);
              const { allowRename, renameLockedReason } = resolveRenameAccess(t.categoryKey);
              return (
                <View
                  key={`${t.blockId}-${idx}`}
                  style={[
                    styles.blockSection,
                    (workNoteUi || readingLibraryUi || waterDetailUi) && styles.blockSectionFlush,
                  ]}>
                  {isCustomFlowCategoryKey(t.categoryKey) ? (
                    <CustomFlowTemplateMetaPill
                      dataConfig={dataConfig}
                      ink={c.onSurface}
                      line={c.border}
                    />
                  ) : null}
                  <Settings
                    rhythmTitle={previewTitle}
                    categoryKey={t.categoryKey}
                    dataConfig={dataConfig}
                    onChangeDataConfig={(next) => handleChangeDataConfig(t, next)}
                    allowRename={allowRename}
                    renameLockedReason={renameLockedReason}
                    hideTitleField={targets.length === 1}
                  />
                </View>
              );
            })}

            {routineMetaVisible ? (
              <View
                style={[
                  styles.metaSection,
                  contentFlush && styles.metaSectionInset,
                ]}>
                <ThemedText style={[styles.routineMetaSectionTitle, { color: c.onVariant }]}>
                  루틴 설정
                </ThemedText>
                <CustomFlowGroupField
                  groupKey={
                    customFlowGroupByCategoryKey[categoryKey] ??
                    resolveCatalogGroupKeyForSettings(categoryKey)
                  }
                  onChangeGroupKey={(groupKey) => handleChangeCatalogGroup(categoryKey, groupKey)}
                />
                {!isCategoryRunning(categoryKey) ? (
                  <RoutineAppearanceField
                    categoryKey={categoryKey}
                    previewLabel={
                      readRoutineDisplayNameFromConfig(dataByBlockId[targets[0].blockId]) ||
                      previewTitleForBlock(targets[0].blockId, categoryKey)
                    }
                    dataConfig={dataByBlockId[targets[0].blockId]}
                    onChangeDataConfig={(next) => handleChangeDataConfig(targets[0], next)}
                    ink={c.onSurface}
                    muted={c.onVariant}
                  />
                ) : null}
                <RoutineStartNotifyField
                  categoryKey={categoryKey}
                  ink={c.onSurface}
                  muted={c.onVariant}
                  border={c.border}
                />
              </View>
            ) : null}

            {routineMetaVisible && customFlowRoutineUi ? (
            <View
              style={[
                styles.metaSection,
                contentFlush && styles.metaSectionInset,
              ]}>
              <RoutineDeleteButton
                onDelete={() => handleDeleteCustomFlow(categoryKey)}
              />
            </View>
            ) : null}
          </View>
        </ScrollView>
        {keyboardOpen ? null : (
          <View
            pointerEvents="box-none"
            style={[
              styles.footerFixed,
              workNoteUi && styles.footerFixedCompact,
              {
                paddingBottom: Math.max(insets.bottom, workNoteUi ? 4 : 6),
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={waterDetailUi ? '루틴 설정 완료' : '설정 완료'}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleCompleteAndStart();
              }}
              style={({ pressed }) => [
                styles.footerCompleteShell,
                pressed && { opacity: 0.92 },
              ]}>
              {({ pressed }) => (
                <>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.footerCompleteShadow,
                      {
                        backgroundColor: RetroFlatColors.light.text,
                        borderColor: RetroFlatColors.light.border,
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.footerCompleteCircle,
                      {
                        backgroundColor: pressed
                          ? '#8EC8CA'
                          : RetroFlatColors.light.primaryContainer,
                        borderColor: RetroFlatColors.light.border,
                      },
                    ]}>
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      weight="bold"
                      color={RetroFlatColors.light.text}
                    />
                  </View>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scrollFlex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  renameLockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  renameLockBannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  scrollContent: {},
  scrollContentFill: { flexGrow: 1 },  // legacy — kept for compat
  padded: { paddingHorizontal: 20, gap: 18, marginTop: 16 },
  paddedFlush: { paddingHorizontal: 0, gap: 10, marginTop: 0 },
  paddedWorkNote: { gap: 2 },
  blockSection: { gap: 10 },
  blockSectionFlush: { gap: 0, marginTop: 0, paddingTop: 0 },
  blockSectionFlex: { flex: 1, minHeight: 0 },  // legacy
  metaSection: { gap: 10 },
  metaSectionInset: { paddingHorizontal: 20 },
  routineMetaSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.15,
    marginBottom: 2,
  },
  startPickerCard: {
    borderRadius: 0,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  startPickerTitle: { fontSize: 16, fontWeight: '800' },
  startPickerSub: { fontSize: 12, lineHeight: 17 },
  startPickerList: { gap: 8, marginTop: 4 },
  startPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 0,
    backgroundColor: PRIMARY,
  },
  startPickerRowText: { flex: 1, minWidth: 0, gap: 2 },
  startPickerRowTitle: { fontSize: 15, fontWeight: '700' },
  startPickerRowMeta: { fontSize: 12, fontWeight: '600' },
  /** 하단 고정 완료 — 민트 CTA + solid shadow */
  footerCompleteShell: {
    position: 'relative',
    width: 44,
    height: 44,
    marginRight: 3,
    marginBottom: 3,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  footerCompleteShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  footerCompleteCircle: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerFixed: {
    alignItems: 'center',
    paddingTop: 4,
    zIndex: 30,
    elevation: 30,
  },
  footerFixedCompact: {
    paddingTop: 0,
  },
});
