import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  CATEGORIES,
  PRIMARY,
  amPmKorean,
  displayHour12,
  getPriorityDisplaySections,
  type PriorityTask,
} from '../lib/dayPlanEditorShared';

type Props = {
  c: DayPlanPalette;
  priorityStart: string;
  priorityEnd: string;
  onChangePriorityStart: (v: string) => void;
  onChangePriorityEnd: (v: string) => void;
  /** 눌러서 순서를 만든 카테고리 키 목록 */
  priorityCategoryOrder: string[];
  /** 새 할 일이 붙는 카테고리 */
  priorityCategoryKey: string;
  onSelectCategory: (key: string) => void;
  priorityTasks: PriorityTask[];
  priorityTaskDraft: string;
  onChangePriorityTaskDraft: (v: string) => void;
  onUpdatePriorityTask: (id: string, text: string) => void;
  onRemovePriorityTask: (id: string) => void;
  onAddPriorityTaskRow: () => void;
};

export function PriorityBasedPlanSection({
  c,
  priorityStart,
  priorityEnd,
  onChangePriorityStart,
  onChangePriorityEnd,
  priorityCategoryOrder,
  priorityCategoryKey,
  onSelectCategory,
  priorityTasks,
  priorityTaskDraft,
  onChangePriorityTaskDraft,
  onUpdatePriorityTask,
  onRemovePriorityTask,
  onAddPriorityTaskRow,
}: Props) {
  const sectionsIndexed = useMemo(() => {
    const sections = getPriorityDisplaySections(priorityCategoryOrder, priorityTasks);
    let g = 0;
    return sections.map((s) => ({
      ...s,
      indexedTasks: s.tasks.map((task) => ({ task, globalIndex: g++ })),
    }));
  }, [priorityCategoryOrder, priorityTasks]);

  const activeCatLabel =
    CATEGORIES.find((x) => x.key === priorityCategoryKey)?.label ?? '선택한 항목';

  return (
    <>
      <View style={styles.block}>
        <ThemedText style={[styles.labelUpper, { color: c.onVariant, textAlign: 'center' }]}>
          목표 시간대
        </ThemedText>
        <View style={styles.priorityTargetWrap}>
          <ThemedText style={[styles.targetKicker, { color: c.outline }]}>TARGET WINDOW</ThemedText>
          <View style={styles.priorityTargetTimes}>
            <View style={styles.priorityTimeCol}>
              <TextInput
                value={priorityStart}
                onChangeText={onChangePriorityStart}
                placeholder="09:00"
                placeholderTextColor={c.outline}
                keyboardType="numbers-and-punctuation"
                style={[styles.priorityHeroTime, { color: c.onSurface }]}
              />
              <ThemedText style={[styles.priorityAmPm, { color: c.outline }]}>
                {amPmKorean(priorityStart)} {displayHour12(priorityStart)}
              </ThemedText>
            </View>
            <View style={styles.priorityDashCol} pointerEvents="none">
              <ThemedText style={[styles.priorityDash, { color: c.outline }]}>—</ThemedText>
            </View>
            <View style={styles.priorityTimeCol}>
              <TextInput
                value={priorityEnd}
                onChangeText={onChangePriorityEnd}
                placeholder="12:00"
                placeholderTextColor={c.outline}
                keyboardType="numbers-and-punctuation"
                style={[styles.priorityHeroTime, { color: c.onSurface }]}
              />
              <ThemedText style={[styles.priorityAmPm, { color: c.outline }]}>
                {amPmKorean(priorityEnd)} {displayHour12(priorityEnd)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.targetHintBlock}>
            <ThemedText style={[styles.targetHint, { color: c.outline }]}>
              이 화면에 들어올 때마다 지금 시각 기준(5분 단위)으로 맞춰져요.
            </ThemedText>
            <ThemedText style={[styles.targetHint, { color: c.outline }]}>
              이 시간 안에 아래 목록을 순서대로 끝내면 됩니다.
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.block}>
        <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>카테고리</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.priorityCatScroll}>
          {CATEGORIES.map((cat) => {
            const orderPos = priorityCategoryOrder.indexOf(cat.key);
            const inOrder = orderPos >= 0;
            const active = priorityCategoryKey === cat.key;
            return (
              <Pressable key={cat.key} onPress={() => onSelectCategory(cat.key)} style={styles.priorityCatItem}>
                <View style={styles.priorityCatCircleWrap}>
                  <View
                    style={[
                      styles.priorityCatCircle,
                      {
                        backgroundColor: active ? 'rgba(249,115,22,0.25)' : c.containerLowest,
                        borderWidth: active ? 2 : inOrder ? 1 : 0,
                        borderColor: active ? PRIMARY : inOrder ? 'rgba(249,115,22,0.5)' : 'transparent',
                      },
                    ]}>
                    <IconSymbol name={cat.icon} size={28} color={active ? PRIMARY : c.onVariant} />
                  </View>
                  {inOrder ? (
                    <View style={[styles.catOrderBadge, { borderColor: c.bg }]}>
                      <Text style={styles.catOrderBadgeText}>{orderPos + 1}</Text>
                    </View>
                  ) : null}
                </View>
                <ThemedText
                  style={[styles.priorityCatLabel, { color: active ? PRIMARY : c.onVariant }]}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <ThemedText style={[styles.catFlowHint, { color: c.outline }]}>
          카테고리를 누른 순서가 플로 순서가 됩니다. 같은 칸을 다시 누르면 아래에 추가되는 항목만 그 카테고리로 들어갑니다.
        </ThemedText>
      </View>

      <View style={styles.block}>
        <View style={styles.priorityFlowHeader}>
          <ThemedText style={[styles.priorityFlowTitle, { color: c.onSurface }]}>우선순위 플로</ThemedText>
          <ThemedText style={[styles.priorityFlowCount, { color: c.outline }]}>
            총 {priorityTasks.filter((t) => t.title.trim()).length}개 작업
          </ThemedText>
        </View>
        <View style={styles.priorityTaskList}>
          {sectionsIndexed.map((section) => (
            <View key={section.categoryKey} style={styles.prioritySection}>
              <View style={styles.prioritySectionHeader}>
                <ThemedText style={[styles.prioritySectionTitle, { color: c.onSurface }]}>
                  {section.label}
                </ThemedText>
                <ThemedText style={[styles.prioritySectionMeta, { color: c.outline }]}>
                  {section.tasks.filter((t) => t.title.trim()).length}개
                </ThemedText>
              </View>
              {section.indexedTasks.length === 0 ? (
                <ThemedText style={[styles.prioritySectionEmpty, { color: c.outline }]}>
                  이 순서에 맞춰 할 일을 추가해 보세요.
                </ThemedText>
              ) : (
                section.indexedTasks.map(({ task, globalIndex }) => {
                  const leftBorder = globalIndex === 0 ? PRIMARY : '#fdba74';
                  const isFirst = globalIndex === 0;
                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.priorityTaskRow,
                        { backgroundColor: c.containerLowest, borderLeftColor: leftBorder },
                      ]}>
                      <View
                        style={[
                          styles.priorityIndex,
                          {
                            backgroundColor: isFirst ? 'rgba(249,115,22,0.12)' : c.containerLow,
                          },
                        ]}>
                        <ThemedText
                          style={[
                            styles.priorityIndexText,
                            { color: isFirst ? PRIMARY : c.outline },
                          ]}>
                          {globalIndex + 1}
                        </ThemedText>
                      </View>
                      <TextInput
                        value={task.title}
                        onChangeText={(t) => onUpdatePriorityTask(task.id, t)}
                        placeholder="할 일을 입력하세요"
                        placeholderTextColor={c.outline}
                        style={[styles.priorityTaskInput, { color: c.onSurface }]}
                      />
                      <IconSymbol name="ellipsis" size={20} color={c.outline} />
                      {priorityTasks.length > 1 ? (
                        <Pressable hitSlop={8} onPress={() => onRemovePriorityTask(task.id)}>
                          <IconSymbol name="trash" size={18} color={c.outline} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          ))}
          <View style={[styles.priorityAddRow, { borderColor: c.outline }]}>
            <IconSymbol name="plus" size={18} color={c.outline} />
            <TextInput
              value={priorityTaskDraft}
              onChangeText={onChangePriorityTaskDraft}
              onSubmitEditing={onAddPriorityTaskRow}
              placeholder={`「${activeCatLabel}」에 추가...`}
              placeholderTextColor={c.outline}
              style={[styles.priorityAddInput, { color: c.onSurface }]}
            />
            <Pressable
              onPress={onAddPriorityTaskRow}
              disabled={!priorityTaskDraft.trim()}
              style={styles.priorityAddSubmit}>
              <ThemedText style={{ color: PRIMARY, fontWeight: '800', fontSize: 13 }}>추가</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
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
  priorityTargetWrap: { alignItems: 'center', gap: 10, paddingVertical: 8, width: '100%' },
  targetKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  priorityTargetTimes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  priorityTimeCol: {
    flex: 1,
    minWidth: 0,
    maxWidth: 148,
    alignItems: 'center',
  },
  priorityHeroTime: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
    padding: 0,
    width: '100%',
    textAlign: 'center',
  },
  priorityAmPm: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  priorityDashCol: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  priorityDash: { fontSize: 28, fontWeight: '300', lineHeight: 32, textAlign: 'center' },
  targetHintBlock: {
    alignSelf: 'stretch',
    gap: 6,
    paddingHorizontal: 8,
    maxWidth: 400,
    alignItems: 'center',
  },
  targetHint: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', width: '100%' },
  priorityCatScroll: {
    gap: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 8,
    paddingLeft: 2,
  },
  catFlowHint: { fontSize: 11, fontWeight: '600', paddingHorizontal: 4, marginTop: 2, lineHeight: 16 },
  priorityCatItem: { alignItems: 'center', gap: 8, width: 72 },
  priorityCatCircleWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catOrderBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  catOrderBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: Platform.OS === 'ios' ? 13 : 14,
    textAlign: 'center',
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : {}),
  },
  priorityCatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCatLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  priorityFlowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  priorityFlowTitle: { fontSize: 18, fontWeight: '800' },
  priorityFlowCount: { fontSize: 11, fontWeight: '600' },
  prioritySection: { gap: 8 },
  prioritySectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  prioritySectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  prioritySectionMeta: { fontSize: 11, fontWeight: '600' },
  prioritySectionEmpty: { fontSize: 12, fontStyle: 'italic', paddingVertical: 8, paddingHorizontal: 4 },
  priorityTaskList: { gap: 14 },
  priorityTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  priorityIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityIndexText: { fontSize: 14, fontWeight: '800' },
  priorityTaskInput: { flex: 1, fontSize: 15, fontWeight: '700', padding: 0 },
  priorityAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  priorityAddInput: { flex: 1, fontSize: 14, fontWeight: '600', padding: 0 },
  priorityAddSubmit: { paddingHorizontal: 8, paddingVertical: 4 },
});
