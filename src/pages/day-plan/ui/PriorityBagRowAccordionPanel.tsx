import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, View } from 'react-native';

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
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  isPokitWeekTourFlowId,
  loadGoalDetailCategoryConfig,
  loadPokitWeekTourFirstTipSeen,
  markPokitWeekTourFirstTipSeen,
  POKIT_WEEK_TOUR_STEP_COUNT,
  POST_IT_LIGHT_INK,
  resolvePokitWeekTourStepIndex,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { UiSurfacePresentationProvider } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { PokitWeekTourTipSheet } from './PokitWeekTourTipSheet';

type ChecklistTask = { id: string; text: string; done: boolean };

type Props = {
  categoryKey: string;
  label: string;
  /** 오늘 일정에서 열 때만 표시하는 시간 범위 */
  startMinutes?: number;
  endMinutes?: number;
  ink: string;
  muted: string;
  /** 포스트잇 면 divider — 설정 팔레트 outline 에 전달 */
  line?: string;
  isDark: boolean;
};

function TourChecklistTapNudge({ color }: { color: string }) {
  const { t } = useTranslation();
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    bounceLoop.start();
    pulseLoop.start();
    return () => {
      bounceLoop.stop();
      pulseLoop.stop();
    };
  }, [bounce, pulse]);

  const translateY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });

  return (
    <Animated.View
      style={[s.tapNudge, { opacity: pulse }]}
      accessibilityRole="text"
      accessibilityLabel={t('tour.pokitWeek.tapChecklistHint')}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <IconSymbol name="arrow.down" size={13} color={color} />
      </Animated.View>
      <ThemedText style={[s.tapNudgeText, { color }]}>
        {t('tour.pokitWeek.tapChecklistHint')}
      </ThemedText>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <IconSymbol name="arrow.down" size={13} color={color} />
      </Animated.View>
    </Animated.View>
  );
}

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
  line,
}: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const { isDayPlanFocused } = useDayPlanTabBridge();
  const [draft, setDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [revision, setRevision] = useState(0);
  const [tourTipStep, setTourTipStep] = useState<number | null>(null);
  const [tourTipTaskId, setTourTipTaskId] = useState<string | null>(null);
  const goalKey = asGoalDetailCategoryKey(categoryKey);
  const summaryPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWeekTour = isPokitWeekTourFlowId(categoryKey);

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

  /**
   * 오늘 탭에서 실제로 떠날 때만 팁을 닫는다.
   * (초기 isDayPlanFocused=false 에 막혀 자동 오픈이 영구 스킵되지 않게, false→만 닫기)
   */
  const wasDayPlanFocusedRef = useRef(isDayPlanFocused);
  useEffect(() => {
    const wasFocused = wasDayPlanFocusedRef.current;
    wasDayPlanFocusedRef.current = isDayPlanFocused;
    if (!isWeekTour) return;
    if (wasFocused && !isDayPlanFocused) {
      setTourTipStep(null);
      setTourTipTaskId(null);
    }
  }, [isDayPlanFocused, isWeekTour]);

  const timeLine = useMemo(() => {
    if (startMinutes == null || endMinutes == null) return null;
    const s = formatMinutesToHHmm(startMinutes);
    const e = formatMinutesToHHmm(endMinutes);
    return `${s} – ${e}`;
  }, [startMinutes, endMinutes]);

  const doneCount = tasks.filter((task) => task.done).length;
  const firstUndoneTourIndex = useMemo(() => {
    if (!isWeekTour) return -1;
    return tasks.findIndex((task) => !task.done);
  }, [isWeekTour, tasks]);
  const showTourTapNudge =
    isWeekTour && tourTipStep == null && firstUndoneTourIndex >= 0;

  const nudgePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!showTourTapNudge) {
      nudgePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudgePulse, {
          toValue: 0.35,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nudgePulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudgePulse, showTourTapNudge]);

  const module = useMemo(
    () => resolveGoalDetailModuleForTarget(goalKey, rawConfig),
    [goalKey, rawConfig],
  );
  const Settings = module.Settings;
  const settingsDataConfig = useMemo(
    () => rawConfig ?? module.getInitialDataConfig?.() ?? {},
    [module, rawConfig],
  );

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

  const openTourTip = useCallback(
    (taskId: string, listIndex: number) => {
      const stepFromId = resolvePokitWeekTourStepIndex(taskId);
      const step =
        stepFromId != null && stepFromId >= 0 && stepFromId < POKIT_WEEK_TOUR_STEP_COUNT
          ? stepFromId
          : Number.isInteger(listIndex) && listIndex >= 0 && listIndex < POKIT_WEEK_TOUR_STEP_COUNT
            ? listIndex
            : null;
      if (step == null) {
        toggleTask(taskId);
        return;
      }
      void Haptics.selectionAsync();
      const task = tasks.find((row) => row.id === taskId);
      const nextDone = !(task?.done ?? false);
      persistChecklist(
        tasks.map((row) => (row.id === taskId ? { ...row, done: nextDone } : row)),
      );
      // 체크할 때만 안내 시트 — 해제는 토글만
      if (nextDone) {
        setTourTipTaskId(taskId);
        setTourTipStep(step);
      }
    },
    [persistChecklist, tasks, toggleTask],
  );

  /**
   * 초기(첫 팁 미열람): 첫 항목 체크 + 1번 포스트잇.
   * 첫 팁을 본 뒤에는 체크 상태를 강제하지 않는다.
   */
  useEffect(() => {
    if (!isWeekTour || tasks.length === 0) return;
    if (loadPokitWeekTourFirstTipSeen()) return;
    const first = tasks[0];
    if (!first) return;

    if (!first.done) {
      persistChecklist(
        tasks.map((row, index) => (index === 0 ? { ...row, done: true } : row)),
      );
    }

    if (tourTipStep === 0 && tourTipTaskId === first.id) return;

    setTourTipTaskId(first.id);
    setTourTipStep(0);
  }, [isWeekTour, persistChecklist, tasks, tourTipStep, tourTipTaskId]);

  const closeTourTip = useCallback(() => {
    if (tourTipStep === 0) {
      markPokitWeekTourFirstTipSeen();
    }
    setTourTipStep(null);
    setTourTipTaskId(null);
  }, [tourTipStep]);

  const confirmTourTip = useCallback(() => {
    closeTourTip();
  }, [closeTourTip]);

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
    if (timeLine) parts.push(timeLine);
    return parts.join('\n');
  }, [label, summaryDraft, tasks, timeLine]);

  const handleCopy = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(buildPayload());
  }, [buildPayload]);

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
        {isWeekTour ? (
          <ThemedText style={[s.tourHint, { color: muted }]}>
            {t('tour.pokitWeek.listHint')}
          </ThemedText>
        ) : (
          <ThemedTextInput
            value={summaryDraft}
            onChangeText={handleSummaryChange}
            placeholder={t('goalDetail.summaryPlaceholder')}
            placeholderTextColor={muted}
            style={[s.summaryInput, { color: ink }]}
            multiline
            textAlignVertical="top"
            maxLength={240}
          />
        )}

        <View style={[s.noteBlock, { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: muted, paddingTop: 10 }]}>
          {tasks.length > 0 ? (
            <ThemedText style={[s.progressLine, { color: muted }]}>
              {doneCount}/{tasks.length}
            </ThemedText>
          ) : null}

          {showTourTapNudge ? <TourChecklistTapNudge color={ink} /> : null}

          {tasks.map((task, index) => {
            const isNudgeTarget = showTourTapNudge && index === firstUndoneTourIndex;
            const checkBox = (
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
            );
            return (
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
                  accessibilityRole={isWeekTour ? 'button' : 'checkbox'}
                  accessibilityState={{ checked: task.done }}
                  accessibilityLabel={
                    isWeekTour ? t('tour.pokitWeek.stepA11y', { title: task.text }) : undefined
                  }
                  hitSlop={4}
                  onPress={() => (isWeekTour ? openTourTip(task.id, index) : toggleTask(task.id))}
                  style={s.taskMain}>
                  {isNudgeTarget ? (
                    <Animated.View style={{ opacity: nudgePulse }}>{checkBox}</Animated.View>
                  ) : (
                    checkBox
                  )}
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
                {!isWeekTour ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('customFlowTemplate.deleteItemA11y')}
                    hitSlop={8}
                    onPress={() => removeTask(task.id)}
                    style={({ pressed }) => [s.deleteHit, pressed && { opacity: 0.45 }]}>
                    <ThemedText style={[s.deleteMark, { color: muted }]}>×</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {!isWeekTour ? (
            <View style={s.addRow}>
              <ThemedText style={[s.dash, { color: muted }]}>–</ThemedText>
              <ThemedTextInput
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
          ) : null}
        </View>

        <PokitWeekTourTipSheet
          visible={tourTipStep != null}
          stepIndex={tourTipStep ?? 0}
          isDark={isDark}
          onClose={closeTourTip}
          onConfirm={confirmTourTip}
        />

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
      <UiSurfacePresentationProvider
        value="note"
        noteColors={{
          onSurface: ink,
          onVariant: muted,
          outline: line,
          usesLightInk:
            ink === POST_IT_LIGHT_INK ||
            ink.toLowerCase() === '#ffffff' ||
            ink.toLowerCase() === '#fafafa',
        }}>
        <Settings
          rhythmTitle={label}
          categoryKey={goalKey}
          dataConfig={settingsDataConfig}
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
  tourHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  tapNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  tapNudgeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
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
