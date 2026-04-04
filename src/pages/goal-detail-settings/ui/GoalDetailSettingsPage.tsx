import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
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
  getLocalMinutesOfDayNow,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeMeditationDetailConfig,
  normalizeOtherDetailConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  normalizeRestDetailConfig,
  normalizeRunDetailConfig,
  normalizeStretchDetailConfig,
  normalizeStudyDetailConfig,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  normalizeYogaDetailConfig,
  useDayPlanNotificationStore,
  filterDayPlanFlowBlocks,
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
    bg: '#fafafa',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    border: 'rgba(0,0,0,0.08)',
  };
}

const PRIMARY = 'rgb(249, 115, 22)';

type EditingTarget = {
  blockId: string;
  categoryKey: GoalDetailCategoryKey;
  timeLabel: string;
};

function inferCategoryKeyFromLabel(category: string): GoalDetailCategoryKey {
  const t = category.trim();
  if (t === '러닝') return 'run';
  if (t === '업무') return 'work';
  if (t === '독서') return 'reading';
  if (t === '공부') return 'study';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '휴식') return 'rest';
  if (t === '단식') return 'fasting';
  if (t === '수분') return 'water';
  if (t === '약 복용') return 'medicine';
  if (t === '스트레칭' || t === '피트티스') return 'stretch';
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

