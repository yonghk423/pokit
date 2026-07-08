import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import {
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
  type OtherDetailDataConfig,
} from './otherConfig';

export function OtherSettings({
  rhythmTitle,
  dataConfig,
  onChangeDataConfig,
  categoryKey,
  allowRename = true,
  renameLockedReason = null,
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
  const isAbstain =
    resolveCustomFlowTemplateKey(dataConfig ?? getInitialOtherDataConfig()) === 'abstain';

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [summary, setSummary] = useState(initial.summary);
  const [draftTask, setDraftTask] = useState('');
  const [checklist, setChecklist] = useState(initial.checklist);
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  dataConfigRef.current = dataConfig;
  onChangeDataConfigRef.current = onChangeDataConfig;

  useEffect(() => {
    const next = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
    isSyncingFromPropsRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setChecklist(next.checklist);
    lastPersistedRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const appearanceBase = normalizeOtherDetailConfig(
      dataConfigRef.current ?? getInitialOtherDataConfig(),
    );
    const payload: OtherDetailDataConfig = normalizeOtherDetailConfig({
      displayName,
      summary,
      checklist,
      ...(isAbstain ? { templateKey: 'abstain' as const } : {}),
      ...(appearanceBase.icon ? { icon: appearanceBase.icon } : {}),
      ...(appearanceBase.accentColor ? { accentColor: appearanceBase.accentColor } : {}),
    });
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfigRef.current(payload);
  }, [displayName, summary, checklist, isAbstain]);

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
    const doneTag = isAbstain ? '[지킴] ' : '[완료] ';
    return checklist
      .filter((x) => x.text.trim().length > 0)
      .map((x, i) => `${i + 1}. ${x.done ? doneTag : ''}${x.text.trim()}`)
      .join('\n');
  };

  const onShare = async () => {
    const content = buildShareText();
    if (!content) {
      Alert.alert('공유할 내용 없음', isAbstain ? '금지 항목을 먼저 입력해 주세요.' : '체크리스트를 먼저 입력해 주세요.');
      return;
    }
    await Share.share({
      message: `POKIT 사용자 루틴\n\n${content}`,
    });
  };

  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  return (
    <View style={styles.shell}>
      {!hideTitleField ? (
        <RoutineTitleField
          value={displayName}
          onChangeValue={setDisplayName}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

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
          placeholder={isAbstain ? '금지할 행동을 입력하고 추가' : '작업 항목을 입력하고 추가'}
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
                  !isAbstain && task.done && styles.rowTitleDone,
                ]}>
                {task.text}
              </ThemedText>
              {isAbstain && task.done ? (
                <ThemedText style={[styles.abstainTag, { color: c.onSurface }]}>지킴</ThemedText>
              ) : null}
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
  addBtn: { borderWidth: 2, borderRadius: 0, paddingHorizontal: 14, paddingVertical: 8 },
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
  abstainTag: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
