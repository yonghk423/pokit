import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  useDayPlanNotificationStore,
  isDayPlanFlowBlock,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  type DayPlanBlock,
} from '@entities/day-plan';
import { rescheduleDayPlanNotifications } from '@features/day-plan-notifications';
import { reconcileLiveActivityFromPlan } from '@features/live-activity-sync';

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
  if (t === '공부') return 'other';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '휴식') return 'other';
  if (t === '단식') return 'fasting';
  if (t === '수분' || t === '수분섭취') return 'water';
  if (t === '약 복용') return 'medicine';
  return 'other';
}

function toHHmm(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function blockTimeLabel(block: DayPlanBlock): string {
  return `${toHHmm(block.startMinutes)} - ${toHHmm(block.endMinutes)}`;
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** 목표 상세는 항상 라이트(화이트) 기준 UI */
  const c = useMemo(() => palette(false), []);

  const { categoryKey, startBlockId, blockIds } = useGoalDetailSettingsRoute();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
    useDayPlanNotificationStore.getState().hydrate();
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
    void (async () => {
      const dayPlanState = useDayPlanStore.getState();
      useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
        dateKey: dayPlanState.dateKey,
        blocks: dayPlanState.blocks,
      });
      const notifState = useDayPlanNotificationStore.getState();
      await rescheduleDayPlanNotifications({
        dateKey: dayPlanState.dateKey,
        blocks: dayPlanState.blocks,
        settings: notifState.toSettings(),
        completedBlockIds: dayPlanState.completedBlockIds,
        skippedBlockIds: dayPlanState.skippedBlockIds,
      });

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
  }, [router, sortedTargets]);

  const previewTitleForBlock = useCallback(
    (blockId: string) => {
      const b = blocks.find((x) => x.id === blockId);
      const firstLine = b?.title?.trim().split('\n')[0]?.trim() ?? '';
      return firstLine || '플로우';
    },
    [blocks],
  );

  const waterOnlyUi =
    sortedTargets.length > 0 && sortedTargets.every((t) => t.categoryKey === 'water');
  const immersive = waterOnlyUi ? WATER : null;
  const screenBg = c.bg;
  const headerBg = c.bg;
  const headerBorder = c.border;
  const headerFg = c.onSurface;

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: screenBg }]}
      darkColor={screenBg}
      lightColor={screenBg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: headerBg,
              borderBottomColor: headerBorder,
            },
          ]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 48, backgroundColor: c.bg },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.padded, waterOnlyUi && styles.paddedWater]}>
            {sortedTargets.length > 1 ? (
              <View
                style={[
                  styles.startPickerCard,
                  {
                    borderColor: c.border,
                    backgroundColor: 'rgba(0,0,0,0.02)',
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
                                : 'rgba(0,0,0,0.08)'
                              : pressed
                                ? 'rgba(0,0,0,0.04)'
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
            <Pressable
              style={[styles.cta, waterOnlyUi && styles.ctaWater]}
              onPress={handleCompleteAndStart}>
              <ThemedText
                style={[styles.ctaText, waterOnlyUi && styles.ctaTextWater]}
                lightColor={waterOnlyUi ? WATER.ctaText : '#fff'}
                darkColor={waterOnlyUi ? WATER.ctaText : '#fff'}>
                {waterOnlyUi ? '플로우 설정 완료' : '설정 완료'}
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.ctaFootnote, { color: c.outline }]}>
              설정한 시간에 플로우 시작 알림이 도착합니다.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
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
  cta: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaWater: {
    backgroundColor: WATER.ctaBg,
    shadowColor: '#0891b2',
    shadowOpacity: 0.38,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaTextWater: {
    color: WATER.ctaText,
  },
  ctaFootnote: { textAlign: 'center', fontSize: 12, marginTop: -16, lineHeight: 18 },
});
