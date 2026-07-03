import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
  type OtherDetailDataConfig,
} from '../../other/ui/otherConfig';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { BODY_HABIT_CHECKLIST_COPY, type BodyHabitChecklistVariant } from '../lib/bodyHabitCopy';

type SharedSettingsProps = {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
};

export function BodyHabitChecklistSettings({
  variant,
  rhythmTitle,
  categoryKey,
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
}: SharedSettingsProps & {
  variant: BodyHabitChecklistVariant;
}) {
  const copy = BODY_HABIT_CHECKLIST_COPY[variant];
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey ?? variant, rhythmTitle),
    [categoryKey, rhythmTitle, variant],
  );
  const initial = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [summary, setSummary] = useState(initial.summary);
  const [draftTask, setDraftTask] = useState('');
  const [checklist, setChecklist] = useState(initial.checklist);
  const lastRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);

  useEffect(() => {
    const next = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
    isSyncingFromPropsRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setChecklist(next.checklist);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload: OtherDetailDataConfig = normalizeOtherDetailConfig({
      displayName,
      summary,
      checklist,
    });
    const serialized = JSON.stringify(payload);
    if (lastRef.current === serialized) return;
    lastRef.current = serialized;
    onChangeDataConfig(payload);
  }, [displayName, summary, checklist, onChangeDataConfig]);

  const addTask = () => {
    const text = draftTask.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `${variant}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
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
      message: `POKIT\n\n${content}`,
    });
  };

  return (
    <View style={styles.shell}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
        size="compact"
      />

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
          placeholder={copy.placeholder}
          placeholderTextColor={c.outline}
          style={[styles.taskInput, { color: c.onSurface, borderBottomColor: c.outline }]}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <Pressable onPress={addTask} style={[styles.addBtn, { borderColor: c.onSurface }]}>
          <ThemedText style={[styles.addBtnText, { color: c.onSurface }]}>추가</ThemedText>
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

export function StretchingSettings(props: SharedSettingsProps) {
  return <BodyHabitChecklistSettings variant="stretching" {...props} />;
}

export function StraightenBackSettings(props: SharedSettingsProps) {
  return <BodyHabitChecklistSettings variant="straightenBack" {...props} />;
}

export function NeckPostureSettings(props: SharedSettingsProps) {
  return <BodyHabitChecklistSettings variant="neckPosture" {...props} />;
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
  addBtnText: { fontSize: 13, fontWeight: '800' },
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
  rowTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
