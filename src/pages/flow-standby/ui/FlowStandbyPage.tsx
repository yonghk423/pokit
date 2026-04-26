import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  blockDurationSec,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  formatMinuteOfDayKo,
  getLocalMinutesOfDayNow,
  useDayPlanRuntimeStore,
} from '@entities/day-plan';
import { useDayPlanStore } from '@entities/day-plan';
import { endLockFlowLiveActivity, useLiveActivitySync } from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const PRIMARY = 'rgb(0, 0, 0)';

function pickParam(value: string | string[] | undefined, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return fallback;
}

export function FlowStandbyPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ blockId?: string }>();
  const blockId = pickParam(params.blockId, '');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#f1f5f9' : '#0f172a';

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  const dateKey = useDayPlanStore((s) => s.dateKey);
  const blocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const block = useMemo(
    () => {
      const flowBlocks = filterDayPlanFlowBlocks(blocks);
      const direct = blockId ? flowBlocks.find((b) => b.id === blockId) : undefined;
      if (direct) return direct;

      const done = new Set([...completedBlockIds, ...skippedBlockIds]);
      const nowMin = getLocalMinutesOfDayNow();
      const pending = flowBlocks
        .filter((b) => !done.has(b.id))
        .sort((a, b) => a.startMinutes - b.startMinutes);
      return pending.find((b) => b.startMinutes >= nowMin) ?? pending[0];
    },
    [blocks, blockId, completedBlockIds, skippedBlockIds],
  );

  const startMinutes = block?.startMinutes ?? 0;
  const title = block?.title?.split('\n')[0]?.trim() ?? '';
  const category = block?.category ?? '';
  const timeRange = block ? formatBlockTimeRange(block) : '';
  const durationMin = block ? Math.round(blockDurationSec(block) / 60) : 0;
  const startTimeLabel = formatMinuteOfDayKo(startMinutes);
  const nowMs = useDayPlanRuntimeStore((s) => s.nowMs);
  const timelineByBlockId = useDayPlanRuntimeStore((s) => s.timelineByBlockId);
  const setActiveBlockId = useDayPlanRuntimeStore((s) => s.setActiveBlockId);
  const setLiveActivityChecklistFocusBlockId = useDayPlanStore((s) => s.setLiveActivityChecklistFocusBlockId);
  const startTicker = useDayPlanRuntimeStore((s) => s.startTicker);
  const stopTicker = useDayPlanRuntimeStore((s) => s.stopTicker);
  const runtimeTiming = block ? timelineByBlockId[block.id] : undefined;
  const startAtMs = runtimeTiming?.startAtMs ?? null;

  /** hydrate/재진입 후에도 오늘 `dateKey` 기준 타임라인을 보장한다. */
  useEffect(() => {
    if (!dateKey || blocks.length === 0 || !block) return;
    const runtime = useDayPlanRuntimeStore.getState();
    const timing = runtime.timelineByBlockId[block.id];
    const dayMismatch = runtime.sessionDateKey !== dateKey;
    if (!timing || dayMismatch) {
      runtime.buildTimelineFromBlocks({ dateKey, blocks });
    }
  }, [dateKey, blocks, block?.id]);

  /** 대기 화면에서는 잠금화면 카드를 띄우지 않음. 예약 시각 전에는 이전 Live Activity를 정리한다. */
  useLiveActivitySync(null);
  useEffect(() => {
    if (!block || startAtMs == null) return;
    if (Date.now() >= startAtMs) return;
    void endLockFlowLiveActivity(block.id);
  }, [block?.id, startAtMs]);

  useEffect(() => {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console -- Live Activity 디버그
    console.log('[LockFlowLA] FlowStandby: 대기 중 Live Activity 없음', {
      hasBlock: Boolean(block),
      startAtMs,
      dateKey,
      timelineKeys: Object.keys(useDayPlanRuntimeStore.getState().timelineByBlockId),
    });
  }, [block, startAtMs, dateKey]);

  const navigatedRef = useRef(false);

  useEffect(() => {
    startTicker();
    return () => stopTicker();
  }, [startTicker, stopTicker]);

  useEffect(() => {
    setActiveBlockId(block?.id ?? null);
  }, [block?.id, setActiveBlockId]);

  useEffect(() => {
    if (block?.id) setLiveActivityChecklistFocusBlockId(block.id);
  }, [block?.id, setLiveActivityChecklistFocusBlockId]);

  /** 정해진 시작 시각 이후 세션으로 이동 (카운트다운 UI 없이 실행 시점만 검증할 때 동일 로직). */
  useEffect(() => {
    if (!block || startAtMs == null) return;
    if (nowMs < startAtMs) return;
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace({ pathname: '/activity-session', params: { blockId: block.id } });
  }, [block, router, startAtMs, nowMs]);

  const handleStartNow = useCallback(() => {
    if (!block || navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace({ pathname: '/activity-session', params: { blockId: block.id } });
  }, [block, router]);

  const handleCancel = useCallback(() => {
    if (block?.id) void endLockFlowLiveActivity(block.id);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/day-plan');
    }
  }, [block?.id, router]);

  if (!block) {
    return (
      <ThemedView style={[styles.screen, { backgroundColor: bg }]} darkColor={bg} lightColor={bg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centerContent}>
            <ThemedText style={[styles.emptyText, { color: muted }]}>
              대기할 플로우를 찾을 수 없습니다.
            </ThemedText>
            <Pressable style={[styles.secondaryBtn, { borderColor: border }]} onPress={handleCancel}>
              <ThemedText style={[styles.secondaryBtnText, { color: text }]}>돌아가기</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]} darkColor={bg} lightColor={bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={8} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={22} color={text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: text }]}>플로우 대기</ThemedText>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.centerContent}>
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.categoryLabel, { color: muted }]}>{category}</ThemedText>
            {title ? (
              <ThemedText style={[styles.flowTitle, { color: text }]} numberOfLines={2}>
                {title}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.timeRange, { color: muted }]}>{timeRange}</ThemedText>
            <ThemedText style={[styles.durationLabel, { color: muted }]}>
              {durationMin}분 플로우
            </ThemedText>
          </View>

          <View style={styles.hintArea}>
            <ThemedText style={[styles.hintLabel, { color: muted }]}>
              {startTimeLabel}에 자동으로 플로우가 시작됩니다.
            </ThemedText>
            <ThemedText style={[styles.hintSub, { color: muted }]}>
              잠금화면에는 예정 시작 시각에 플로우가 표시됩니다. (앱이 켜져 있을 때 알림과 함께 갱신)
            </ThemedText>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <Pressable style={styles.primaryBtn} onPress={handleStartNow}>
            <ThemedText style={styles.primaryBtnText}>지금 바로 시작</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: border }]}
            onPress={handleCancel}>
            <ThemedText style={[styles.secondaryBtnText, { color: muted }]}>취소</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  categoryLabel: { fontSize: 13, fontWeight: '500' },
  flowTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  timeRange: { fontSize: 14, marginTop: 4 },
  durationLabel: { fontSize: 13 },
  hintArea: { alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 8 },
  hintLabel: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  hintSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  bottomActions: { paddingHorizontal: 24, paddingBottom: 8, gap: 10 },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  emptyText: { fontSize: 15, marginBottom: 20 },
});
