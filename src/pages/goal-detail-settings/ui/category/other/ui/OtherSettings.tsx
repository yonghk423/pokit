import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
  type OtherDetailDataConfig,
} from './otherConfig';

export function OtherSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());

  const [draftTask, setDraftTask] = useState('');
  const [checklist, setChecklist] = useState(initial.checklist);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    setChecklist(initial.checklist);
  }, [dataConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const payload: OtherDetailDataConfig = normalizeOtherDetailConfig({ checklist });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [checklist, onChangeDataConfig]);

  const addTask = () => {
    const text = draftTask.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `other_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        text,
        done: false,
      },
    ]);
    setDraftTask('');
  };

  const buildShareText = () => {
    return checklist
      .filter((x) => x.text.trim().length > 0)
      .map((x, i) => `${i + 1}. ${x.done ? '[완료] ' : ''}${x.text.trim()}`)
      .join('\n');
  };

  const onShare = async () => {
    const content = buildShareText();
    if (!content) {
      Alert.alert('공유할 내용 없음', '체크리스트를 먼저 입력해 주세요.');
      return;
    }
    await Share.share({
      message: `LockFlow 사용자 플로우\n\n${content}`,
    });
  };

  const doneCount = checklist.filter((x) => x.done).length;
  const pendingCount = checklist.length - doneCount;

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <ThemedText style={[styles.brand, { color: c.onSurface }]}>LOCKFLOW OTHER</ThemedText>
      </View>

      <View style={styles.about}>
        <ThemedText style={[styles.sectionKicker, { color: c.onVariant }]}>ABOUT TOOLS</ThemedText>
        <ThemedText style={[styles.aboutText, { color: c.onSurface }]}>
          체크리스트, 복사본 생성, 공유 기능으로 사용자 플로우를 디테일하게 운영할 수 있어요.
        </ThemedText>
      </View>

      <View style={styles.listHeader}>
        <ThemedText style={[styles.sectionKicker, { color: c.onVariant }]}>TOOLS ||</ThemedText>
        <ThemedText style={[styles.mainTitle, { color: c.onSurface }]}>Tasks</ThemedText>
      </View>

      <View style={[styles.toolbar, { borderTopColor: c.onSurface, borderBottomColor: c.outline }]}>
        <Pressable style={styles.toolbarBtn} onPress={onShare}>
          <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
          <ThemedText style={[styles.toolbarText, { color: c.onSurface }]}>공유</ThemedText>
        </Pressable>
        <ThemedText style={[styles.counter, { color: c.onVariant }]}>
          완료 {doneCount} · 남음 {pendingCount}
        </ThemedText>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draftTask}
          onChangeText={setDraftTask}
          placeholder="작업 항목을 입력하고 추가"
          placeholderTextColor={c.outline}
          style={[styles.taskInput, { color: c.onSurface, borderBottomColor: c.outline }]}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <Pressable onPress={addTask} style={[styles.addBtn, { borderColor: c.onSurface }]}>
          <ThemedText style={[styles.addBtnText, { color: c.onSurface }]}>ADD</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.list, { borderTopColor: c.onSurface }]}>
        {checklist.map((task) => (
          <View key={task.id} style={[styles.row, { borderBottomColor: c.outline }]}>
            <Pressable
              onPress={() =>
                setChecklist((prev) =>
                  prev.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)),
                )
              }
              style={styles.rowTextWrap}>
              <ThemedText
                style={[
                  styles.rowTitle,
                  { color: task.done ? c.onVariant : c.onSurface },
                  task.done && styles.rowTitleDone,
                ]}>
                {task.text}
              </ThemedText>
            </Pressable>
            <View style={styles.rowActions}>
              <Pressable
                onPress={() =>
                  setChecklist((prev) => [
                    ...prev,
                    { ...task, id: `copy_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`, done: false },
                  ])
                }
                style={styles.iconBtn}>
                <IconSymbol name="doc.on.doc" size={17} color={c.onSurface} />
              </Pressable>
              <Pressable
                onPress={() => setChecklist((prev) => prev.filter((x) => x.id !== task.id))}
                style={styles.iconBtn}>
                <IconSymbol name="trash" size={17} color={c.onVariant} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 18, paddingVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  about: { gap: 8 },
  sectionKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  aboutText: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  toolbar: {
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolbarText: { fontSize: 13, fontWeight: '700' },
  counter: { fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  taskInput: { flex: 1, borderBottomWidth: 1, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
  addBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  list: { borderTopWidth: 1 },
  row: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTextWrap: { flex: 1, paddingVertical: 10, paddingRight: 8 },
  rowTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
