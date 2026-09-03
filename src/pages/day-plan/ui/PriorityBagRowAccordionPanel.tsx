import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import {
  formatMinutesToHHmm,
  isCustomFlowCategoryKey,
  normalizeCustomFlowDetailConfig,
  readRoutineSummaryFromConfig,
  resolveCustomFlowTemplateKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import type { GoalDetailCategoryKey } from '@pages/goal-detail-settings/model/types';
import { resolveGoalDetailModuleForTarget } from '@pages/goal-detail-settings/ui/category';
import { useTranslation } from '@shared/lib/i18n';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { UiSurfacePresentationProvider } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';

type ChecklistTask = { id: string; text: string; done: boolean };

type Props = {
  categoryKey: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
  ink: string;
  muted: string;
  isDark: boolean;
};

function resolveChecklistTemplate(
  categoryKey: string,
  raw: unknown,
): 'checklist' | 'abstain' | null {
  if (categoryKey === 'other') return 'checklist';
  if (!isCustomFlowCategoryKey(categoryKey)) return null;
  const key = resolveCustomFlowTemplateKey(raw) as CustomFlowTemplateKey;
  if (key === 'checklist' || key === 'abstain') return key;
  return null;
}

function readChecklist(raw: unknown, template: 'checklist' | 'abstain'): ChecklistTask[] {
  const cfg = normalizeCustomFlowDetailConfig(template, raw) as {
    checklist?: ChecklistTask[];
  };
  return Array.isArray(cfg.checklist) ? cfg.checklist : [];
}

function asGoalDetailCategoryKey(key: string): GoalDetailCategoryKey {
  return key as GoalDetailCategoryKey;
}

export function PriorityBagRowAccordionPanel({
  categoryKey,
  label,
  startMinutes,
  endMinutes,
  ink,
  muted,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [revision, setRevision] = useState(0);
  const goalKey = asGoalDetailCategoryKey(categoryKey);
  const summaryPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawConfig = useMemo(
    () => loadGoalDetailCategoryConfig(categoryKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryKey, revision],
  );

  const checklistTemplate = useMemo(
    () => resolveChecklistTemplate(categoryKey, rawConfig),
    [categoryKey, rawConfig],
  );

  const tasks = useMemo(
    () => (checklistTemplate ? readChecklist(rawConfig, checklistTemplate) : []),
    [checklistTemplate, rawConfig],
  );

  const summaryText = useMemo(() => {
    if (!checklistTemplate || !rawConfig) return '';
    return readRoutineSummaryFromConfig(rawConfig);
  }, [checklistTemplate, rawConfig]);

  useEffect(() => {
    setSummaryDraft(summaryText);
  }, [summaryText]);

  useEffect(() => {
    return () => {
      if (summaryPersistTimerRef.current) {
        clearTimeout(summaryPersistTimerRef.current);
      }
    };
  }, []);

  const timeLine = useMemo(() => {
    const s = formatMinutesToHHmm(startMinutes);
    const e = formatMinutesToHHmm(endMinutes);
    return `${s} – ${e}`;
  }, [startMinutes, endMinutes]);

  const doneCount = tasks.filter((task) => task.done).length;

  const module = useMemo(
    () => resolveGoalDetailModuleForTarget(goalKey, rawConfig),
    [goalKey, rawConfig],
  );
  const Settings = module.Settings;

  const handleSettingsChange = useCallback(
    (next: unknown) => {
      const base =
        rawConfig && typeof rawConfig === 'object'
          ? { ...(rawConfig as Record<string, unknown>) }
          : {};
      const merged =
        next && typeof next === 'object'
          ? { ...base, ...(next as Record<string, unknown>) }
          : next;
      saveGoalDetailCategoryConfig(categoryKey, merged);
      setRevision((n) => n + 1);
    },
    [categoryKey, rawConfig],
  );

  const persistChecklist = useCallback(
    (nextTasks: ChecklistTask[]) => {
      if (!checklistTemplate) return;
      const base =
        rawConfig && typeof rawConfig === 'object'
          ? { ...(rawConfig as Record<string, unknown>) }
          : {};
      saveGoalDetailCategoryConfig(categoryKey, {
        ...base,
        templateKey: checklistTemplate,
        checklist: nextTasks,
      });
      setRevision((n) => n + 1);
    },
    [categoryKey, checklistTemplate, rawConfig],
  );

  const persistSummary = useCallback(
    (nextSummary: string) => {
      if (!checklistTemplate) return;
      const base =
        rawConfig && typeof rawConfig === 'object'
          ? { ...(rawConfig as Record<string, unknown>) }
          : {};
      saveGoalDetailCategoryConfig(categoryKey, {
        ...base,
        templateKey: checklistTemplate,
        summary: nextSummary,
      });
      setRevision((n) => n + 1);
    },
    [categoryKey, checklistTemplate, rawConfig],
  );

  const handleSummaryChange = useCallback(
    (next: string) => {
      setSummaryDraft(next);
      if (summaryPersistTimerRef.current) {
        clearTimeout(summaryPersistTimerRef.current);
      }
      summaryPersistTimerRef.current = setTimeout(() => {
        summaryPersistTimerRef.current = null;
        persistSummary(next);
      }, 350);
    },
    [persistSummary],
  );

  const toggleTask = useCallback(
    (id: string) => {
      void Haptics.selectionAsync();
      persistChecklist(
        tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
      );
    },
    [persistChecklist, tasks],
  );

  const removeTask = useCallback(
    (id: string) => {
      void Haptics.selectionAsync();
      persistChecklist(tasks.filter((task) => task.id !== id));
    },
    [persistChecklist, tasks],
  );

  const addTask = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    void Haptics.selectionAsync();
    persistChecklist([...tasks, { id: `task_${Date.now()}`, text, done: false }]);
    setDraft('');
  }, [draft, persistChecklist, tasks]);

  const buildPayload = useCallback(() => {
    const parts: string[] = [`[${label}]`];
    const summaryTrimmed = summaryDraft.trim();
    if (summaryTrimmed) parts.push(summaryTrimmed);
    if (tasks.length > 0) {
      for (const task of tasks) {
        parts.push(`${task.done ? '☑' : '☐'} ${task.text}`);
      }
    }
    parts.push(timeLine);
    return parts.join('\n');
  }, [label, summaryDraft, tasks, timeLine]);

  const handleCopy = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(buildPayload());
    Alert.alert(t('dayPlan.rowAccordionCopiedTitle'), t('dayPlan.rowAccordionCopiedBody'));
  }, [buildPayload, t]);

  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: buildPayload() });
    } catch {
      /* cancelled */
    }
  }, [buildPayload]);

  const addPlaceholder =
    checklistTemplate === 'abstain'
      ? t('customFlowTemplate.addAbstainPlaceholder')
      : t('customFlowTemplate.addTodoPlaceholder');

  if (checklistTemplate) {
    return (
      <View style={s.root}>
        <TextInput
          value={summaryDraft}
          onChangeText={handleSummaryChange}
          placeholder={t('goalDetail.summaryPlaceholder')}
          placeholderTextColor={muted}
          style={[s.summaryInput, { color: ink }]}
          multiline
          textAlignVertical="top"
          maxLength={240}
        />

        <View style={[s.noteBlock, { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: muted, paddingTop: 10 }]}>
          {tasks.length > 0 ? (
            <ThemedText style={[s.progressLine, { color: muted }]}>
              {doneCount}/{tasks.length}
            </ThemedText>
          ) : null}

          {tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                s.taskRow,
                index < tasks.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth * 2,
                  borderBottomColor: muted,
                  paddingBottom: 8,
                  marginBottom: 4,
                },
              ]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                hitSlop={4}
                onPress={() => toggleTask(task.id)}
                style={s.taskMain}>
                <View
                  style={[
                    s.check,
                    {
                      borderColor: task.done ? ink : muted,
                      backgroundColor: task.done ? ink : 'transparent',
                    },
                  ]}>
                  {task.done ? (
                    <IconSymbol name="checkmark" size={9} color="#FAFAFA" />
                  ) : null}
                </View>
                <ThemedText
                  style={[
                    s.taskText,
                    { color: task.done ? muted : ink },
                    task.done && checklistTemplate === 'checklist' ? s.taskDone : null,
                  ]}
                  numberOfLines={3}>
                  {task.text}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('customFlowTemplate.deleteItemA11y')}
                hitSlop={8}
                onPress={() => removeTask(task.id)}
                style={({ pressed }) => [s.deleteHit, pressed && { opacity: 0.45 }]}>
                <ThemedText style={[s.deleteMark, { color: muted }]}>×</ThemedText>
              </Pressable>
            </View>
          ))}

          <View style={s.addRow}>
            <ThemedText style={[s.dash, { color: muted }]}>–</ThemedText>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={addPlaceholder}
              placeholderTextColor={muted}
              style={[s.addInput, { color: ink }]}
              returnKeyType="done"
              onSubmitEditing={addTask}
              blurOnSubmit
            />
            {draft.trim().length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.add')}
                hitSlop={6}
                onPress={addTask}
                style={({ pressed }) => pressed && { opacity: 0.5 }}>
                <ThemedText style={[s.addConfirm, { color: ink }]}>
                  {t('common.add')}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={s.toolbar}>
          <View style={s.actions}>
            <Pressable
              hitSlop={6}
              onPress={handleCopy}
              style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]}>
              <IconSymbol name="doc.on.doc" size={13} color={muted} />
              <ThemedText style={[s.actionLabel, { color: muted }]}>
                {t('dayPlan.rowAccordionCopy')}
              </ThemedText>
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={handleShare}
              style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]}>
              <IconSymbol name="square.and.arrow.up" size={13} color={muted} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <UiSurfacePresentationProvider value="note">
        <Settings
          rhythmTitle={label}
          categoryKey={goalKey}
          dataConfig={rawConfig ?? module.getInitialDataConfig?.() ?? {}}
          onChangeDataConfig={handleSettingsChange}
          allowRename={false}
          hideTitleField
        />
      </UiSurfacePresentationProvider>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 4,
    width: '100%',
    alignSelf: 'stretch',
  },
  summaryInput: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontWeight: '500',
    paddingVertical: 2,
    minHeight: 40,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  noteBlock: {
    gap: 8,
  },
  progressLine: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: 0,
    paddingVertical: 2,
  },
  check: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 0,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  deleteHit: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  deleteMark: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '400',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingVertical: 2,
  },
  dash: {
    fontSize: 13,
    lineHeight: 18,
    width: 14,
    textAlign: 'center',
  },
  addInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 2,
    paddingHorizontal: 0,
    margin: 0,
  },
  addConfirm: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionPressed: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
