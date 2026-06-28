import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  appendPriorityCategoryKeysIfMissing,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  getInitialOtherDataConfig,
  isCustomFlowCategoryKey,
  isDayPlanFlowBlock,
  isGoalDetailChecklistStyleCategoryKey,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  useDayPlanDraftStore,
  useDayPlanRuntimeStore,
  categoryReminderLabelKo,
  useDayPlanStore,
  type DayPlanBlock,
} from '@entities/day-plan';
import {
  rescheduleDayPlanNotifications,
  syncMedicineReminderNotifications,
} from '@features/day-plan-notifications';
import { reconcileLiveActivityFromPlan } from '@features/live-activity-sync';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  loadPriorityCatalogFixedRoutineKeys,
  removeCustomFlowCatalogId,
  removeGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
  savePriorityCatalogFixedRoutineKeys,
  resolveCatalogItemGroupKey,
  updateCatalogItemGroup,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import type { GoalDetailCategoryKey } from '../model/types';
import { useGoalDetailSettingsRoute } from '../model/useGoalDetailSettingsRoute';
import { getGoalDetailCategoryModule } from './category';
import { CustomFlowGroupField } from './category/other/ui/CustomFlowGroupField';
import { WATER_GOAL_DETAIL_THEME as WATER } from './category/water/lib/waterGoalDetailTheme';
import { GoalDetailCategoryStartReminderCard } from './GoalDetailCategoryStartReminderCard';

function palette(isDark: boolean) {
  if (isDark) {
    return {
      bg: '#09090b',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      border: 'rgba(255,255,255,0.08)',
    };
  }
  return {
    bg: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    border: 'rgba(0,0,0,0.08)',
  };
}

const PRIMARY = 'rgb(0, 0, 0)';

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

/** 블록 저장값이 `{}`처럼 truthy면 `byBlock ?? byCategory`만으로는 카테고리 이름이 가려진다 — 병합한다. */
function mergeOtherStyleGoalDetailData(
  blockRaw: unknown | null,
  categoryRaw: unknown | null,
  fallback: unknown,
): unknown {
  const b = blockRaw != null ? normalizeOtherDetailConfig(blockRaw) : null;
  const c = categoryRaw != null ? normalizeOtherDetailConfig(categoryRaw) : null;
  const dnBlock = (b?.displayName ?? '').trim();
  const dnCat = (c?.displayName ?? '').trim();
  const displayName =
    dnBlock.length > 0 ? b!.displayName : dnCat.length > 0 ? c!.displayName : '';
  const bl = b?.checklist ?? [];
  const cl = c?.checklist ?? [];
  const checklist = bl.length >= cl.length ? bl : cl.length > 0 ? cl : bl;
  return normalizeOtherDetailConfig({ displayName, checklist });
}

function buildLoadedDataByBlockId(targets: EditingTarget[]): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const t of targets) {
    const module = getGoalDetailCategoryModule(t.categoryKey);
    const fallback = module.getInitialDataConfig?.() ?? {};
    const byBlock = loadGoalDetailBlockConfig(t.blockId);
    const byCategory = loadGoalDetailCategoryConfig(t.categoryKey);
    if (
      isGoalDetailChecklistStyleCategoryKey(t.categoryKey) ||
      isCustomFlowCategoryKey(t.categoryKey)
    ) {
      next[t.blockId] = mergeOtherStyleGoalDetailData(byBlock, byCategory, fallback);
    } else {
      next[t.blockId] = byBlock ?? byCategory ?? fallback;
    }
  }
  return next;
}

/** 자동 저장 레이스로 빈 이름이 덮어쓰이는 것을 막는다. */
function withPreservedOtherDisplayName(categoryKey: string, next: unknown): unknown {
  if (categoryKey !== 'other' && !isCustomFlowCategoryKey(categoryKey)) return next;
  const incoming = normalizeOtherDetailConfig(next);
  if (incoming.displayName.trim().length > 0) return incoming;
  const prev = normalizeOtherDetailConfig(
    loadGoalDetailCategoryConfig(categoryKey) ?? getInitialOtherDataConfig(),
  );
  const kept = prev.displayName.trim();
  if (kept.length > 0) {
    return normalizeOtherDetailConfig({ ...incoming, displayName: kept });
  }
  return incoming;
}

