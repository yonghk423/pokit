import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { DayPlanQuickMemo } from '@entities/day-plan/model/types';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { PRIMARY } from '../lib/dayPlanEditorShared';

type Props = {
  c: DayPlanPalette;
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onToggleDone: (id: string) => void;
  onRemove: (id: string) => void;
};

export function QuickMemoPlanSection({
  c,
  memos,
  draft,
  onChangeDraft,
  onUpdateText,
  onToggleDone,
  onRemove,
}: Props) {
  return (
    <>
      <View style={styles.block}>
        <ThemedText style={[styles.labelUpper, { color: c.onVariant, textAlign: 'center' }]}>
          빠른 메모
        </ThemedText>
        <ThemedText style={[styles.intro, { color: c.outline }]}>
          떠오른 할 일을 빠르게 적어두고, 저장하면 라이브 액티비티 플로우로 반영됩니다.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: c.containerLow }]}>
          {memos.length === 0 ? (
            <ThemedText style={[styles.empty, { color: c.outline }]}>
              아직 메모가 없어요. 아래 입력란에 적고 바로 플로우를 시작해 보세요.
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {memos
                .slice()
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((m) => (
                  <View
                    key={m.id}
                    style={[styles.row, { backgroundColor: c.containerLowest, borderColor: c.border }]}>
                    <View style={styles.rowTop}>
                      <Pressable
                        hitSlop={6}
                        onPress={() => onToggleDone(m.id)}
                        style={[
                          styles.check,
                          { borderColor: m.isDone ? PRIMARY : c.outline },
                          m.isDone && { backgroundColor: 'rgba(249,115,22,0.2)' },
                        ]}>
                        {m.isDone ? (
                          <IconSymbol name="checkmark" size={14} color={PRIMARY} />
                        ) : null}
                      </Pressable>
                      <TextInput
                        value={m.text}
                        onChangeText={(t) => onUpdateText(m.id, t)}
                        placeholder="메모 내용"
                        placeholderTextColor={c.outline}
                        multiline
                        style={[
                          styles.input,
                          { color: c.onSurface },
                          m.isDone && styles.inputDone,
                        ]}
                      />
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable hitSlop={8} onPress={() => onRemove(m.id)}>
                        <IconSymbol name="trash" size={18} color={c.outline} />
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>
          )}

          <View style={[styles.addRow, { borderColor: c.outline, backgroundColor: c.containerLowest }]}>
            <IconSymbol name="square.and.pencil" size={18} color={PRIMARY} />
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              placeholder="메모를 입력하세요"
              placeholderTextColor={c.outline}
              style={[styles.addInput, { color: c.onSurface }]}
            />
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
  intro: { fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 4 },
  card: { borderRadius: 24, padding: 16, gap: 14 },
  empty: { fontSize: 14, lineHeight: 22, textAlign: 'center', paddingVertical: 8 },
  list: { gap: 12 },
  row: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    minHeight: 44,
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  inputDone: { opacity: 0.55, textDecorationLine: 'line-through' },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
  },
  addInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
});
