import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { isCustomFlowCategoryKey } from '@entities/day-plan';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
  type OtherDetailDataConfig,
} from './otherConfig';
import { CustomFlowGroupField } from './CustomFlowGroupField';

export function OtherSettings({
  dataConfig,
  onChangeDataConfig,
  categoryKey,
  onDeleteCategory,
  customFlowGroupKey,
  onChangeCustomFlowGroupKey,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  onDeleteCategory?: () => void;
  customFlowGroupKey?: string;
  onChangeCustomFlowGroupKey?: (groupKey: string) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [draftTask, setDraftTask] = useState('');
  const [checklist, setChecklist] = useState(initial.checklist);
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);

  useEffect(() => {
    const next = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
    isSyncingFromPropsRef.current = true;
    setDisplayName(next.displayName);
    setChecklist(next.checklist);
    lastPersistedRef.current = JSON.stringify(next);
  }, [dataConfig]);

  /** 입력란에는 저장된 이름만 둔다. 내부 ID 기반 구분명은 담기 목록에서만 쓰며, 값으로 넣으면 ‘자동 생성된 이름’처럼 보인다. */
  const categoryNameHint = useMemo(() => {
    if (categoryKey && isCustomFlowCategoryKey(categoryKey)) {
      return '이름을 비워 두면 담기·일정에는 내부 구분용 이름(플로우 ···)으로 보여요. 원하면 여기서 직접 이름을 정할 수 있어요.';
    }
    return '비워 두면 담기·일정에는 「플로우 직접 설정」으로 보여요.';
  }, [categoryKey]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload: OtherDetailDataConfig = normalizeOtherDetailConfig({ displayName, checklist });
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfig(payload);
  }, [displayName, checklist, onChangeDataConfig]);

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
      message: `POKIT 사용자 플로우\n\n${content}`,
    });
  };

  return (
    <View style={styles.shell}>
      <View style={styles.nameBlock}>
        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>카테고리 이름</ThemedText>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="이 카테고리에 붙일 이름"
          placeholderTextColor={c.outline}
          style={[styles.nameInput, { color: c.onSurface, borderBottomColor: c.outline }]}
          maxLength={40}
          returnKeyType="done"
        />
        <ThemedText style={[styles.nameHint, { color: c.onVariant }]}>{categoryNameHint}</ThemedText>
        {categoryKey && isCustomFlowCategoryKey(categoryKey) && customFlowGroupKey && onChangeCustomFlowGroupKey ? (
          <CustomFlowGroupField
            groupKey={customFlowGroupKey}
            onChangeGroupKey={onChangeCustomFlowGroupKey}
          />
        ) : null}
        {categoryKey && isCustomFlowCategoryKey(categoryKey) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="루틴 삭제"
            onPress={() => {
              Alert.alert(
                '루틴 삭제',
                '이 플로우를 삭제할까요? 담기·나만의 루틴과 설정에서 함께 제거됩니다.',
                [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => onDeleteCategory?.(),
                  },
                ],
              );
            }}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                borderColor: 'rgba(239,68,68,0.42)',
                backgroundColor: pressed ? 'rgba(239,68,68,0.08)' : 'transparent',
              },
            ]}>
            <ThemedText style={styles.deleteBtnText}>루틴 삭제</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listHeader}>
        <ThemedText style={[styles.mainTitle, { color: c.onSurface }]}>Tasks</ThemedText>
      </View>

      <View style={[styles.toolbar, { borderTopColor: c.onSurface, borderBottomColor: c.outline }]}>
        <Pressable style={styles.toolbarBtn} onPress={onShare}>
          <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
          <ThemedText style={[styles.toolbarText, { color: c.onSurface }]}>공유</ThemedText>
        </Pressable>
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
  nameBlock: { gap: 8, paddingTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  nameHint: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  deleteBtn: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
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