function fmtDurationMinForSummary(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}시간` : `${h}시간 ${r}분`;
  }
  return `${m}분`;
}

/** 목표 상세 접기 영역용 한 줄 요약 — 동일 파일에 두어 Metro/React Compiler 분할 번들에서 import 누락 방지 */
function goalDetailSettingsSummaryLine(
  categoryKey: GoalDetailCategoryKey,
  dataConfig: unknown,
): string {
  switch (categoryKey) {
    case 'run': {
      const c = normalizeRunDetailConfig(dataConfig ?? {});
      const place = c.placeName.trim();
      return place
        ? `코스 「${place}」 · 목표 ${c.targetKm}km · ${c.caloriesGoalKcal}kcal`
        : `목표 ${c.targetKm}km · ${c.caloriesGoalKcal}kcal`;
    }
    case 'work': {
      const c = normalizeWorkDetailConfig(dataConfig);
      return `집중 플랜 ${c.planMin}분 · 누적 기록 ${c.doneMin}분`;
    }
    case 'reading': {
      const c = normalizeReadingLiveActivityConfig(dataConfig);
      const n = normalizeReadingMetricSelection(c.selectedMetrics).length;
      const metricHint = n > 0 ? ` · 표시 지표 ${n}개` : '';
      return `페이지 ${c.startPage}p → ${c.targetPage}p${metricHint}`;
    }
    case 'study': {
      const c = normalizeStudyDetailConfig(dataConfig);
      const memo = c.goalMemo.trim();
      return memo ? `메모: ${memo}` : '학습 메모 없음 · 실행 후 카드에 표시할 내용을 적어 주세요';
    }
    case 'meditation': {
      const c = normalizeMeditationDetailConfig(dataConfig);
      return `명상 ${c.sessionMin}분 · 누적 ${c.elapsedMin}분`;
    }
    case 'yoga': {
      const c = normalizeYogaDetailConfig(dataConfig);
      return `「${c.flowLabel}」 ${c.sessionMin}분 · 진행 ${c.elapsedMin}분`;
    }
    case 'rest': {
      const c = normalizeRestDetailConfig(dataConfig);
      return `휴식 ${c.restMin}분 · 누적 ${c.elapsedMin}분`;
    }
    case 'fasting': {
      const c = normalizeFastingDetailConfig(dataConfig);
      return `단식 목표 ${fmtDurationMinForSummary(c.fastingMin)} · 경과 ${fmtDurationMinForSummary(c.elapsedMin)}`;
    }
    case 'water': {
      const c = normalizeWaterDetailConfig(dataConfig);
      return `목표 ${c.goalMl}ml · 섭취 ${c.drankMl}ml`;
    }
    case 'medicine': {
      const c = normalizeMedicineDetailConfig(dataConfig);
      return `「${c.doseLabel}」 하루 ${c.dosesPerDay}회 · 복용 ${c.takenCount}회`;
    }
    case 'stretch': {
      const c = normalizeStretchDetailConfig(dataConfig);
      return `세트 ${c.doneSets}/${c.totalSets} · 홀드 ${c.holdSec}초`;
    }
    case 'other': {
      const c = normalizeOtherDetailConfig(dataConfig);
      const memo = c.memo.trim();
      return memo ? `메모: ${memo}` : '메모 없음 · 실행 중 카드에 표시할 메모를 적어 주세요';
    }
    default:
      return '설정을 확인해 주세요';
  }
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

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
  /** 목표 상세는 기본 접음 — 풀 세션 미리보기는 원할 때만 */
  const [sessionPreviewOpenByBlock, setSessionPreviewOpenByBlock] = useState<Record<string, boolean>>(
    {},
  );

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

      const routeBlockIds = [
        ...(blockIds.length > 0 ? blockIds : []),
        ...(startBlockId?.trim() ? [startBlockId.trim()] : []),
      ];
      const uiBlockIds = sortedTargets.map((t) => t.blockId);
      /** `router.push` 시 넘긴 id 가 스택/직렬화 과정에서 비어도, 편집 중인 블록은 sortedTargets 에 남아 있음 */
      const idSet = new Set([...routeBlockIds, ...uiBlockIds]);
      const candidates = filterDayPlanFlowBlocks(dayPlanState.blocks)
        .filter((b) => idSet.has(b.id))
        .sort((a, b) => a.startMinutes - b.startMinutes);
      const nowMin = getLocalMinutesOfDayNow();
      const focusId = dayPlanState.liveActivityChecklistFocusBlockId;
      const targetBlock =
        (focusId ? candidates.find((b) => b.id === focusId) : undefined) ??
        candidates.find((b) => b.startMinutes >= nowMin) ??
        candidates[0];
      const targetBlockId = targetBlock?.id;

      if (targetBlockId) {
        router.replace({ pathname: '/activity-session', params: { blockId: targetBlockId } });
      } else {
        router.replace('/day-plan');
      }
    })();
  }, [router, startBlockId, blockIds, sortedTargets]);

  const previewTitleForBlock = useCallback(
    (blockId: string) => {
      const b = blocks.find((x) => x.id === blockId);
      const firstLine = b?.title?.trim().split('\n')[0]?.trim() ?? '';
      return firstLine || '플로우';
    },
    [blocks],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? 'rgba(9,9,11,0.92)' : 'rgba(255,255,255,0.92)',
              borderBottomColor: c.border,
            },
          ]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>목표 상세 설정</ThemedText>
          {/* 위젯 설정 기능은 현재 계획이 없어 비활성화.
              단, 헤더 `space-between` 레이아웃에서 타이틀 위치가 흔들리지 않도록 오른쪽 자리는 placeholder로 남겨둡니다. */}
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.padded}>
            <View style={styles.summaryCard}>
              <ThemedText style={[styles.summaryTitle, { color: c.onSurface }]}>
                총 {targets.length}개 플로우 설정
              </ThemedText>
              <ThemedText style={[styles.summarySub, { color: c.onVariant }]}>
                입력은 짧게 — 실행 중 화면에서 타이머·목표 카드가 크게 보여요.
              </ThemedText>
            </View>

            {sortedTargets.length > 1 ? (
              <View style={[styles.startPickerCard, { borderColor: c.border }]}>
                <ThemedText style={[styles.startPickerTitle, { color: c.onSurface }]}>
                  잠금화면에서 먼저 진행할 플로우
                </ThemedText>
                <ThemedText style={[styles.startPickerSub, { color: c.onVariant }]}>
                  선택한 블록이 Live Activity 체크리스트 맨 위·진행 중으로 표시돼요.
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
                            borderColor: selected ? PRIMARY : c.border,
                            backgroundColor: selected
                              ? 'rgba(249,115,22,0.10)'
                              : pressed
                                ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                                : 'transparent',
                          },
                        ]}>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: selected ? PRIMARY : c.outline },
                          ]}>
                          {selected ? <View style={styles.radioInner} /> : null}
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
            ) : sortedTargets.length === 1 ? (
              <View style={[styles.startPickerHint, { backgroundColor: 'rgba(249,115,22,0.08)' }]}>
                <ThemedText style={[styles.startPickerHintText, { color: c.onVariant }]}>
                  잠금화면 체크리스트는 이 플로우를 기준으로 표시돼요.
                </ThemedText>
              </View>
            ) : null}

            {targets.map((t, idx) => {
              const module = getGoalDetailCategoryModule(t.categoryKey);
              const Preview = module.Preview;
              const Settings = module.Settings;
              const dataConfig = dataByBlockId[t.blockId] ?? module.getInitialDataConfig?.() ?? {};
              const previewTitle = previewTitleForBlock(t.blockId);
              const summaryLine = goalDetailSettingsSummaryLine(t.categoryKey, dataConfig);
              const sessionPreviewOpen = sessionPreviewOpenByBlock[t.blockId] === true;
              return (
                <View key={`${t.blockId}-${idx}`} style={styles.blockSection}>
                  <View style={styles.blockSectionHead}>
                    <ThemedText style={[styles.blockOrder, { color: PRIMARY }]}>
                      {idx + 1}
                    </ThemedText>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.blockTitle, { color: c.onSurface }]}>
                        {module.titleKo}
                      </ThemedText>
                      <ThemedText style={[styles.blockSub, { color: c.onVariant }]}>
                        {t.timeLabel}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.compactSummaryCard,
                      {
                        borderColor: c.border,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      },
                    ]}>
                    <ThemedText style={[styles.compactSummaryLine, { color: c.onSurface }]}>
                      {summaryLine}
                    </ThemedText>
                    <ThemedText style={[styles.compactSummaryHint, { color: c.onVariant }]}>
                      실행 중에는 세션 화면에서 큰 타이머와 카드 레이아웃이 적용돼요.
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: sessionPreviewOpen }}
                      onPress={() =>
                        setSessionPreviewOpenByBlock((prev) => ({
                          ...prev,
                          [t.blockId]: !prev[t.blockId],
                        }))
                      }
                      style={({ pressed }) => [
                        styles.sessionPreviewToggle,
                        { opacity: pressed ? 0.72 : 1 },
                      ]}>
                      <ThemedText style={[styles.sessionPreviewToggleText, { color: PRIMARY }]}>
                        {sessionPreviewOpen ? '세션 화면 예시 접기' : '세션 화면 예시 보기'}
                      </ThemedText>
                      <IconSymbol
                        name={sessionPreviewOpen ? 'chevron.up' : 'chevron.down'}
                        size={16}
                        color={PRIMARY}
                      />
                    </Pressable>
                    {sessionPreviewOpen ? (
                      <View style={[styles.sessionPreviewBody, { borderTopColor: c.border }]}>
                        <Preview rhythmTitle={previewTitle} dataConfig={dataConfig} />
                      </View>
                    ) : null}
                  </View>

                  <Settings
                    rhythmTitle={previewTitle}
                    dataConfig={dataConfig}
                    onChangeDataConfig={(next) => handleChangeDataConfig(t, next)}
                  />
                </View>
              );
            })}
            <Pressable style={styles.cta} onPress={handleCompleteAndStart}>
              <ThemedText style={styles.ctaText}>설정 완료</ThemedText>
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
  scrollContent: { paddingBottom: 48 },
  padded: { paddingHorizontal: 24, gap: 22, marginTop: 18 },
  summaryCard: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(249,115,22,0.08)' },
  summaryTitle: { fontSize: 16, fontWeight: '800' },
  summarySub: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  blockSection: { gap: 14, paddingVertical: 8 },
  compactSummaryCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  compactSummaryLine: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  compactSummaryHint: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  sessionPreviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 2,
  },
  sessionPreviewToggleText: { fontSize: 13, fontWeight: '800' },
  sessionPreviewBody: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  blockSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  blockOrder: { fontSize: 22, fontWeight: '900', width: 24, textAlign: 'center' },
  blockTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  blockSub: { fontSize: 12, marginTop: 2 },
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
  startPickerHint: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  startPickerHintText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
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
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaFootnote: { textAlign: 'center', fontSize: 12, marginTop: -16, lineHeight: 18 },
});
