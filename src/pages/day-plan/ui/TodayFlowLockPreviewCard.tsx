import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { DayPlanBlock } from '@entities/day-plan';
import { useDayPlanStore } from '@entities/day-plan';
import { reconcileLiveActivityFromPlan } from '@features/live-activity-sync';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { PRIMARY } from '../lib/dayPlanEditorShared';

function formatHHmm(minutes: number): string {
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

type Props = {
  c: DayPlanPalette;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
};

export function TodayFlowLockPreviewCard({
  c,
  blocks,
  completedBlockIds,
  skippedBlockIds,
}: Props) {
  const router = useRouter();
  const setLiveActivityChecklistFocusBlockId = useDayPlanStore(
    (s) => s.setLiveActivityChecklistFocusBlockId,
  );
  const completed = useMemo(() => new Set(completedBlockIds), [completedBlockIds]);
  const skipped = useMemo(() => new Set(skippedBlockIds), [skippedBlockIds]);

  const ordered = useMemo(
    () =>
      [...blocks].sort((a, b) =>
        a.startMinutes !== b.startMinutes ? a.startMinutes - b.startMinutes : a.order - b.order,
      ),
    [blocks],
  );

  if (ordered.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: c.border,
          backgroundColor: c.containerLow,
          shadowColor: c.shadow,
        },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.dot, { backgroundColor: PRIMARY }]} />
          <ThemedText style={[styles.cardTitle, { color: PRIMARY }]} numberOfLines={1}>
            오늘 플로우 목록
          </ThemedText>
        </View>
        <ThemedText style={[styles.taskCount, { color: c.outline }]}>
          {ordered.length}개
        </ThemedText>
      </View>

      <View style={styles.rows}>
        {ordered.map((block) => {
          const isDone = completed.has(block.id);
          const isSkip = skipped.has(block.id);
          const timeLabel = formatHHmm(block.startMinutes);

          return (
            <Pressable
              key={block.id}
              onPress={() => {
                router.push({
                  pathname: '/activity-session',
                  params: { blockId: block.id },
                });
              }}
              onLongPress={() => {
                if (isDone || isSkip) return;
                Alert.alert(
                  '잠금화면 강조',
                  '이 플로우를 Live Activity 체크리스트에서 맨 위·진행 중으로 표시할까요?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '적용',
                      onPress: () => {
                        setLiveActivityChecklistFocusBlockId(block.id);
                        reconcileLiveActivityFromPlan();
                      },
                    },
                  ],
                );
              }}
              delayLongPress={380}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.85 },
              ]}>
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.leadIcon,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: c.containerLowest,
                    },
                  ]}>
                  {isDone ? (
                    <IconSymbol name="checkmark.circle.fill" size={22} color={PRIMARY} />
                  ) : isSkip ? (
                    <IconSymbol name="minus.circle" size={22} color={c.outline} />
                  ) : (
                    <View style={[styles.leadDot, { backgroundColor: c.outline }]} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <ThemedText
                    style={[
                      styles.rowTitle,
                      {
                        color: isDone ? c.outline : c.onSurface,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}>
                    {block.title.trim() || '플로우'}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.rowMeta,
                      { color: isSkip ? c.outline : c.onVariant },
                    ]}
                    numberOfLines={1}>
                    {isSkip ? `건너뜀 · ${timeLabel}` : timeLabel}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color={c.outline} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.openAppBtn, { backgroundColor: PRIMARY }]}>
        <ThemedText style={styles.openAppBtnText}>앱에서 보기</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 8,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
  },
  taskCount: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  rows: {
    gap: 16,
    marginBottom: 14,
  },
  openAppBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openAppBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  leadIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
});
