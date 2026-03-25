import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  CATEGORIES,
  PRIMARY,
  amPmKorean,
  displayHour12,
  type PriorityTask,
} from '../lib/dayPlanEditorShared';

type Props = {
  c: DayPlanPalette;
  priorityStart: string;
  priorityEnd: string;
  onChangePriorityStart: (v: string) => void;
  onChangePriorityEnd: (v: string) => void;
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
  priorityCategoryKey,
  onSelectCategory,
  priorityTasks,
  priorityTaskDraft,
  onChangePriorityTaskDraft,
  onUpdatePriorityTask,
  onRemovePriorityTask,
  onAddPriorityTaskRow,
}: Props) {
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
            <ThemedText style={[styles.priorityDash, { color: c.outline }]}>—</ThemedText>
            <View style={[styles.priorityTimeCol, { alignItems: 'flex-end' }]}>
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
          <ThemedText style={[styles.targetHint, { color: c.outline }]}>
            이 시간 안에 아래 목록을 순서대로 끝내면 됩니다.
          </ThemedText>
        </View>
      </View>

      <View style={styles.block}>
        <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>카테고리</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.priorityCatScroll}>
          {CATEGORIES.map((cat) => {
            const active = priorityCategoryKey === cat.key;
            return (
              <Pressable key={cat.key} onPress={() => onSelectCategory(cat.key)} style={styles.priorityCatItem}>
                <View
                  style={[
                    styles.priorityCatCircle,
                    {
                      backgroundColor: active ? 'rgba(249,115,22,0.25)' : c.containerLowest,
                      borderWidth: active ? 2 : 0,
                      borderColor: active ? PRIMARY : 'transparent',
                    },
                  ]}>
                  <IconSymbol name={cat.icon} size={28} color={active ? PRIMARY : c.onVariant} />
                </View>
                <ThemedText
                  style={[styles.priorityCatLabel, { color: active ? PRIMARY : c.onVariant }]}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.block}>
        <View style={styles.priorityFlowHeader}>
          <ThemedText style={[styles.priorityFlowTitle, { color: c.onSurface }]}>우선순위 플로</ThemedText>
          <ThemedText style={[styles.priorityFlowCount, { color: c.outline }]}>
            총 {priorityTasks.filter((t) => t.title.trim()).length}개 작업
          </ThemedText>
        </View>
        <View style={styles.priorityTaskList}>
          {priorityTasks.map((task, idx) => {
            const leftBorder = idx === 0 ? PRIMARY : '#fdba74';
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
                      backgroundColor: idx === 0 ? 'rgba(249,115,22,0.12)' : c.containerLow,
                    },
                  ]}>
                  <ThemedText
                    style={[styles.priorityIndexText, { color: idx === 0 ? PRIMARY : c.outline }]}>
                    {idx + 1}
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
          })}
          <View style={[styles.priorityAddRow, { borderColor: c.outline }]}>
            <IconSymbol name="plus" size={18} color={c.outline} />
            <TextInput
              value={priorityTaskDraft}
              onChangeText={onChangePriorityTaskDraft}
              onSubmitEditing={onAddPriorityTaskRow}
              placeholder="다음 우선순위 추가..."
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
  priorityTargetWrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  targetKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  priorityTargetTimes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  priorityTimeCol: { flex: 1, minWidth: 0 },
  priorityHeroTime: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    padding: 0,
    textAlign: 'center',
  },
  priorityAmPm: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  priorityDash: { fontSize: 28, fontWeight: '300', marginTop: 8 },
  targetHint: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 12 },
  priorityCatScroll: { gap: 16, paddingVertical: 8, paddingRight: 8 },
  priorityCatItem: { alignItems: 'center', gap: 8, width: 72 },
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
  priorityTaskList: { gap: 10 },
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
