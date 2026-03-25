import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  CATEGORIES,
  PRIMARY,
  normalizeBlockTimeRange,
  shiftBlockStartToNowKeepingDuration,
  sortBlocksByCategoryOrder,
  type TimeBlock,
} from '../lib/dayPlanEditorShared';
import { TimeRangeTimeline } from './TimeRangeTimeline';

type Props = {
  c: DayPlanPalette;
  cellW: number;
  gridGap: number;
  timeBlocks: TimeBlock[];
  selectedBlockId: string | null;
  onPressCategory: (categoryKey: string) => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlock: (id: string, patch: Partial<Pick<TimeBlock, 'startTime' | 'endTime'>>) => void;
  onRemoveBlock: (id: string) => void;
};

export function TimeBasedPlanSection({
  c,
  cellW,
  gridGap,
  timeBlocks,
  selectedBlockId,
  onPressCategory,
  onSelectBlock,
  onUpdateBlock,
  onRemoveBlock,
}: Props) {
  const sortedBlocks = sortBlocksByCategoryOrder(timeBlocks);
  const selectedBlock =
    selectedBlockId != null ? (timeBlocks.find((b) => b.id === selectedBlockId) ?? null) : null;

  const [localStart, setLocalStart] = useState(selectedBlock?.startTime ?? '09:00');
  const [localEnd, setLocalEnd] = useState(selectedBlock?.endTime ?? '10:00');

  useEffect(() => {
    if (!selectedBlock) return;
    setLocalStart(selectedBlock.startTime);
    setLocalEnd(selectedBlock.endTime);
  }, [selectedBlock?.id, selectedBlock?.startTime, selectedBlock?.endTime]);

  const totalDurationParts = useMemo(() => {
    let totalMin = 0;
    for (const b of timeBlocks) {
      const startMin = parseHHmmToMinutes(b.startTime);
      const endMin = parseHHmmToMinutes(b.endTime);
      if (startMin === null || endMin === null || endMin <= startMin) continue;
      totalMin += endMin - startMin;
    }
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }, [timeBlocks]);

  const commitTimes = (id: string, start: string, end: string) => {
    const n = normalizeBlockTimeRange(start, end);
    if (n) {
      onUpdateBlock(id, n);
    } else {
      const b = timeBlocks.find((x) => x.id === id);
      if (b) {
        setLocalStart(b.startTime);
        setLocalEnd(b.endTime);
      }
    }
  };

  const cat = selectedBlock ? CATEGORIES.find((x) => x.key === selectedBlock.categoryKey) : null;
  const label = cat?.label ?? '리듬';
  const otherBlocks = selectedBlock
    ? sortedBlocks.filter((b) => b.id !== selectedBlock.id)
    : [];

  return (
    <>
      <View style={styles.block}>
        <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>카테고리 선택</ThemedText>
        <ThemedText style={[styles.catHint, { color: c.outline }]}>
          {timeBlocks.length === 0
            ? '먼저 카테고리를 눌러 시간을 설정할 블록을 추가하세요. 추가되면 아래에 시간 설정이 나타납니다.'
            : '카테고리를 누르면 선택·추가되고, 선택된 항목을 한 번 더 누르면 취소(제거)됩니다. 다른 카테고리는 눌러 전환할 수 있어요.'}
        </ThemedText>
        <View style={[styles.catGrid, { gap: gridGap }]}>
          {CATEGORIES.map((catItem) => {
            const blockForCat = timeBlocks.find((b) => b.categoryKey === catItem.key);
            const hasBlock = Boolean(blockForCat);
            const isSelected = Boolean(selectedBlock && blockForCat?.id === selectedBlock.id);
            return (
              <Pressable
                key={catItem.key}
                onPress={() => onPressCategory(catItem.key)}
                style={[
                  styles.catCell,
                  {
                    width: cellW,
                    height: cellW,
                    backgroundColor: hasBlock ? c.containerLowest : c.containerLow,
                    borderColor: isSelected ? PRIMARY : hasBlock ? PRIMARY : c.catBorderIdle,
                    borderWidth: isSelected ? 3 : 2,
                  },
                ]}>
                <IconSymbol
                  name={catItem.icon}
                  size={22}
                  color={hasBlock ? PRIMARY : c.onVariant}
                />
                <ThemedText
                  style={[styles.catLabel, { color: hasBlock ? c.onSurface : c.onVariant }]}>
                  {catItem.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedBlock ? (
        <View style={styles.block}>
          <View style={styles.timeHeaderRow}>
            <ThemedText
              style={[styles.labelUpper, { color: c.onVariant, flexShrink: 1, marginRight: 8 }]}>
              시간 설정
            </ThemedText>
            <View style={styles.durationRow}>
              <ThemedText style={[styles.durationNum, { color: PRIMARY }]}>
                {String(totalDurationParts.h).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={[styles.durationUnit, { color: c.onVariant }]}>시간</ThemedText>
              <ThemedText style={[styles.durationNum, { color: PRIMARY, marginLeft: 6 }]}>
                {String(totalDurationParts.m).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={[styles.durationUnit, { color: c.onVariant }]}>분</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.timeSectionSub, { color: c.outline }]}>
            선택한 블록 · 총 {timeBlocks.length}개 · 하루 타임라인 기준
          </ThemedText>

          {otherBlocks.length > 0 ? (
            <View style={styles.otherRow}>
              <ThemedText style={[styles.otherLabel, { color: c.outline }]}>다른 블록</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {otherBlocks.map((b) => {
                  const cc = CATEGORIES.find((x) => x.key === b.categoryKey);
                  const name = cc?.label ?? '리듬';
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => onSelectBlock(b.id)}
                      style={[styles.chip, { backgroundColor: c.containerLow, borderColor: c.outline }]}>
                      <ThemedText style={[styles.chipText, { color: c.onSurface }]} numberOfLines={1}>
                        {name} {b.startTime}–{b.endTime}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={[styles.timeCardBig, { backgroundColor: c.containerLowest, shadowColor: c.shadow }]}>
            <View style={styles.timeBlockHead}>
              <View style={styles.timeBlockHeadLeft}>
                {cat ? (
                  <View style={[styles.blockIconWrap, { backgroundColor: c.containerLow }]}>
                    <IconSymbol name={cat.icon} size={18} color={PRIMARY} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.blockTitle, { color: c.onSurface }]}>{label}</ThemedText>
                  <ThemedText style={[styles.blockSub, { color: c.outline }]}>
                    시작·종료 시각을 입력하거나 아래 바를 드래그하세요
                  </ThemedText>
                </View>
              </View>
              <Pressable
                accessibilityLabel={`${label} 블록 삭제`}
                hitSlop={8}
                onPress={() => onRemoveBlock(selectedBlock.id)}
                style={styles.blockRemove}>
                <IconSymbol name="trash" size={18} color={c.outline} />
              </Pressable>
            </View>

            <View style={styles.timeRowTop}>
              <View style={styles.timeCol}>
                <View style={styles.timeLabelRow}>
                  <ThemedText style={[styles.timeMicro, { color: c.outline, marginBottom: 0 }]}>
                    시작 시간
                  </ThemedText>
                  <Pressable
                    hitSlop={6}
                    onPress={() => {
                      const next = shiftBlockStartToNowKeepingDuration(
                        selectedBlock.startTime,
                        selectedBlock.endTime,
                      );
                      if (next) {
                        onUpdateBlock(selectedBlock.id, next);
                        setLocalStart(next.startTime);
                        setLocalEnd(next.endTime);
                      }
                    }}>
                    <ThemedText style={[styles.snapNowText, { color: PRIMARY }]}>지금으로</ThemedText>
                  </Pressable>
                </View>
                <TextInput
                  value={localStart}
                  onChangeText={setLocalStart}
                  onBlur={() => commitTimes(selectedBlock.id, localStart, localEnd)}
                  placeholder="09:00"
                  placeholderTextColor={c.outline}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.timeBig, { color: c.onSurface }]}
                />
              </View>
              <View style={[styles.timeDivider, { backgroundColor: c.containerHigh }]} />
              <View style={[styles.timeCol, { alignItems: 'flex-end' }]}>
                <ThemedText style={[styles.timeMicro, { color: c.outline }]}>종료 시간</ThemedText>
                <TextInput
                  value={localEnd}
                  onChangeText={setLocalEnd}
                  onBlur={() => commitTimes(selectedBlock.id, localStart, localEnd)}
                  placeholder="11:30"
                  placeholderTextColor={c.outline}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.timeBig, { color: c.onSurface }]}
                />
              </View>
            </View>

            <TimeRangeTimeline
              startTime={selectedBlock.startTime}
              endTime={selectedBlock.endTime}
              c={c}
              onStartEndChange={(start, end) => {
                onUpdateBlock(selectedBlock.id, { startTime: start, endTime: end });
                setLocalStart(start);
                setLocalEnd(end);
              }}
            />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  labelUpper: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  catCell: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  catLabel: { fontSize: 10, fontWeight: '800' },
  catHint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4, marginBottom: 4 },
  timeSectionSub: { fontSize: 11, fontWeight: '600', paddingHorizontal: 4, marginBottom: 8 },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  /** ThemedText 기본 lineHeight(24)가 남아 큰 숫자가 잘리므로 명시 */
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 0,
    paddingTop: 2,
    paddingBottom: 4,
  },
  durationNum: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  durationUnit: { fontSize: 18, lineHeight: 24, fontWeight: '700', marginLeft: 4 },
  otherRow: { gap: 8, marginBottom: 4 },
  otherLabel: { fontSize: 10, fontWeight: '800', paddingHorizontal: 4 },
  chipScroll: { gap: 8, paddingRight: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  timeCardBig: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    gap: 22,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  timeBlockHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeBlockHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  blockIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  blockSub: { fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 18 },
  blockRemove: { padding: 8 },
  timeRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeCol: { flex: 1, minWidth: 0 },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  snapNowText: { fontSize: 11, fontWeight: '800' },
  timeMicro: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingTop: 2,
  },
  timeBig: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    padding: 0,
    width: '100%',
  },
  timeDivider: { width: 40, height: 2, borderRadius: 999, alignSelf: 'center', marginBottom: 10 },
});