function resolveCatalogGroupKeyForSettings(categoryKey: string): string {
  return resolveCatalogItemGroupKey(categoryKey);
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** 목표 상세는 항상 라이트(화이트) 기준 UI */
  const c = useMemo(() => palette(false), []);

  const { categoryKey, startBlockId, blockIds, source } = useGoalDetailSettingsRoute();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
    useDayPlanDraftStore.getState().hydrate();
    registerOtherCategoryResolverFromStorage();
  }, []);
  const blocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const isFocusStarted = useDayPlanDraftStore((s) => s.isFocusStarted);
  const priorityCategoryOrder = useDayPlanDraftStore((s) => s.priorityCategoryOrder);
  const completedFocusCategoryKeys = useDayPlanDraftStore((s) => s.completedFocusCategoryKeys);
  const planCompletionDismissedKeys = useDayPlanDraftStore((s) => s.planCompletionDismissedKeys);

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(blocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key =
        resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [blocks, completedBlockIds, skippedBlockIds]);

  const isCategoryRunning = useCallback(
    (key: string) => {
      if (!isFocusStarted) return false;
      if (!priorityCategoryOrder.includes(key)) return false;
      if (completedFocusCategoryKeys.includes(key)) return false;
      if (planCompletionDismissedKeys.includes(key)) return false;
      if (completedCategoryKeysFromPlan.includes(key)) return false;
      return true;
    },
    [
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      isFocusStarted,
      planCompletionDismissedKeys,
      priorityCategoryOrder,
    ],
  );

  const resolveRenameAccess = useCallback(
    (key: string) => {
      if (source === 'today') {
        return { allowRename: false, renameLockedReason: 'today' as const };
      }
      if (isCategoryRunning(key)) {
        return { allowRename: false, renameLockedReason: 'running' as const };
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
  const [patchByBlockId, setPatchByBlockId] = useState<Record<string, unknown>>({});
  const [customFlowGroupByCategoryKey, setCustomFlowGroupByCategoryKey] = useState<
    Record<string, string>
  >({});
  const medicineReminderSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPatchByBlockId({});
  }, [targets]);

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
    const persisted = withPreservedOtherDisplayName(target.categoryKey, next);
    setPatchByBlockId((prev) => ({ ...prev, [target.blockId]: persisted }));
    saveGoalDetailBlockConfig(target.blockId, persisted);
    saveGoalDetailCategoryConfig(target.categoryKey, persisted);
    if (target.categoryKey === 'other' || isCustomFlowCategoryKey(target.categoryKey)) {
      registerOtherCategoryResolverFromStorage();
      useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
    }
    if (target.categoryKey === 'medicine') {
      if (medicineReminderSyncTimerRef.current) {
        clearTimeout(medicineReminderSyncTimerRef.current);
      }
      medicineReminderSyncTimerRef.current = setTimeout(() => {
        medicineReminderSyncTimerRef.current = null;
        void syncMedicineReminderNotifications();
      }, 450);
    }
    if (target.categoryKey === 'water') {
      useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
    }
  }, []);

  const handleDeleteCustomFlow = useCallback(
    (categoryKey: GoalDetailCategoryKey) => {
      if (!isCustomFlowCategoryKey(categoryKey)) return;
      removeCustomFlowCatalogId(categoryKey);
      removeGoalDetailCategoryConfig(categoryKey);
      const nextFixed = [...new Set(loadPriorityCatalogFixedRoutineKeys().filter((k) => k !== categoryKey))];
      savePriorityCatalogFixedRoutineKeys(nextFixed);
      const draft = useDayPlanDraftStore.getState();
      const nextOrder = draft.priorityCategoryOrder.filter((k) => k !== categoryKey);
      draft.setPriorityCategoryOrder(nextOrder);
      draft.filterCompletedFocusKeysToPriorityOrder(nextOrder);
      registerOtherCategoryResolverFromStorage();
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
    const uniqueKeys = [...new Set(keysToAppend)];

    const hasRealBlockTarget = targets.some((t) =>
      blocks.some((b) => b.id === t.blockId && isDayPlanFlowBlock(b)),
    );
    /** 담기에서 만든 `customFlow:`만 편집한 경우(일정 블록 없음) — 오늘 루틴에 자동 담지 않음 */
    const skipAutoAddToPriorityBag =
      !hasRealBlockTarget &&
      uniqueKeys.length > 0 &&
      uniqueKeys.every((k) => isCustomFlowCategoryKey(k));

    if (!skipAutoAddToPriorityBag) {
      appendPriorityCategoryKeysIfMissing(uniqueKeys);
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
      if (firstLine) return firstLine;
      if (fallbackCategoryKey) return categoryReminderLabelKo(fallbackCategoryKey);
      return '';
    },
    [blocks],
  );

  const reminderCategoryKeys = useMemo(() => {
    const list = sortedTargets.length > 0 ? sortedTargets : targets;
    const keys = [...new Set(list.map((t) => t.categoryKey))].filter(
      (key) => key !== 'water' && key !== 'medicine',
    );
    /** 수분·약은 전용 알림 UI만 사용 — 시작 알림 카드 제외 */
    if (
      categoryKey !== 'water' &&
      categoryKey !== 'medicine' &&
      !keys.includes(categoryKey)
    ) {
      keys.push(categoryKey);
    }
    return keys;
  }, [sortedTargets, targets, categoryKey]);

  const waterOnlyUi =
    sortedTargets.length > 0 && sortedTargets.every((t) => t.categoryKey === 'water');
  const medicineOnlyUi =
    sortedTargets.length === 1 && sortedTargets.every((t) => t.categoryKey === 'medicine');
  const immersive = waterOnlyUi ? WATER : null;
  const screenBg = c.bg;
  const headerBg = c.bg;
  const headerBorder = c.border;
  const headerFg = c.onSurface;
  /** 목표 상세는 라이트 고정 — 하단 탭과 동일 pill 톤 */
  const tabPill = useMemo(() => tabPillColors(false), []);

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

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
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={headerFg} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: headerFg }]}>
            {waterOnlyUi ? '수분섭취 상세 설정' : '목표 상세 설정'}
          </ThemedText>
          {/* 위젯 설정 기능은 현재 계획이 없어 비활성화.
              단, 헤더 `space-between` 레이아웃에서 타이틀 위치가 흔들리지 않도록 오른쪽 자리는 placeholder로 남겨둡니다. */}
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          style={styles.scrollFlex}
          scrollEnabled={!medicineOnlyUi}
          bounces={!medicineOnlyUi}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 20,
              backgroundColor: c.bg,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.padded, waterOnlyUi && styles.paddedWater]}>
            {sortedTargets.length > 1 ? (
              <View
                style={[
                  styles.startPickerCard,
                  {
                    borderColor: c.border,
                    backgroundColor: '#ffffff',
                  },
                ]}>
                <ThemedText style={[styles.startPickerTitle, { color: c.onSurface }]}>
                  먼저 진행할 플로우
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
                              ? waterOnlyUi
                                ? 'rgba(34,211,238,0.16)'
                                : '#ffffff'
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

            {reminderCategoryKeys.map((key) => (
              <GoalDetailCategoryStartReminderCard key={key} categoryKey={key} />
            ))}

            {targets.length === 1 ? (
              <View style={styles.blockSection}>
                <CustomFlowGroupField
                  groupKey={
                    customFlowGroupByCategoryKey[categoryKey] ??
                    resolveCatalogGroupKeyForSettings(categoryKey)
                  }
                  onChangeGroupKey={(groupKey) => handleChangeCatalogGroup(categoryKey, groupKey)}
                />
              </View>
            ) : null}

            {targets.map((t, idx) => {
              const module = getGoalDetailCategoryModule(t.categoryKey);
              const Settings = module.Settings;
              const dataConfig = dataByBlockId[t.blockId] ?? module.getInitialDataConfig?.() ?? {};
              const previewTitle = previewTitleForBlock(t.blockId, t.categoryKey);
              const { allowRename, renameLockedReason } = resolveRenameAccess(t.categoryKey);
              return (
                <View key={`${t.blockId}-${idx}`} style={styles.blockSection}>
                  <Settings
                    rhythmTitle={previewTitle}
                    categoryKey={t.categoryKey}
                    dataConfig={dataConfig}
                    onChangeDataConfig={(next) => handleChangeDataConfig(t, next)}
                    onDeleteCategory={() => handleDeleteCustomFlow(t.categoryKey)}
                    allowRename={allowRename}
                    renameLockedReason={renameLockedReason}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View
          style={[
            styles.footerFixed,
            {
              backgroundColor: c.bg,
              borderTopColor: c.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={waterOnlyUi ? '플로우 설정 완료' : '설정 완료'}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleCompleteAndStart();
            }}
            style={({ pressed }) => [
              styles.footerCompletePill,
              {
                backgroundColor: tabPill.activeBg,
                borderColor: waterOnlyUi ? WATER.primary : tabPill.activeBorder,
              },
              waterOnlyUi && { backgroundColor: WATER.primarySoft },
              pressed && { opacity: 0.92 },
            ]}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={26}
              color={waterOnlyUi ? WATER.primary : tabPill.activeIcon}
            />
          </Pressable>
        </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  scrollContent: {},
  padded: { paddingHorizontal: 24, gap: 22, marginTop: 18 },
  paddedWater: { marginTop: 8, gap: 20 },
  blockSection: { gap: 14, paddingVertical: 8 },
  startPickerCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  startPickerRowText: { flex: 1, minWidth: 0, gap: 2 },
  startPickerRowTitle: { fontSize: 15, fontWeight: '700' },
  startPickerRowMeta: { fontSize: 12, fontWeight: '600' },
  /** `DayPlanCustomTabBar` 의 `tabPill` 과 동일 치수·모서리 */
  footerCompletePill: {
    marginTop: 4,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  footerFixed: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
});
