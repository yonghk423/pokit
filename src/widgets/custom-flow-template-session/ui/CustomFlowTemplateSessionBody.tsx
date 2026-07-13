import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  applyCounterDelta,
  applyCounterActivityPreset,
  applyCounterActivitySettings,
  applyCounterFillRemaining,
  addReminderScheduleItem,
  applyHabitDoneToggle,
  applyJournalSave,
  applyMemoSave,
  applyMeasurementSave,
  applyMeasurementMetricPreset,
  applyReminderSchedulePreset,
  blockDurationSec,
  buildHabitWeekDots,
  COUNTER_ACTIVITY_PRESETS,
  COUNTER_UNIT_OPTIONS,
  ensureCounterDayBoundary,
  focusElapsedMinFromSession,
  formatCounterRemainingMessage,
  findReminderScheduleItem,
  formatMeasurementDelta,
  formatMeasurementValue,
  formatReminderCountdown,
  formatHhmmClockKo,
  JOURNAL_MOOD_OPTIONS,
  MAX_CUSTOM_REMINDER_TIMES,
  measurementQuickDeltas,
  measurementRecordedToday,
  MEASUREMENT_METRIC_PRESETS,
  minutesUntilReminder,
  normalizeCustomFlowDetailConfig,
  reminderProgress,
  REMINDER_SCHEDULE_PRESETS,
  removeReminderScheduleItem,
  resetCounterCount,
  resolveCounterUnitLabel,
  resolveMeasurementUnitLabel,
  resolveNextReminderTime,
  resolveReminderItemTitle,
  isReminderPresetActive,
  roundMeasurementValue,
  toggleReminderTimeDone,
  updateReminderItemLabel,
  updateReminderItemTime,
  type CustomFlowTemplateKey,
  type CounterUnitKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { ReminderTimePickerPill } from './ReminderTimePickerPill';

export type TemplateSessionTheme = {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
};

type Props = {
  templateKey: CustomFlowTemplateKey;
  config: unknown;
  onChange: (next: unknown) => void;
  theme: TemplateSessionTheme;
  block?: DayPlanBlock;
  sessionProgress?: number;
  /** 템플릿 미리보기·만들기 — 예시 데이터 전환 허용 */
  previewMode?: boolean;
  /** false면 설정 화면 — 완료 체크 없이 일정만 편집 */
  allowScheduleCompletion?: boolean;
};

/** rgb/hex accent → rgba (템플릿 `${accent}10` 방식은 rgb에서 깨짐) */
function withAlpha(color: string, alpha: number): string {
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(color.trim());
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  const hex = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function Card({
  children,
  theme,
  gap = 10,
  flushList = false,
}: {
  children: React.ReactNode;
  theme: TemplateSessionTheme;
  gap?: number;
  flushList?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        flushList && styles.cardFlushList,
        { borderColor: theme.line, backgroundColor: theme.surface, gap: flushList ? 0 : gap },
      ]}>
      {children}
    </View>
  );
}

function SectionLabel({ children, color }: { children: string; color: string }) {
  return <ThemedText style={[styles.sectionLabel, { color }]}>{children}</ThemedText>;
}

