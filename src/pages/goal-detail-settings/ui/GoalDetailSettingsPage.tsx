import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatBlockTimeRange,
  normalizeMedicineDetailConfig,
  isDayPlanFlowBlock,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  type DayPlanBlock,
} from '@entities/day-plan';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { appendPriorityCategoryKeysIfMissing } from '@pages/day-plan/model/dayPlanDraftStore';
import { rescheduleDayPlanNotifications } from '@features/day-plan-notifications';
import { reconcileLiveActivityFromPlan } from '@features/live-activity-sync';

import { GoalDetailCategoryStartReminderCard } from './GoalDetailCategoryStartReminderCard';
import { useGoalDetailSettingsRoute } from '../model/useGoalDetailSettingsRoute';
import type { GoalDetailCategoryKey } from '../model/types';
import { getGoalDetailCategoryModule } from './category';
import { WATER_GOAL_DETAIL_THEME as WATER } from './category/water/lib/waterGoalDetailTheme';

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
  const t = category.trim();
  if (t === '러닝') return 'other';
  if (t === '업무' || t === '작업') return 'work';
  if (t === '독서') return 'reading';
  if (t === '공부' || t === '공부·학습') return 'study';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '하루·주간 정리' || t === '하루 정리' || t === '주간 정리') return 'planning';
  if (t === '글쓰기') return 'writing';
  if (t === '일기') return 'journal';
  if (t === '언어 학습') return 'language';
  if (t === '회고·점검' || t === '회고') return 'other';
  if (t === '창작·아이디어' || t === '창작') return 'creative';
  if (t === '메일·소통 정리' || t === '메일 정리') return 'inbox';
  if (t === '휴식') return 'other';
  if (t === '단식' || t === '체중관리') return 'fasting';
  if (t === '수분' || t === '수분섭취') return 'water';
  if (t === '약 복용') return 'medicine';
  return 'other';
}

function blockTimeLabel(block: DayPlanBlock): string {
  return formatBlockTimeRange(block);
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** 목표 상세는 항상 라이트(화이트) 기준 UI */
  const c = useMemo(() => palette(false), []);

  const { categoryKey, startBlockId, blockIds } = useGoalDetailSettingsRoute();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);
  const blocks = useDayPlanStore((s) => s.blocks);

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
        categoryKey: inferCategoryKeyFromLabel(b.category),
        timeLabel: blockTimeLabel(b),
      });
    }

    if (rows.length > 0) return rows;
    return [
      {
        blockId: startBlockId?.trim() || 'single',
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

  const [dataByBlockId, setDataByBlockId] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const t of targets) {
      const module = getGoalDetailCategoryModule(t.categoryKey);
      const fallback = module.getInitialDataConfig?.() ?? {};
      const byBlock = loadGoalDetailBlockConfig(t.blockId);
      const byCategory = loadGoalDetailCategoryConfig(t.categoryKey);
      next[t.blockId] = byBlock ?? byCategory ?? fallback;
    }
    setDataByBlockId(next);
  }, [targets]);

  const handleChangeDataConfig = useCallback((target: EditingTarget, next: unknown) => {
    setDataByBlockId((prev) => ({ ...prev, [target.blockId]: next }));
    saveGoalDetailBlockConfig(target.blockId, next);
    // 기존 카테고리 단위 데이터도 함께 갱신(하위 호환)
    saveGoalDetailCategoryConfig(target.categoryKey, next);
  }, []);

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
    appendPriorityCategoryKeysIfMissing([...new Set(keysToAppend)]);
    appendGoalDetailCommittedCategoryKeys(keysToAppend);

    void (async () => {
      const dayPlanState = useDayPlanStore.getState();
      useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
        dateKey: dayPlanState.dateKey,
        blocks: dayPlanState.blocks,
      });
      await rescheduleDayPlanNotifications();

      const ids = sortedTargets.map((t) => t.blockId).filter(Boolean);
      if (ids.length === 0) {
        router.replace('/day-plan');
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
  }, [dataByBlockId, router, sortedTargets, targets]);

  const previewTitleForBlock = useCallback(
    (blockId: string) => {
      const b = blocks.find((x) => x.id === blockId);
      const firstLine = b?.title?.trim().split('\n')[0]?.trim() ?? '';
      return firstLine || '플로우';
    },
    [blocks],
  );

  const reminderCategoryKeys = useMemo(() => {
    const list = sortedTargets.length > 0 ? sortedTargets : targets;
    return [...new Set(list.map((t) => t.categoryKey))];
  }, [sortedTargets, targets]);

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
                    const title = previewTitleForBlock(t.blockId);
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

            {targets.map((t, idx) => {
              const module = getGoalDetailCategoryModule(t.categoryKey);
              const Settings = module.Settings;
              const dataConfig = dataByBlockId[t.blockId] ?? module.getInitialDataConfig?.() ?? {};
              const previewTitle = previewTitleForBlock(t.blockId);
              return (
                <View key={`${t.blockId}-${idx}`} style={styles.blockSection}>
                  <Settings
                    rhythmTitle={previewTitle}
                    dataConfig={dataConfig}
                    onChangeDataConfig={(next) => handleChangeDataConfig(t, next)}
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
