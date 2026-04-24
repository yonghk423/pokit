import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialWorkDataConfig,
  normalizeWorkDetailConfig,
  type WorkDetailDataConfig,
  type WorkTask,
} from './workConfig';

const PRIMARY = 'rgb(0, 0, 0)';

function makeTaskId() {
  return `wt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function WorkSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const c = useMemo(() => goalDetailSettingsPalette(false), []);

  const initial = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());
  const [tasks, setTasks] = useState<WorkTask[]>(initial.tasks);
  const [focusMemo, setFocusMemo] = useState(initial.focusMemo);
  const [draft, setDraft] = useState('');
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: WorkDetailDataConfig = normalizeWorkDetailConfig({
      planMin: initial.planMin,
      doneMin: initial.doneMin,
      tasks,
      focusMemo,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [tasks, focusMemo, initial.planMin, initial.doneMin, onChangeDataConfig]);

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [...prev, { id: makeTaskId(), text, done: false }]);
    setDraft('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const cardBg = '#ffffff';
  const itemBg = 'rgba(0,0,0,0.03)';
  const itemBorder = 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <ThemedText style={[styles.title, { color: c.onSurface }]}>
          작업 몰입 설정
        </ThemedText>
        <ThemedText style={[styles.sub, { color: c.onVariant }]}>
          이 시간 동안 집중할 작업을 적어 두세요.{'\n'}
          세션 화면에서 체크리스트로 확인할 수 있어요.
        </ThemedText>
      </View>

      <View style={[styles.taskCard, { backgroundColor: cardBg }]}>
        <View style={styles.taskCardHeader}>
          <View style={styles.taskCardHeaderLeft}>
            <IconSymbol name="briefcase.fill" size={20} color={PRIMARY} />
            <ThemedText style={[styles.taskCardTitle, { color: c.onSurface }]}>
              해야 할 작업
            </ThemedText>
          </View>
        </View>

        {tasks.length > 0 ? (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <View
                key={task.id}
                style={[styles.taskRow, { backgroundColor: itemBg, borderColor: itemBorder }]}>
                <Pressable
                  onPress={() => toggleTask(task.id)}
                  hitSlop={6}
                  style={[
                    styles.checkbox,
                    task.done && styles.checkboxDone,
                  ]}>
                  {task.done ? (
                    <IconSymbol name="checkmark" size={12} color="#fff" />
                  ) : null}
                </Pressable>
                <ThemedText
                  style={[
                    styles.taskText,
                    { color: c.onSurface },
                    task.done && styles.taskTextDone,
                  ]}
                  numberOfLines={2}>
                  {task.text}
                </ThemedText>
                <Pressable
                  onPress={() => removeTask(task.id)}
                  hitSlop={8}
                  style={styles.taskRemove}>
                  <IconSymbol name="xmark" size={12} color={c.outline} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyHint, { backgroundColor: itemBg }]}>
            <ThemedText style={[styles.emptyHintText, { color: c.onVariant }]}>
              아래에서 작업을 추가해 주세요.
            </ThemedText>
          </View>
        )}

        <View style={[styles.addRow, { borderColor: itemBorder }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addTask}
            returnKeyType="done"
            placeholder="작업 항목을 입력하세요"
            placeholderTextColor={c.outline}
            style={[styles.addInput, { color: c.onSurface }]}
          />
          <Pressable onPress={addTask} style={styles.addBtn}>
            <IconSymbol name="plus" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.memoSection}>
        <ThemedText style={[styles.sectionLabel, { color: c.onVariant }]}>집중 메모</ThemedText>
        <View style={[styles.memoField, { backgroundColor: itemBg, borderColor: itemBorder }]}>
          <TextInput
            value={focusMemo}
            onChangeText={setFocusMemo}
            placeholder="이 세션에서 특히 집중할 내용을 적어 두세요"
            placeholderTextColor={c.outline}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            style={[styles.memoInput, { color: c.onSurface }]}
          />
        </View>
        <ThemedText style={[styles.memoHint, { color: c.outline }]}>
          세션 진행 중 작업 카드에 함께 표시돼요.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  heading: { gap: 6 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  sub: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  taskCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskCardTitle: { fontSize: 16, fontWeight: '800' },
  taskList: { gap: 8 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  taskText: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20, minWidth: 0 },
  taskTextDone: { textDecorationLine: 'line-through', opacity: 0.45 },
  taskRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHintText: { fontSize: 13, fontWeight: '600' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
    minHeight: 40,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoSection: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
    marginLeft: 2,
  },
  memoField: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
  },
  memoInput: { fontSize: 15, fontWeight: '600', lineHeight: 22, padding: 0 },
  memoHint: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
});