function MiniBarChart({
  values,
  goal,
  accent,
  muted,
}: {
  values: number[];
  goal?: number;
  accent: string;
  muted: string;
}) {
  if (values.length === 0) return null;
  const min = Math.min(...values, goal ?? values[0] ?? 0);
  const max = Math.max(...values, goal ?? values[0] ?? 0);
  const span = Math.max(max - min, 0.1);
  return (
    <View style={styles.chartRow}>
      {values.map((v, idx) => {
        const h = Math.max(8, Math.round(((v - min) / span) * 48));
        const isLast = idx === values.length - 1;
        return (
          <View key={`${idx}-${v}`} style={styles.chartCol}>
            <View style={[styles.chartBarTrack, { backgroundColor: muted, opacity: 0.2 }]}>
              <View
                style={[
                  styles.chartBarFill,
                  {
                    height: h,
                    backgroundColor: isLast ? accent : muted,
                    opacity: isLast ? 1 : 0.55,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WeekDots({ dots, accent, muted, ink }: { dots: boolean[]; accent: string; muted: string; ink: string }) {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  return (
    <View style={styles.weekRow}>
      {dots.map((done, idx) => (
        <View key={labels[idx]} style={styles.weekCol}>
          <View
            style={[
              styles.weekDot,
              {
                borderColor: done ? accent : muted,
                backgroundColor: done ? accent : 'transparent',
              },
            ]}>
            {done ? <IconSymbol name="checkmark" size={10} color="#fff" /> : null}
          </View>
          <ThemedText style={[styles.weekLabel, { color: done ? ink : muted }]}>{labels[idx]}</ThemedText>
        </View>
      ))}
    </View>
  );
}

type TemplateEmit = (next: unknown) => void;

function MeasurementTemplateView({
  cfg,
  emit,
  theme,
  previewMode = false,
}: {
  cfg: Parameters<typeof applyMeasurementSave>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
  previewMode?: boolean;
}) {
  const { ink, muted, line, accent } = theme;
  const unit = resolveMeasurementUnitLabel(cfg.unit, cfg.customUnitLabel);
  const [draft, setDraft] = useState(() => (cfg.currentValue > 0 ? String(cfg.currentValue) : ''));
  useEffect(() => {
    setDraft(cfg.currentValue > 0 ? String(cfg.currentValue) : '');
  }, [cfg.currentValue, cfg.unit, cfg.metricLabel]);

  const parsed = parseFloat(draft.replace(',', '.'));
  const quickDeltas = measurementQuickDeltas(cfg.unit);
  const delta = formatMeasurementDelta(cfg.currentValue, cfg.previousValue, cfg.unit);
  const chartValues = cfg.history.slice(-7).map((h) => h.value);
  const goalRatio =
    cfg.useGoalValue && cfg.goalValue > 0 ? Math.min(1, cfg.currentValue / cfg.goalValue) : null;
  const recordedToday = measurementRecordedToday(cfg);
  const showPresetPicker =
    previewMode || (!cfg.metricLabel.trim() && cfg.unit === 'none');

  const applyDelta = (d: number) => {
    const base = Number.isFinite(parsed) ? parsed : cfg.currentValue;
    setDraft(String(roundMeasurementValue(base + d, cfg.unit)));
  };

  return (
    <View style={styles.root}>
      {showPresetPicker ? (
        <Card theme={theme} gap={8}>
          <SectionLabel color={muted}>무엇을 기록할까요?</SectionLabel>
          <ThemedText style={[styles.sub, { color: muted }]}>
            예시를 눌러 단위·목표가 바뀌는 걸 체험해 보세요.
          </ThemedText>
          <View style={styles.moodRow}>
            {MEASUREMENT_METRIC_PRESETS.map((preset) => {
              const selected =
                cfg.metricLabel === preset.metricLabel &&
                cfg.unit === preset.unit;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    emit(
                      applyMeasurementMetricPreset(cfg, preset, {
                        includeSampleData: previewMode,
                      }),
                    );
                  }}
                  style={[
                    styles.moodChip,
                    {
                      borderColor: selected ? accent : line,
                      backgroundColor: selected ? withAlpha(accent, 0.12) : theme.surface,
                    },
                  ]}>
                  <ThemedText
                    style={{
                      color: selected ? accent : muted,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 12,
                    }}>
                    {preset.metricLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Card theme={theme} gap={12}>
        <SectionLabel color={muted}>{cfg.metricLabel.trim() || '기록'}</SectionLabel>
        <View style={styles.heroRow}>
          <ThemedText
            style={[styles.heroValue, { color: ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {cfg.currentValue > 0 ? formatMeasurementValue(cfg.currentValue, cfg.unit) : '—'}
          </ThemedText>
          {unit ? <ThemedText style={[styles.heroUnit, { color: muted }]}>{unit}</ThemedText> : null}
        </View>
        {delta ? (
          <ThemedText style={[styles.deltaLine, { color: accent }]}>
            어제 대비 {delta}
            {unit ? ` ${unit}` : ''}
          </ThemedText>
        ) : cfg.previousValue > 0 ? (
          <ThemedText style={[styles.sub, { color: muted }]}>
            이전 {formatMeasurementValue(cfg.previousValue, cfg.unit)}
            {unit ? ` ${unit}` : ''}
          </ThemedText>
        ) : null}
        {goalRatio != null ? (
          <>
            <ThemedText style={[styles.sub, { color: muted }]}>
              목표 {formatMeasurementValue(cfg.goalValue, cfg.unit)}
              {unit ? ` ${unit}` : ''} · {Math.round(goalRatio * 100)}%
            </ThemedText>
            <View style={[styles.track, { backgroundColor: line }]}>
              <View style={[styles.fill, { width: `${Math.round(goalRatio * 100)}%`, backgroundColor: accent }]} />
            </View>
          </>
        ) : null}
      </Card>

      {chartValues.length >= 2 ? (
        <Card theme={theme}>
          <SectionLabel color={muted}>최근 7일 추이</SectionLabel>
          <MiniBarChart
            values={chartValues}
            goal={cfg.useGoalValue ? cfg.goalValue : undefined}
            accent={accent}
            muted={muted}
          />
        </Card>
      ) : null}

      {cfg.unit !== 'none' || cfg.metricLabel.trim().length > 0 ? (
      <Card theme={theme}>
        {recordedToday ? (
          <ThemedText style={[styles.badge, { color: accent, borderColor: accent }]}>
            오늘 기록 완료 · 수정하려면 값을 바꾸고 저장하세요
          </ThemedText>
        ) : null}
        <View style={styles.quickRow}>
          {quickDeltas.map((d) => (
            <Pressable key={d} onPress={() => applyDelta(d)} style={[styles.quickBtn, { borderColor: line }]}>
              <ThemedText style={{ color: ink, fontWeight: '700', fontSize: 13 }}>
                {d > 0 ? `+${d}` : String(d)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.measureInputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            placeholder="값 입력"
            placeholderTextColor={muted}
            style={[styles.measureInput, { color: ink, borderColor: line }]}
          />
          {unit ? <ThemedText style={[styles.heroUnit, { color: muted }]}>{unit}</ThemedText> : null}
        </View>
        <Pressable
          onPress={() => {
            const raw = parseFloat(draft.replace(',', '.'));
            if (!Number.isFinite(raw)) return;
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            emit(applyMeasurementSave(cfg, raw));
          }}
          style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <ThemedText style={styles.primaryBtnText}>기록 저장</ThemedText>
        </Pressable>
      </Card>
      ) : null}
    </View>
  );
}

function JournalTemplateView({
  cfg,
  emit,
  theme,
}: {
  cfg: Parameters<typeof applyJournalSave>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
}) {
  const { ink, muted, line, accent } = theme;
  const [draft, setDraft] = useState(cfg.lastEntry ?? '');
  const [mood, setMood] = useState(cfg.moodToday ?? '');
  useEffect(() => {
    setDraft(cfg.lastEntry ?? '');
    setMood(cfg.moodToday ?? '');
  }, [cfg.lastEntry, cfg.moodToday]);

  return (
    <View style={styles.root}>
      <Card theme={theme}>
        <ThemedText style={[styles.prompt, { color: ink }]}>{cfg.prompt.trim() || '한 줄 기록'}</ThemedText>
        <SectionLabel color={muted}>기분</SectionLabel>
        <View style={styles.moodRow}>
          {JOURNAL_MOOD_OPTIONS.map((m) => {
            const selected = mood === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMood(selected ? '' : m)}
                style={[
                  styles.moodChip,
                  {
                    borderColor: selected ? accent : line,
                    backgroundColor: selected ? withAlpha(accent, 0.12) : theme.surface,
                  },
                ]}>
                <ThemedText
                  style={{ color: selected ? accent : muted, fontWeight: selected ? '700' : '500', fontSize: 12 }}>
                  {m}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="오늘의 한 줄을 남겨요"
          placeholderTextColor={muted}
          textAlignVertical="top"
          style={[styles.journalInput, { color: ink, borderColor: line }]}
        />
        <Pressable
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            emit(applyJournalSave(cfg, draft, mood));
          }}
          style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <ThemedText style={styles.primaryBtnText}>저장</ThemedText>
        </Pressable>
      </Card>
      {cfg.recentEntries.length > 0 ? (
        <Card theme={theme}>
          <SectionLabel color={muted}>최근 기록</SectionLabel>
          {cfg.recentEntries.slice(0, 5).map((entry, idx) => (
            <View key={`${entry.dateKey}-${idx}`} style={[styles.entryRow, { borderColor: line }]}>
              <View style={styles.entryMeta}>
                {entry.dateKey ? (
                  <ThemedText style={[styles.entryDate, { color: muted }]}>{entry.dateKey.slice(5)}</ThemedText>
                ) : null}
                {entry.mood ? (
                  <ThemedText style={[styles.entryMood, { color: accent }]}>{entry.mood}</ThemedText>
                ) : null}
              </View>
              <ThemedText style={[styles.entryText, { color: ink }]} numberOfLines={2}>
                {entry.text}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function MemoTemplateView({
  cfg,
  emit,
  theme,
}: {
  cfg: Parameters<typeof applyMemoSave>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
}) {
  const { ink, muted, line, accent } = theme;
  const [draft, setDraft] = useState(cfg.lastEntry ?? '');
  useEffect(() => {
    setDraft(cfg.lastEntry ?? '');
  }, [cfg.lastEntry]);

  return (
    <View style={styles.root}>
      <Card theme={theme}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="메모를 적어요"
          placeholderTextColor={muted}
          textAlignVertical="top"
          style={[styles.journalInput, { color: ink, borderColor: line }]}
        />
        <Pressable
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            emit(applyMemoSave(cfg, draft));
          }}
          style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <ThemedText style={styles.primaryBtnText}>저장</ThemedText>
        </Pressable>
      </Card>
      {cfg.recentEntries.length > 0 ? (
        <Card theme={theme}>
          <SectionLabel color={muted}>최근 메모</SectionLabel>
          {cfg.recentEntries.slice(0, 5).map((entry, idx) => (
            <View key={`${entry.dateKey}-${idx}`} style={[styles.entryRow, { borderColor: line }]}>
              {entry.dateKey ? (
                <ThemedText style={[styles.entryDate, { color: muted }]}>{entry.dateKey.slice(5)}</ThemedText>
              ) : null}
              <ThemedText style={[styles.entryText, { color: ink }]} numberOfLines={2}>
                {entry.text}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

type ChecklistTemplateCfg = {
  checklist: Array<{ id: string; text: string; done: boolean }>;
  [key: string]: unknown;
};

function ChecklistTemplateView({
  cfg,
  emit,
  theme,
  variant = 'checklist',
}: {
  cfg: ChecklistTemplateCfg;
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
  variant?: 'checklist' | 'abstain';
}) {
  const { ink, muted, line, accent } = theme;
  const tasks = cfg.checklist;
  const doneCount = tasks.filter((t) => t.done).length;
  const ratio = tasks.length > 0 ? doneCount / tasks.length : 0;
  const [draft, setDraft] = useState('');
  const templateKey = variant === 'abstain' ? 'abstain' : 'checklist';
  const progressLabel =
    variant === 'abstain'
      ? `${doneCount}/${tasks.length} 지킴`
      : `${doneCount}/${tasks.length} 완료`;
  const completeBadge =
    variant === 'abstain' ? '모든 금지를 지켰어요!' : '모든 할 일 완료!';
  const addPlaceholder = variant === 'abstain' ? '금지 항목 추가' : '할 일 추가';

  return (
    <View style={styles.root}>
      <Card theme={theme}>
        <ThemedText style={[styles.counterTitle, { color: ink }]}>{progressLabel}</ThemedText>
        <View style={[styles.track, { backgroundColor: line }]}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }]} />
        </View>
        {doneCount === tasks.length && tasks.length > 0 ? (
          <ThemedText style={[styles.goalBadge, { color: accent }]}>{completeBadge}</ThemedText>
        ) : null}
      </Card>
      <Card theme={theme}>
        {tasks.map((task) => (
          <Pressable
            key={task.id}
            onPress={() => {
              void Haptics.selectionAsync();
              emit({
                ...cfg,
                templateKey,
                checklist: tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
              });
            }}
            style={[styles.checkRow, { borderColor: line }]}>
            <View
              style={[
                styles.checkBox,
                {
                  borderColor: task.done ? accent : line,
                  backgroundColor: task.done ? accent : 'transparent',
                },
              ]}>
              {task.done ? <IconSymbol name="checkmark" size={12} color="#fff" /> : null}
            </View>
            <ThemedText
              style={[
                styles.checkText,
                { color: task.done ? muted : ink },
                variant === 'checklist' && task.done && styles.checkDone,
              ]}>
              {task.text}
            </ThemedText>
            {variant === 'abstain' && task.done ? (
              <ThemedText style={[styles.abstainKeptBadge, { color: accent }]}>지킴</ThemedText>
            ) : null}
            <Pressable
              hitSlop={8}
              onPress={() =>
                emit({
                  ...cfg,
                  templateKey,
                  checklist: tasks.filter((t) => t.id !== task.id),
                })
              }>
              <IconSymbol name="trash" size={14} color={muted} />
            </Pressable>
          </Pressable>
        ))}
        <View style={[styles.addRow, { borderColor: line }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={addPlaceholder}
            placeholderTextColor={muted}
            style={[styles.addInput, { color: ink }]}
            returnKeyType="done"
            onSubmitEditing={() => {
              const text = draft.trim();
              if (!text) return;
              emit({
                ...cfg,
                templateKey,
                checklist: [...tasks, { id: `task_${Date.now()}`, text, done: false }],
              });
              setDraft('');
            }}
          />
          <Pressable
            onPress={() => {
              const text = draft.trim();
              if (!text) return;
              emit({
                ...cfg,
                templateKey,
                checklist: [...tasks, { id: `task_${Date.now()}`, text, done: false }],
              });
              setDraft('');
            }}
            style={[styles.addBtn, { borderColor: ink }]}>
            <ThemedText style={{ color: ink, fontWeight: '800', fontSize: 11 }}>추가</ThemedText>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

function CounterTemplateView({
  cfg,
  emit,
  theme,
  previewMode = false,
}: {
  cfg: Parameters<typeof applyCounterDelta>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
  previewMode?: boolean;
}) {
  const { ink, muted, line, accent } = theme;
  const live = ensureCounterDayBoundary(cfg);
  const unitLabel = resolveCounterUnitLabel(live.unitKey, live.customUnitLabel, live.unitLabel);
  const ratio = live.goalCount > 0 ? Math.min(1, live.currentCount / live.goalCount) : 0;
  const goalReached = live.currentCount >= live.goalCount;
  const remaining = Math.max(0, live.goalCount - live.currentCount);
  const chartValues = live.history.slice(-7).map((entry) => entry.count);
  const [goalDraft, setGoalDraft] = useState(() => String(live.goalCount));
  const [stepDraft, setStepDraft] = useState(() => String(live.stepSize));
  const [secondaryStepDraft, setSecondaryStepDraft] = useState(() => String(live.secondaryStepSize));

  useEffect(() => {
    setGoalDraft(String(live.goalCount));
    setStepDraft(String(live.stepSize));
    setSecondaryStepDraft(String(live.secondaryStepSize));
  }, [live.goalCount, live.stepSize, live.secondaryStepSize]);

  const commitGoal = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    emit(applyCounterActivitySettings(live, { goalCount: parsed }));
  };

  const commitStep = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    emit(applyCounterActivitySettings(live, { stepSize: parsed }));
  };

  const commitSecondaryStep = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    emit(applyCounterActivitySettings(live, { secondaryStepSize: parsed }));
  };

  return (
    <View style={styles.root}>
      <Card theme={theme} gap={10}>
        <SectionLabel color={muted}>횟수 설정</SectionLabel>
        <ThemedText style={[styles.sub, { color: muted }]}>
          이름·단위·목표를 직접 입력하거나 예시를 눌러 채울 수 있어요.
        </ThemedText>

        <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>무엇을 셀까요?</ThemedText>
        <TextInput
          value={live.activityLabel}
          onChangeText={(value) => emit(applyCounterActivitySettings(live, { activityLabel: value }))}
          placeholder="예: 푸쉬업, 독서"
          placeholderTextColor={muted}
          style={[styles.reminderLabelInput, { color: ink, borderColor: line }]}
        />

        <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>단위</ThemedText>
        <View style={styles.moodRow}>
          {COUNTER_UNIT_OPTIONS.map((opt) => {
            const selected = live.unitKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => emit(applyCounterActivitySettings(live, { unitKey: opt.key as CounterUnitKey }))}
                style={[
                  styles.moodChip,
                  {
                    borderColor: selected ? accent : line,
                    backgroundColor: selected ? withAlpha(accent, 0.12) : theme.surface,
                  },
                ]}>
                <ThemedText
                  style={{
                    color: selected ? accent : muted,
                    fontWeight: selected ? '700' : '500',
                    fontSize: 12,
                  }}>
                  {opt.labelKo}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {live.unitKey === 'custom' ? (
          <>
            <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>표시 단위</ThemedText>
            <TextInput
              value={live.customUnitLabel ?? ''}
              onChangeText={(value) =>
                emit(applyCounterActivitySettings(live, { customUnitLabel: value }))
              }
              placeholder="예: 세트, 페이지"
              placeholderTextColor={muted}
              style={[styles.reminderLabelInput, { color: ink, borderColor: line }]}
            />
          </>
        ) : null}

        <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>하루 목표</ThemedText>
        <TextInput
          value={goalDraft}
          onChangeText={setGoalDraft}
          onEndEditing={() => commitGoal(goalDraft)}
          onBlur={() => commitGoal(goalDraft)}
          keyboardType="number-pad"
          placeholder="8"
          placeholderTextColor={muted}
          style={[styles.reminderLabelInput, { color: ink, borderColor: line }]}
        />

        <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>빠른 추가 단위</ThemedText>
        <View style={styles.reminderAddRow}>
          <TextInput
            value={stepDraft}
            onChangeText={setStepDraft}
            onEndEditing={() => commitStep(stepDraft)}
            onBlur={() => commitStep(stepDraft)}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={muted}
            style={[styles.reminderAddInput, { color: ink, borderColor: line, flex: 1 }]}
          />
          <TextInput
            value={secondaryStepDraft}
            onChangeText={setSecondaryStepDraft}
            onEndEditing={() => commitSecondaryStep(secondaryStepDraft)}
            onBlur={() => commitSecondaryStep(secondaryStepDraft)}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor={muted}
            style={[styles.reminderAddInput, { color: ink, borderColor: line, flex: 1 }]}
          />
        </View>

        <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>자주 쓰는 예시</ThemedText>
        <View style={styles.moodRow}>
          {COUNTER_ACTIVITY_PRESETS.map((preset) => {
            const selected =
              live.activityLabel === preset.activityLabel &&
              live.unitKey === preset.unitKey &&
              live.goalCount === preset.goalCount;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  emit(
                    applyCounterActivityPreset(live, preset, {
                      includeSampleData: previewMode,
                    }),
                  );
                }}
                style={[
                  styles.moodChip,
                  {
                    borderColor: selected ? accent : line,
                    backgroundColor: selected ? withAlpha(accent, 0.12) : theme.surface,
                  },
                ]}>
                <ThemedText
                  style={{
                    color: selected ? accent : muted,
                    fontWeight: selected ? '700' : '500',
                    fontSize: 12,
                  }}>
                  {preset.activityLabel}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card theme={theme} gap={12}>
        <SectionLabel color={muted}>{live.activityLabel.trim() || '횟수'}</SectionLabel>
        <View style={styles.counterValueRow}>
          <ThemedText style={[styles.heroValue, { color: ink }]}>{live.currentCount}</ThemedText>
          <ThemedText style={[styles.counterSlash, { color: muted }]}> / {live.goalCount}</ThemedText>
          {unitLabel ? (
            <ThemedText style={[styles.heroUnit, { color: muted }]}> {unitLabel}</ThemedText>
          ) : null}
        </View>
        <View style={[styles.track, { backgroundColor: line }]}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }]} />
        </View>
        <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
          {goalReached
            ? '목표 달성!'
            : `${Math.round(ratio * 100)}% · ${formatCounterRemainingMessage(remaining, unitLabel)}`}
        </ThemedText>
      </Card>

      {chartValues.length >= 2 ? (
        <Card theme={theme}>
          <SectionLabel color={muted}>최근 7일 추이</SectionLabel>
          <MiniBarChart values={chartValues} goal={live.goalCount} accent={accent} muted={muted} />
        </Card>
      ) : null}

      <Card theme={theme} gap={10}>
        <View style={styles.counterPrimaryRow}>
          <Pressable
            disabled={live.currentCount <= 0}
            accessibilityRole="button"
            accessibilityLabel={`${live.stepSize}만큼 줄이기`}
            accessibilityState={{ disabled: live.currentCount <= 0 }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              emit(applyCounterDelta(live, -live.stepSize));
            }}
            style={[
              styles.bigCounterBtn,
              {
                backgroundColor: theme.surface,
                borderColor: line,
                opacity: live.currentCount <= 0 ? 0.4 : 1,
              },
            ]}>
            <ThemedText style={[styles.bigCounterText, { color: ink }]}>−{live.stepSize}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${live.stepSize}만큼 늘리기`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              emit(applyCounterDelta(live, live.stepSize));
            }}
            style={[styles.bigCounterBtn, { backgroundColor: accent, borderColor: '#000' }]}>
            <ThemedText style={[styles.bigCounterText, styles.bigCounterTextOnAccent]}>
              +{live.stepSize}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
          잘못 눌렀으면 왼쪽 − 버튼으로 되돌릴 수 있어요
        </ThemedText>
        <View style={styles.counterRow}>
          <Pressable
            disabled={live.currentCount <= 0}
            onPress={() => emit(applyCounterDelta(live, -live.secondaryStepSize))}
            style={[
              styles.counterBtn,
              { borderColor: line, opacity: live.currentCount <= 0 ? 0.35 : 1 },
            ]}>
            <ThemedText style={{ color: ink, fontWeight: '700' }}>−{live.secondaryStepSize}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => emit(applyCounterDelta(live, live.secondaryStepSize))}
            style={[styles.counterBtn, { borderColor: line }]}>
            <ThemedText style={{ color: ink, fontWeight: '700' }}>+{live.secondaryStepSize}</ThemedText>
          </Pressable>
          {!goalReached ? (
            <Pressable
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                emit(applyCounterFillRemaining(live));
              }}
              style={[styles.counterBtn, { borderColor: accent }]}>
              <ThemedText style={{ color: accent, fontWeight: '700', fontSize: 12 }}>목표까지</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => emit(resetCounterCount(live))}
              style={[styles.counterBtn, { borderColor: line }]}>
              <ThemedText style={{ color: muted, fontWeight: '600', fontSize: 12 }}>리셋</ThemedText>
            </Pressable>
          )}
        </View>
        {!goalReached ? (
          <Pressable onPress={() => emit(resetCounterCount(live))} style={styles.textActionBtn}>
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>오늘 기록 초기화</ThemedText>
          </Pressable>
        ) : null}
        {live.dailyReset ? (
          <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
            자정에 횟수가 초기화돼요
          </ThemedText>
        ) : null}
      </Card>
    </View>
  );
}

function ReminderTemplateView({
  cfg,
  emit,
  theme,
  previewMode = false,
  allowScheduleCompletion = true,
}: {
  cfg: Parameters<typeof toggleReminderTimeDone>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
  previewMode?: boolean;
  allowScheduleCompletion?: boolean;
}) {
  const { ink, muted, line, surface, accent } = theme;
  const { done, total } = reminderProgress(cfg);
  const nextTime = resolveNextReminderTime(cfg);
  const nextItem = nextTime ? findReminderScheduleItem(cfg.reminderItems, nextTime) : undefined;
  const minsLeft = nextTime ? minutesUntilReminder(nextTime) : 0;
  const countdown = nextTime ? formatReminderCountdown(minsLeft, nextTime) : '';
  const isDefaultOnly =
    cfg.reminderItems.length === 1 &&
    cfg.reminderItems[0]?.time === '09:00' &&
    !cfg.reminderItems[0]?.label.trim();
  const showPresetPicker = previewMode || (!allowScheduleCompletion && isDefaultOnly);
  const [draftTime, setDraftTime] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [expandedTimeKey, setExpandedTimeKey] = useState<string | null>(null);
  const [addTimeExpanded, setAddTimeExpanded] = useState(false);
  const canAddMore = cfg.reminderItems.length < MAX_CUSTOM_REMINDER_TIMES;

  const openTimePicker = useCallback((key: string) => {
    setAddTimeExpanded(false);
    setExpandedTimeKey((cur) => (cur === key ? null : key));
  }, []);

  const openAddTimePicker = useCallback(() => {
    setExpandedTimeKey(null);
    setAddTimeExpanded((cur) => {
      const next = !cur;
      if (next && !draftTime) setDraftTime('12:00');
      return next;
    });
  }, [draftTime]);

  const handleAdd = () => {
    const timeToUse = draftTime.trim() || '12:00';
    const next = addReminderScheduleItem(cfg, timeToUse, draftLabel);
    if (!next) {
      setAddError('이미 같은 시간이 있거나 추가할 수 없어요.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setAddError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    emit(next);
    setDraftTime('');
    setDraftLabel('');
    setAddTimeExpanded(false);
  };

  const handleRemove = (time: string) => {
    void Haptics.selectionAsync();
    emit(removeReminderScheduleItem(cfg, time));
  };

  return (
    <View style={styles.root}>
      {showPresetPicker ? (
        <Card theme={theme} gap={8}>
          <SectionLabel color={muted}>예시 불러오기</SectionLabel>
          <ThemedText style={[styles.sub, { color: muted }]}>
            예시를 누르거나 아래에서 직접 추가·수정할 수 있어요.
          </ThemedText>
          <View style={styles.moodRow}>
            {REMINDER_SCHEDULE_PRESETS.map((preset) => {
              const selected = isReminderPresetActive(cfg.reminderItems, preset);
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    emit(
                      applyReminderSchedulePreset(cfg, preset, {
                        includeDemoProgress: previewMode,
                      }),
                    );
                  }}
                  style={[
                    styles.moodChip,
                    {
                      borderColor: selected ? accent : line,
                      backgroundColor: selected ? withAlpha(accent, 0.12) : surface,
                    },
                  ]}>
                  <ThemedText
                    style={{
                      color: selected ? accent : muted,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 12,
                    }}>
                    {preset.title}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {allowScheduleCompletion ? (
        <Card theme={theme}>
          <ThemedText style={[styles.sub, { color: muted }]}>
            {done}/{total} 완료
          </ThemedText>
          {nextTime ? (
            <ThemedText style={[styles.nextReminder, { color: ink }]}>
              다음 · {resolveReminderItemTitle(nextItem ?? { time: nextTime, label: '' })} · {formatHhmmClockKo(nextTime)}
              {countdown ? ` · ${countdown}` : ''}
            </ThemedText>
          ) : (
            <ThemedText style={[styles.goalBadge, { color: accent }]}>오늘 알림 모두 완료</ThemedText>
          )}
          <View style={[styles.track, { backgroundColor: line, marginTop: 4 }]}>
            <View
              style={[
                styles.fill,
                { width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%', backgroundColor: accent },
              ]}
            />
          </View>
        </Card>
      ) : null}

      <Card theme={theme} gap={10}>
        <SectionLabel color={muted}>알림 목록</SectionLabel>
        {cfg.reminderItems.length === 0 ? (
          <ThemedText style={[styles.sub, { color: muted }]}>아래에서 알림을 추가해 주세요.</ThemedText>
        ) : null}
        {cfg.reminderItems.map((item) => {
          const checked = cfg.completedTimes.includes(item.time);
          const isNext = allowScheduleCompletion && nextTime === item.time && !checked;
          return (
            <View
              key={item.time}
              style={[
                styles.reminderEditRow,
                { borderColor: line },
                isNext && {
                  borderColor: accent,
                  backgroundColor: withAlpha(accent, 0.06),
                },
              ]}>
              <View style={styles.reminderEditMain}>
                {allowScheduleCompletion ? (
                  <View style={styles.reminderEditHeader}>
                    <IconSymbol name="bell" size={16} color={isNext ? accent : muted} />
                    <ThemedText style={[styles.reminderMeta, { color: isNext ? accent : muted, flex: 1 }]}>
                      {checked ? '완료' : isNext ? '다음 알림' : '예정'}
                    </ThemedText>
                  </View>
                ) : null}
                <ReminderTimePickerPill
                  valueHhmm={item.time}
                  onChangeHhmm={(next) => {
                    const updated = updateReminderItemTime(cfg, item.time, next);
                    if (updated) {
                      emit(updated);
                      setExpandedTimeKey(next);
                    }
                  }}
                  expanded={expandedTimeKey === item.time}
                  onToggleExpand={() => openTimePicker(item.time)}
                  ink={ink}
                  muted={muted}
                  line={line}
                  surface={surface}
                />
                <TextInput
                  value={item.label}
                  onChangeText={(value) => emit(updateReminderItemLabel(cfg, item.time, value))}
                  placeholder="어떤 알림인지 적어 주세요"
                  placeholderTextColor={muted}
                  style={[styles.reminderLabelInput, { color: ink, borderColor: line }]}
                />
              </View>
              <View style={styles.reminderEditActions}>
                {allowScheduleCompletion ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={checked ? '완료 취소' : '완료'}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      emit(toggleReminderTimeDone(cfg, item.time));
                    }}
                    style={[
                      styles.checkBox,
                      {
                        borderColor: checked ? accent : line,
                        backgroundColor: checked ? accent : surface,
                      },
                    ]}>
                    {checked ? <IconSymbol name="checkmark" size={10} color="#fff" /> : null}
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="알림 삭제"
                  onPress={() => handleRemove(item.time)}
                  hitSlop={8}
                  style={styles.reminderDeleteBtn}>
                  <IconSymbol name="trash" size={16} color={muted} />
                  <ThemedText style={[styles.reminderRemove, { color: muted }]}>삭제</ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </Card>

      {canAddMore ? (
        <Card theme={theme} gap={8}>
          <SectionLabel color={muted}>알림 추가</SectionLabel>
          <ReminderTimePickerPill
            valueHhmm={draftTime}
            onChangeHhmm={(next) => {
              setDraftTime(next);
              setAddError(null);
            }}
            expanded={addTimeExpanded}
            onToggleExpand={openAddTimePicker}
            ink={ink}
            muted={muted}
            line={line}
            surface={surface}
            placeholder="시간 선택"
            accessibilityLabel="새 알림 시간"
          />
          <TextInput
            value={draftLabel}
            onChangeText={(value) => {
              setDraftLabel(value);
              setAddError(null);
            }}
            placeholder="예: 물 마시기"
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line }]}
          />
          {addError ? (
            <ThemedText style={[styles.sub, { color: accent }]}>{addError}</ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleAdd}
            style={[styles.reminderAddBtn, { borderColor: accent, alignSelf: 'flex-start' }]}>
            <ThemedText style={{ color: accent, fontWeight: '700', fontSize: 13 }}>추가</ThemedText>
          </Pressable>
        </Card>
      ) : (
        <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
          알림은 최대 {MAX_CUSTOM_REMINDER_TIMES}개까지 추가할 수 있어요.
        </ThemedText>
      )}
    </View>
  );
}

export function CustomFlowTemplateSessionBody({
  templateKey,
  config: rawConfig,
  onChange,
  theme,
  block,
  sessionProgress = 0,
  previewMode = false,
  allowScheduleCompletion = true,
}: Props) {
  const { ink, muted, line, surface, accent } = theme;
  const cfg = useMemo(
    () => normalizeCustomFlowDetailConfig(templateKey, rawConfig),
    [templateKey, rawConfig],
  );

  const emit = (next: unknown) => onChange(next);

  switch (templateKey) {
    case 'measurement': {
      if (!('metricLabel' in cfg)) return null;
      return <MeasurementTemplateView cfg={cfg} emit={emit} theme={theme} previewMode={previewMode} />;
    }

    case 'counter': {
      if (!('goalCount' in cfg)) return null;
      return <CounterTemplateView cfg={cfg} emit={emit} theme={theme} previewMode={previewMode} />;
    }

    case 'habit': {
      if (!('doneToday' in cfg)) return null;
      const weekDots = buildHabitWeekDots(cfg.recentDoneDateKeys);
      return (
        <View style={styles.root}>
          <Card theme={theme}>
            {cfg.streakDays > 0 ? (
              <View style={[styles.streakBadge, { borderColor: accent }]}>
                <ThemedText style={{ color: accent, fontWeight: '800', fontSize: 15 }}>
                  🔥 {cfg.streakDays}일 연속
                </ThemedText>
              </View>
            ) : null}
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                emit(applyHabitDoneToggle(cfg));
              }}
              style={[
                styles.habitBtn,
                { backgroundColor: cfg.doneToday ? accent : surface, borderColor: accent },
              ]}>
              <ThemedText style={{ color: cfg.doneToday ? '#fff' : ink, fontWeight: '800', fontSize: 18 }}>
                {cfg.doneToday ? '오늘 완료 ✓' : '오늘 했어요'}
              </ThemedText>
            </Pressable>
          </Card>
          <Card theme={theme}>
            <SectionLabel color={muted}>이번 주</SectionLabel>
            <WeekDots dots={weekDots} accent={accent} muted={muted} ink={ink} />
          </Card>
        </View>
      );
    }

    case 'focus': {
      if (!('planMin' in cfg)) return null;
      const blockSec = block ? blockDurationSec(block) : cfg.planMin * 60;
      const elapsedMin = focusElapsedMinFromSession(cfg.planMin, sessionProgress, blockSec);
      const remainMin = Math.max(0, cfg.planMin - elapsedMin);
      const focusRatio = cfg.planMin > 0 ? Math.min(1, elapsedMin / cfg.planMin) : 0;
      return (
        <View style={styles.root}>
          <Card theme={theme}>
            <ThemedText style={[styles.timerValue, { color: ink }]}>
              {String(Math.floor(remainMin)).padStart(2, '0')}:
              {String(Math.round((remainMin % 1) * 60)).padStart(2, '0')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>남은 집중 시간</ThemedText>
            <View style={[styles.track, { backgroundColor: line, marginTop: 8 }]}>
              <View style={[styles.fill, { width: `${Math.round(focusRatio * 100)}%`, backgroundColor: accent }]} />
            </View>
          </Card>
          <View style={styles.splitRow}>
            <View style={[styles.splitCard, { borderColor: line, backgroundColor: surface }]}>
              <ThemedText style={[styles.splitLabel, { color: muted }]}>목표</ThemedText>
              <ThemedText style={[styles.splitValue, { color: ink }]}>{cfg.planMin}분</ThemedText>
            </View>
            <View style={[styles.splitCard, { borderColor: line, backgroundColor: surface }]}>
              <ThemedText style={[styles.splitLabel, { color: muted }]}>집중</ThemedText>
              <ThemedText style={[styles.splitValue, { color: ink }]}>{elapsedMin}분</ThemedText>
            </View>
          </View>
          {cfg.focusMemo.trim() ? (
            <Card theme={theme}>
              <SectionLabel color={muted}>집중 메모</SectionLabel>
              <ThemedText style={{ color: ink, fontSize: 14, lineHeight: 20 }}>{cfg.focusMemo.trim()}</ThemedText>
            </Card>
          ) : null}
        </View>
      );
    }

    case 'journal': {
      if (!('prompt' in cfg)) return null;
      return <JournalTemplateView cfg={cfg} emit={emit} theme={theme} />;
    }

    case 'memo': {
      if (!('recentEntries' in cfg) || 'prompt' in cfg) return null;
      return <MemoTemplateView cfg={cfg} emit={emit} theme={theme} />;
    }

    case 'reminder': {
      if (!('reminderTimes' in cfg)) return null;
      return (
        <ReminderTemplateView
          cfg={cfg}
          emit={emit}
          theme={theme}
          previewMode={previewMode}
          allowScheduleCompletion={allowScheduleCompletion}
        />
      );
    }

    case 'abstain': {
      if (!('checklist' in cfg)) return null;
      return <ChecklistTemplateView cfg={cfg} emit={emit} theme={theme} variant="abstain" />;
    }

    case 'checklist':
    default: {
      if (!('checklist' in cfg)) return null;
      return <ChecklistTemplateView cfg={cfg} emit={emit} theme={theme} variant="checklist" />;
    }
  }
}

const styles = StyleSheet.create({
  root: { gap: 10, width: '100%' },
  card: { borderWidth: 2, padding: 14, width: '100%' },
  cardFlushList: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sub: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 2,
  },
  counterFieldLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  counterValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap',
    minHeight: 52,
    paddingVertical: 4,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 48,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  deltaLine: { fontSize: 14, fontWeight: '700' },
  track: { height: 6, overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56, marginTop: 4 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarTrack: { width: '100%', height: 48, justifyContent: 'flex-end' },
  chartBarFill: { width: '100%' },
  badge: { fontSize: 12, fontWeight: '600', lineHeight: 17, borderWidth: 1, padding: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { minWidth: 52, minHeight: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  measureInput: { flex: 1, borderWidth: 2, minHeight: 48, paddingHorizontal: 12, fontSize: 22, fontWeight: '800' },
  primaryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterTitle: { fontSize: 15, fontWeight: '700' },
  counterSlash: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  goalBadge: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  counterPrimaryRow: { flexDirection: 'row', gap: 8 },
  bigCounterBtn: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  bigCounterText: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  bigCounterTextOnAccent: { color: '#fff' },
  counterRow: { flexDirection: 'row', gap: 8 },
  counterBtn: { flex: 1, minHeight: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  textActionBtn: { paddingVertical: 4 },
  streakBadge: { alignSelf: 'center', borderWidth: 2, paddingHorizontal: 14, paddingVertical: 8 },
  habitBtn: { minHeight: 56, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weekCol: { alignItems: 'center', gap: 4 },
  weekDot: { width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 10, fontWeight: '600' },
  timerValue: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 52,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  splitRow: { flexDirection: 'row', gap: 10 },
  splitCard: { flex: 1, borderWidth: 2, padding: 12, alignItems: 'center' },
  splitLabel: { fontSize: 11, fontWeight: '700' },
  splitValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 30,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  prompt: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moodChip: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8 },
  journalInput: { borderWidth: 2, minHeight: 96, padding: 10, fontSize: 15, lineHeight: 22 },
  entryRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  entryMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  entryDate: { fontSize: 11, fontWeight: '600' },
  entryMood: { fontSize: 11, fontWeight: '700' },
  entryText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  nextReminder: { fontSize: 15, fontWeight: '700', marginTop: 4, lineHeight: 21, flexShrink: 1 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  reminderTextCol: { flex: 1, gap: 2 },
  reminderTime: { fontSize: 18, fontWeight: '700' },
  reminderMeta: { fontSize: 12, fontWeight: '500' },
  reminderEditRow: {
    borderWidth: 2,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reminderEditMain: { flex: 1, gap: 8, minWidth: 0 },
  reminderEditHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reminderLabelInput: {
    borderWidth: 2,
    minHeight: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderEditActions: { alignItems: 'center', gap: 8, paddingTop: 2 },
  reminderDeleteBtn: { alignItems: 'center', gap: 4, minWidth: 40 },
  reminderRemove: { fontSize: 11, fontWeight: '600' },
  reminderAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reminderAddInput: {
    borderWidth: 2,
    minHeight: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderAddBtn: {
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 4 },
  addInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 6 },
  addBtn: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  checkBox: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 16, fontWeight: '600' },
  checkDone: { textDecorationLine: 'line-through', opacity: 0.55 },
  abstainKeptBadge: { fontSize: 11, fontWeight: '800', marginLeft: 'auto', marginRight: 4 },
});
