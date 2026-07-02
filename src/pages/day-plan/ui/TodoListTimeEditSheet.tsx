import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutesToHHmm, parseHHmmToMinutes } from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

import { TODO_LIST_BORDER, TODO_LIST_CREAM, TODO_LIST_INK } from '../lib/todoListTheme';

type Props = {
  visible: boolean;
  startMinutes: number;
  endMinutes: number;
  onClose: () => void;
  onSave: (startMinutes: number, endMinutes: number) => void;
};

function minutesToInput(minutes: number): string {
  return formatMinutesToHHmm(minutes);
}

function parseTimeInput(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return fallback;
  const parsed = parseHHmmToMinutes(trimmed);
  return parsed != null && Number.isFinite(parsed) ? parsed : fallback;
}

/** 투두 행 — 시작·종료 시각 편집 */
export function TodoListTimeEditSheet({
  visible,
  startMinutes,
  endMinutes,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [startText, setStartText] = useState(minutesToInput(startMinutes));
  const [endText, setEndText] = useState(minutesToInput(endMinutes));

  useEffect(() => {
    if (!visible) return;
    setStartText(minutesToInput(startMinutes));
    setEndText(minutesToInput(endMinutes));
  }, [visible, startMinutes, endMinutes]);

  const handleSave = useCallback(() => {
    const start = parseTimeInput(startText, startMinutes);
    let end = parseTimeInput(endText, endMinutes);
    if (end <= start) end = Math.min(24 * 60, start + 15);
    onSave(start, end);
    onClose();
  }, [startText, endText, startMinutes, endMinutes, onSave, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: TODO_LIST_CREAM,
              borderColor: TODO_LIST_BORDER,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText style={styles.title} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
            시간 조절
          </ThemedText>
          <View style={styles.row}>
            <View style={styles.field}>
              <ThemedText style={styles.label} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
                시작
              </ThemedText>
              <TextInput
                value={startText}
                onChangeText={setStartText}
                placeholder="09:00"
                placeholderTextColor="rgba(17,17,17,0.35)"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { borderColor: TODO_LIST_BORDER, color: TODO_LIST_INK }]}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.label} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
                종료
              </ThemedText>
              <TextInput
                value={endText}
                onChangeText={setEndText}
                placeholder="10:00"
                placeholderTextColor="rgba(17,17,17,0.35)"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { borderColor: TODO_LIST_BORDER, color: TODO_LIST_INK }]}
              />
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.btn, styles.btnGhost, { borderColor: TODO_LIST_BORDER }]}>
              <ThemedText style={styles.btnText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
                취소
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={[styles.btn, styles.btnPrimary, { borderColor: TODO_LIST_BORDER, backgroundColor: TODO_LIST_INK }]}>
              <ThemedText style={[styles.btnText, styles.btnPrimaryText]} lightColor="#FAFAFA" darkColor="#FAFAFA">
                저장
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheet: {
    borderWidth: 1.5,
    borderRadius: 0,
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#FFFCF6',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    borderWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnPrimary: {},
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimaryText: {},
});
