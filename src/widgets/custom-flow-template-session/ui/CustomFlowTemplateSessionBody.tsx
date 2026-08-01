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
  blockDurationSec,
  buildHabitWeekDots,
  COUNTER_ACTIVITY_PRESETS,
  ensureCounterDayBoundary,
  focusElapsedMinFromSession,
  findReminderScheduleItem,
  formatMeasurementDelta,
  formatMeasurementValue,
  formatReminderCountdown,
  formatHhmmClockKo,
  JOURNAL_MOOD_OPTIONS,
  measurementQuickDeltas,
  measurementRecordedToday,
  MEASUREMENT_METRIC_PRESETS,
  minutesUntilReminder,
  normalizeCustomFlowDetailConfig,
  reminderProgress,
  removeReminderScheduleItem,
  resetCounterCount,
  resolveMeasurementUnitLabel,
  resolveNextReminderTime,
  resolveReminderItemTitle,
  roundMeasurementValue,
  suggestNextReminderTime,
  toggleReminderTimeDone,
  updateReminderItemLabel,
  updateReminderItemTime,
  type CustomFlowTemplateKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import {
  COMPLETION_CHECKED_COLOR_DARK,
  COMPLETION_CHECKED_COLOR_LIGHT,
  completionCheckIconColor,
} from '@shared/ui/completion-radio-button';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
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

/** 완료 체크 채움 — 카테고리 accent 대신 Soft Mint */
function completionCheckFill(theme: TemplateSessionTheme): string {
  const ink = theme.ink.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/i.exec(ink);
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT;
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(ink);
  if (rgb) {
    const luminance =
      (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
    return luminance > 0.55 ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT;
  }
  return COMPLETION_CHECKED_COLOR_LIGHT;
}

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

/** 시안 `.brutal-shadow` — 배경색은 호출측 surface 유지 */
function ReminderBrutalShell({
  borderColor,
  shadowColor,
  backgroundColor,
  borderWidth = RETRO_BORDER_WIDTH,
  shadowSize = 2,
  style,
  children,
}: {
  borderColor: string;
  shadowColor: string;
  backgroundColor: string;
  borderWidth?: number;
  shadowSize?: number;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ marginRight: shadowSize, marginBottom: shadowSize }, style]}>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: shadowColor,
            borderWidth,
            borderColor,
          },
          {
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      <View
        style={{
          backgroundColor,
          borderWidth,
          borderColor,
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
        }}>
        {children}
      </View>
    </View>
  );
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

function WeekDots({
  dots,
  muted,
  ink,
  checkFill,
}: {
  dots: boolean[];
  muted: string;
  ink: string;
  checkFill: string;
}) {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const checkIcon = completionCheckIconColor(checkFill);
  return (
    <View style={styles.weekRow}>
      {dots.map((done, idx) => (
        <View key={labels[idx]} style={styles.weekCol}>
          <View
            style={[
              styles.weekDot,
              {
                borderColor: done ? checkFill : muted,
                backgroundColor: done ? checkFill : 'transparent',
              },
            ]}>
            {done ? <IconSymbol name="checkmark" size={10} color={checkIcon} /> : null}
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
  const { ink, muted, line, surface } = theme;
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
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
  const metricTitle = cfg.metricLabel.trim() || '기록';
  const displayValue =
    cfg.currentValue > 0 ? formatMeasurementValue(cfg.currentValue, cfg.unit) : '—';

  const applyDelta = (d: number) => {
    const base = Number.isFinite(parsed) ? parsed : cfg.currentValue;
    setDraft(String(roundMeasurementValue(base + d, cfg.unit)));
  };

  return (
    <View style={[styles.root, styles.measureRoot]}>
      {showPresetPicker ? (
        <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.measureCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>
              무엇을 기록할까요?
            </ThemedText>
            <ThemedText style={[styles.sub, { color: muted }]}>
              예시를 눌러 단위·목표가 바뀌는 걸 체험해 보세요.
            </ThemedText>
            <View style={styles.counterChipRow}>
              {MEASUREMENT_METRIC_PRESETS.map((preset) => {
                const selected =
                  cfg.metricLabel === preset.metricLabel && cfg.unit === preset.unit;
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
                    style={({ pressed }) => [
                      styles.counterChip,
                      {
                        borderColor: selected ? tone.primary : line,
                        backgroundColor: selected ? tone.primaryContainer : surface,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.counterChipText,
                        {
                          color: selected ? tone.text : muted,
                          fontWeight: selected ? '800' : '600',
                        },
                      ]}>
                      {preset.metricLabel}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterProgressInner}>
          <View style={styles.reminderProgressTop}>
            <View style={styles.reminderProgressHero}>
              <View style={styles.reminderProgressCountRow}>
                <ThemedText
                  style={[styles.reminderProgressCount, { color: tone.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}>
                  {displayValue}
                </ThemedText>
                {unit ? (
                  <ThemedText style={[styles.reminderProgressLabel, { color: muted }]}>
                    {unit}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <View style={styles.reminderNextBlock}>
              <ThemedText style={[styles.reminderNextKicker, { color: tone.primary }]}>
                {metricTitle}
              </ThemedText>
              {delta ? (
                <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                  어제 대비 {delta}
                  {unit ? ` ${unit}` : ''}
                </ThemedText>
              ) : cfg.previousValue > 0 ? (
                <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                  이전 {formatMeasurementValue(cfg.previousValue, cfg.unit)}
                  {unit ? ` ${unit}` : ''}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                  {recordedToday ? '오늘 기록됨' : '아직 기록 없음'}
                </ThemedText>
              )}
              {goalRatio != null ? (
                <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                  목표 {formatMeasurementValue(cfg.goalValue, cfg.unit)}
                  {unit ? ` ${unit}` : ''} · {Math.round(goalRatio * 100)}%
                </ThemedText>
              ) : (
                <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                  {cfg.history.length > 0 ? `${cfg.history.length}회 기록` : '값 기록'}
                </ThemedText>
              )}
            </View>
          </View>
          {goalRatio != null ? (
            <View style={[styles.reminderProgressTrack, { borderColor: line }]}>
              <View
                style={[
                  styles.reminderProgressFill,
                  {
                    width: `${Math.round(goalRatio * 100)}%`,
                    backgroundColor: tone.primaryContainer,
                    borderRightWidth: goalRatio > 0 && goalRatio < 1 ? RETRO_BORDER_WIDTH : 0,
                    borderRightColor: line,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </ReminderBrutalShell>

      {chartValues.length >= 2 ? (
        <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.measureCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>최근 7일 추이</ThemedText>
            <MiniBarChart
              values={chartValues}
              goal={cfg.useGoalValue ? cfg.goalValue : undefined}
              accent={tone.primary}
              muted={muted}
            />
          </View>
        </ReminderBrutalShell>
      ) : null}

      {cfg.unit !== 'none' || cfg.metricLabel.trim().length > 0 ? (
        <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.measureCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>값 입력</ThemedText>
            {recordedToday ? (
              <View
                style={[
                  styles.measureStatusChip,
                  { borderColor: line, backgroundColor: tone.primaryContainer },
                ]}>
                <ThemedText style={[styles.measureStatusChipText, { color: tone.text }]}>
                  오늘 기록 완료 · 수정 후 다시 저장하세요
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.quickRow}>
              {quickDeltas.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    applyDelta(d);
                  }}
                  style={({ pressed }) => [
                    styles.measureQuickBtn,
                    {
                      borderColor: line,
                      backgroundColor: surface,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <ThemedText style={[styles.measureQuickBtnText, { color: ink }]}>
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
                style={[
                  styles.measureInput,
                  { color: ink, borderColor: line, backgroundColor: surface },
                ]}
              />
              {unit ? (
                <ThemedText style={[styles.measureUnitLabel, { color: muted }]}>{unit}</ThemedText>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="기록 저장"
              onPress={() => {
                const raw = parseFloat(draft.replace(',', '.'));
                if (!Number.isFinite(raw)) return;
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                emit(applyMeasurementSave(cfg, raw));
              }}
              style={({ pressed }) => [
                styles.memoSaveBtn,
                {
                  borderColor: line,
                  backgroundColor: ink,
                  opacity: pressed ? 0.9 : 1,
                },
                pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
              ]}>
              <ThemedText style={[styles.memoSaveBtnText, { color: selectedFg }]}>기록 저장</ThemedText>
            </Pressable>
          </View>
        </ReminderBrutalShell>
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
  const { ink, muted, line, surface } = theme;
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const [draft, setDraft] = useState(cfg.lastEntry ?? '');
  const recent = cfg.recentEntries.slice(0, 5);
  const draftLen = draft.trim().length;
  const hasDraft = draftLen > 0;

  useEffect(() => {
    setDraft(cfg.lastEntry ?? '');
  }, [cfg.lastEntry]);

  const handleSave = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    emit(applyMemoSave(cfg, draft));
  };

  return (
    <View style={[styles.root, styles.memoRoot]}>
      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.memoCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>메모 작성</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              {hasDraft ? `${draftLen}자` : '비어 있음'}
            </ThemedText>
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="메모를 적어요"
            placeholderTextColor={muted}
            textAlignVertical="top"
            style={[
              styles.memoInput,
              { color: ink, borderColor: line, backgroundColor: surface },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메모 저장"
            onPress={handleSave}
            style={({ pressed }) => [
              styles.memoSaveBtn,
              {
                borderColor: line,
                backgroundColor: ink,
                opacity: pressed ? 0.9 : 1,
              },
              pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
            ]}>
            <ThemedText style={[styles.memoSaveBtnText, { color: selectedFg }]}>저장</ThemedText>
          </Pressable>
        </View>
      </ReminderBrutalShell>

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.memoCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>최근 메모</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              {recent.length}개
            </ThemedText>
          </View>
          {recent.length === 0 ? (
            <ThemedText style={[styles.sub, { color: muted }]}>
              저장하면 최근 메모가 여기에 쌓여요.
            </ThemedText>
          ) : (
            recent.map((entry, idx) => (
              <View
                key={`${entry.dateKey}-${idx}`}
                style={[
                  styles.memoEntryRow,
                  idx < recent.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: line,
                  },
                ]}>
                <View
                  style={[
                    styles.memoEntryDateChip,
                    { borderColor: line, backgroundColor: tone.primaryContainer },
                  ]}>
                  <ThemedText style={[styles.memoEntryDateText, { color: tone.text }]}>
                    {entry.dateKey ? entry.dateKey.slice(5) : '오늘'}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.memoEntryText, { color: ink }]} numberOfLines={3}>
                  {entry.text}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </ReminderBrutalShell>
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
  const { ink, muted, line, surface } = theme;
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const tasks = cfg.checklist;
  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const ratio = total > 0 ? doneCount / total : 0;
  const [draft, setDraft] = useState('');
  const templateKey = variant === 'abstain' ? 'abstain' : 'checklist';
  const remaining = Math.max(0, total - doneCount);
  const allDone = total > 0 && doneCount === total;
  const completeBadge =
    variant === 'abstain' ? '모든 금지를 지켰어요!' : '모든 할 일 완료!';
  const addPlaceholder = variant === 'abstain' ? '금지 항목 추가' : '할 일 추가';
  const sectionTitle = variant === 'abstain' ? '금지 목록' : '할 일 목록';
  const statusKicker = variant === 'abstain' ? '지킴' : '완료';
  const remainingLabel =
    variant === 'abstain'
      ? remaining > 0
        ? `${remaining}개 남음`
        : '전부 지킴'
      : remaining > 0
        ? `${remaining}개 남음`
        : '모두 완료';

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    void Haptics.selectionAsync();
    emit({
      ...cfg,
      templateKey,
      checklist: [...tasks, { id: `task_${Date.now()}`, text, done: false }],
    });
    setDraft('');
  };

  return (
    <View style={[styles.root, styles.checklistRoot]}>
      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterProgressInner}>
          <View style={styles.reminderProgressTop}>
            <View style={styles.reminderProgressHero}>
              <View style={styles.reminderProgressCountRow}>
                <ThemedText style={[styles.reminderProgressCount, { color: tone.primary }]}>
                  {doneCount}
                </ThemedText>
                <ThemedText style={[styles.reminderProgressTotal, { color: muted }]}>
                  /{total}
                </ThemedText>
                <ThemedText style={[styles.reminderProgressLabel, { color: muted }]}>
                  {statusKicker}
                </ThemedText>
              </View>
            </View>
            <View style={styles.reminderNextBlock}>
              <ThemedText style={[styles.reminderNextKicker, { color: tone.primary }]}>
                {sectionTitle}
              </ThemedText>
              <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                {allDone ? completeBadge : remainingLabel}
              </ThemedText>
              <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                {Math.round(ratio * 100)}%
              </ThemedText>
            </View>
          </View>
          <View style={[styles.reminderProgressTrack, { borderColor: line }]}>
            <View
              style={[
                styles.reminderProgressFill,
                {
                  width: `${Math.round(ratio * 100)}%`,
                  backgroundColor: tone.primaryContainer,
                  borderRightWidth: ratio > 0 && ratio < 1 ? RETRO_BORDER_WIDTH : 0,
                  borderRightColor: line,
                },
              ]}
            />
          </View>
        </View>
      </ReminderBrutalShell>

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.checklistCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{sectionTitle}</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>{total}개</ThemedText>
          </View>

          {tasks.length === 0 ? (
            <ThemedText style={[styles.sub, { color: muted }]}>아래에서 항목을 추가해 주세요.</ThemedText>
          ) : null}

          {tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.checklistItem,
                index < tasks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line },
              ]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  emit({
                    ...cfg,
                    templateKey,
                    checklist: tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
                  });
                }}
                style={styles.checklistItemMain}>
                <View
                  style={[
                    styles.checkBox,
                    {
                      borderColor: task.done ? tone.primary : line,
                      backgroundColor: task.done ? tone.primaryContainer : surface,
                    },
                  ]}>
                  {task.done ? (
                    <IconSymbol name="checkmark" size={12} color={tone.text} />
                  ) : null}
                </View>
                <ThemedText
                  style={[
                    styles.checkText,
                    { color: task.done ? muted : ink },
                    variant === 'checklist' && task.done && styles.checkDone,
                  ]}
                  numberOfLines={3}>
                  {task.text}
                </ThemedText>
                {variant === 'abstain' && task.done ? (
                  <View
                    style={[
                      styles.checklistKeptChip,
                      { borderColor: line, backgroundColor: tone.primaryContainer },
                    ]}>
                    <ThemedText style={[styles.checklistKeptChipText, { color: tone.text }]}>
                      지킴
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="항목 삭제"
                hitSlop={6}
                onPress={() => {
                  void Haptics.selectionAsync();
                  emit({
                    ...cfg,
                    templateKey,
                    checklist: tasks.filter((t) => t.id !== task.id),
                  });
                }}
                style={({ pressed }) => [
                  styles.reminderDeleteBtn,
                  {
                    borderColor: line,
                    backgroundColor: surface,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <IconSymbol name="trash" size={13} color={muted} />
              </Pressable>
            </View>
          ))}

          <View style={[styles.checklistAddRow, { borderColor: line }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={addPlaceholder}
              placeholderTextColor={muted}
              style={[styles.checklistAddInput, { color: ink }]}
              returnKeyType="done"
              onSubmitEditing={addTask}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="추가"
              onPress={addTask}
              style={({ pressed }) => [
                styles.checklistAddBtn,
                {
                  borderLeftColor: line,
                  backgroundColor: ink,
                  opacity: pressed ? 0.9 : 1,
                },
                pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
              ]}>
              <ThemedText style={[styles.checklistAddBtnText, { color: selectedFg }]}>추가</ThemedText>
            </Pressable>
          </View>
        </View>
      </ReminderBrutalShell>
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
  const { ink, muted, line, surface } = theme;
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const live = ensureCounterDayBoundary(cfg);
  const ratio = live.goalCount > 0 ? Math.min(1, live.currentCount / live.goalCount) : 0;
  const goalReached = live.currentCount >= live.goalCount;
  const remaining = Math.max(0, live.goalCount - live.currentCount);
  const chartValues = live.history.slice(-7).map((entry) => entry.count);
  const remainingMessage =
    remaining <= 0 ? '목표를 달성했어요!' : `${remaining}번 더 하면 목표예요`;
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

  const renderChip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.counterChip,
        {
          borderColor: selected ? tone.primary : line,
          backgroundColor: selected ? tone.primaryContainer : surface,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <ThemedText
        style={[
          styles.counterChipText,
          { color: selected ? tone.text : muted, fontWeight: selected ? '800' : '600' },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const activityTitle = live.activityLabel.trim() || '횟수';

  return (
    <View style={[styles.root, styles.counterRoot]}>
      {previewMode ? (
        <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.counterCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>
              자주 쓰는 예시
            </ThemedText>
            <ThemedText style={[styles.sub, { color: muted }]}>
              예시를 누르면 이름·목표가 채워져요.
            </ThemedText>
            <View style={styles.counterChipRow}>
              {COUNTER_ACTIVITY_PRESETS.map((preset) => {
                const selected =
                  live.activityLabel === preset.activityLabel &&
                  live.goalCount === preset.goalCount;
                return renderChip(preset.id, preset.activityLabel, selected, () => {
                  void Haptics.selectionAsync();
                  emit(
                    applyCounterActivityPreset(live, preset, {
                      includeSampleData: previewMode,
                    }),
                  );
                });
              })}
            </View>
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterProgressInner}>
          <View style={styles.reminderProgressTop}>
            <View style={styles.reminderProgressHero}>
              <View style={styles.reminderProgressCountRow}>
                <ThemedText style={[styles.reminderProgressCount, { color: tone.primary }]}>
                  {live.currentCount}
                </ThemedText>
                <ThemedText style={[styles.reminderProgressTotal, { color: muted }]}>
                  /{live.goalCount}
                </ThemedText>
              </View>
            </View>
            <View style={styles.reminderNextBlock}>
              <ThemedText style={[styles.reminderNextKicker, { color: tone.primary }]}>
                {activityTitle}
              </ThemedText>
              <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                {goalReached ? '목표 달성!' : remainingMessage}
              </ThemedText>
              <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                {Math.round(ratio * 100)}% 채움
              </ThemedText>
            </View>
          </View>
          <View style={[styles.reminderProgressTrack, { borderColor: line }]}>
            <View
              style={[
                styles.reminderProgressFill,
                {
                  width: `${Math.round(ratio * 100)}%`,
                  backgroundColor: tone.primaryContainer,
                  borderRightWidth: ratio > 0 && ratio < 1 ? RETRO_BORDER_WIDTH : 0,
                  borderRightColor: line,
                },
              ]}
            />
          </View>
        </View>
      </ReminderBrutalShell>

      {chartValues.length >= 2 ? (
        <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.counterCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>최근 7일 추이</ThemedText>
            <MiniBarChart
              values={chartValues}
              goal={live.goalCount}
              accent={tone.primary}
              muted={muted}
            />
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>횟수 조작</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              +{live.stepSize}/{live.secondaryStepSize}
            </ThemedText>
          </View>
          {goalReached ? (
            <View
              style={[
                styles.measureStatusChip,
                { borderColor: line, backgroundColor: tone.primaryContainer },
              ]}>
              <ThemedText style={[styles.measureStatusChipText, { color: tone.text }]}>
                오늘 목표를 채웠어요
              </ThemedText>
            </View>
          ) : null}
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
              style={({ pressed }) => [
                styles.bigCounterBtn,
                {
                  backgroundColor: surface,
                  borderColor: line,
                  opacity: live.currentCount <= 0 ? 0.4 : pressed ? 0.88 : 1,
                },
                pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
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
              style={({ pressed }) => [
                styles.bigCounterBtn,
                {
                  backgroundColor: ink,
                  borderColor: line,
                  opacity: pressed ? 0.9 : 1,
                },
                pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
              ]}>
              <ThemedText style={[styles.bigCounterText, { color: selectedFg }]}>
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
              style={({ pressed }) => [
                styles.counterBtn,
                {
                  borderColor: line,
                  backgroundColor: surface,
                  opacity: live.currentCount <= 0 ? 0.35 : pressed ? 0.88 : 1,
                },
              ]}>
              <ThemedText style={[styles.counterBtnText, { color: ink }]}>
                −{live.secondaryStepSize}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => emit(applyCounterDelta(live, live.secondaryStepSize))}
              style={({ pressed }) => [
                styles.counterBtn,
                {
                  borderColor: line,
                  backgroundColor: surface,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <ThemedText style={[styles.counterBtnText, { color: ink }]}>
                +{live.secondaryStepSize}
              </ThemedText>
            </Pressable>
            {!goalReached ? (
              <Pressable
                onPress={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  emit(applyCounterFillRemaining(live));
                }}
                style={({ pressed }) => [
                  styles.counterBtn,
                  {
                    borderColor: line,
                    backgroundColor: tone.primaryContainer,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <ThemedText style={[styles.counterBtnText, { color: tone.text }]}>목표까지</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => emit(resetCounterCount(live))}
                style={({ pressed }) => [
                  styles.counterBtn,
                  {
                    borderColor: line,
                    backgroundColor: surface,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <ThemedText style={[styles.counterBtnText, { color: muted }]}>리셋</ThemedText>
              </Pressable>
            )}
          </View>
          {!goalReached ? (
            <Pressable onPress={() => emit(resetCounterCount(live))} style={styles.textActionBtn}>
              <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
                오늘 기록 초기화
              </ThemedText>
            </Pressable>
          ) : null}
          {live.dailyReset ? (
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
              자정에 횟수가 초기화돼요
            </ThemedText>
          ) : null}
        </View>
      </ReminderBrutalShell>

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>횟수 설정</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              목표 {live.goalCount}
            </ThemedText>
          </View>
          <ThemedText style={[styles.sub, { color: muted }]}>
            이름과 목표를 직접 입력해 맞춰요.
          </ThemedText>

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>무엇을 셀까요?</ThemedText>
          <TextInput
            value={live.activityLabel}
            onChangeText={(value) => emit(applyCounterActivitySettings(live, { activityLabel: value }))}
            placeholder="예: 푸쉬업, 독서"
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line, backgroundColor: surface }]}
          />

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>하루 목표</ThemedText>
          <TextInput
            value={goalDraft}
            onChangeText={setGoalDraft}
            onEndEditing={() => commitGoal(goalDraft)}
            onBlur={() => commitGoal(goalDraft)}
            keyboardType="number-pad"
            placeholder="8"
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line, backgroundColor: surface }]}
          />

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>빠른 추가</ThemedText>
          <View style={styles.reminderAddRow}>
            <View style={styles.counterStepCol}>
              <ThemedText style={[styles.counterStepHint, { color: muted }]}>주요</ThemedText>
              <TextInput
                value={stepDraft}
                onChangeText={setStepDraft}
                onEndEditing={() => commitStep(stepDraft)}
                onBlur={() => commitStep(stepDraft)}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={muted}
                style={[
                  styles.reminderLabelInput,
                  styles.counterStepInput,
                  { color: ink, borderColor: line, backgroundColor: surface },
                ]}
              />
            </View>
            <View style={styles.counterStepCol}>
              <ThemedText style={[styles.counterStepHint, { color: muted }]}>보조</ThemedText>
              <TextInput
                value={secondaryStepDraft}
                onChangeText={setSecondaryStepDraft}
                onEndEditing={() => commitSecondaryStep(secondaryStepDraft)}
                onBlur={() => commitSecondaryStep(secondaryStepDraft)}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={muted}
                style={[
                  styles.reminderLabelInput,
                  styles.counterStepInput,
                  { color: ink, borderColor: line, backgroundColor: surface },
                ]}
              />
            </View>
          </View>

          {!previewMode ? (
            <>
              <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>자주 쓰는 예시</ThemedText>
              <View style={styles.counterChipRow}>
                {COUNTER_ACTIVITY_PRESETS.map((preset) => {
                  const selected =
                    live.activityLabel === preset.activityLabel &&
                    live.goalCount === preset.goalCount;
                  return renderChip(preset.id, preset.activityLabel, selected, () => {
                    void Haptics.selectionAsync();
                    emit(
                      applyCounterActivityPreset(live, preset, {
                        includeSampleData: false,
                      }),
                    );
                  });
                })}
              </View>
            </>
          ) : null}
        </View>
      </ReminderBrutalShell>
    </View>
  );
}

function ReminderTemplateView({
  cfg,
  emit,
  theme,
  allowScheduleCompletion = true,
}: {
  cfg: Parameters<typeof toggleReminderTimeDone>[0];
  emit: TemplateEmit;
  theme: TemplateSessionTheme;
  /** 호환용 — 알림 템플릿은 예시 프리셋을 더 이상 노출하지 않음 */
  previewMode?: boolean;
  allowScheduleCompletion?: boolean;
}) {
  const { ink, muted, line, surface } = theme;
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const reminderItems = cfg.reminderItems ?? [];
  const completedTimes = cfg.completedTimes ?? [];
  const { done, total } = reminderProgress({
    ...cfg,
    reminderItems,
    reminderTimes: cfg.reminderTimes ?? reminderItems.map((item) => item.time),
    completedTimes,
  });
  const nextTime = resolveNextReminderTime({
    ...cfg,
    reminderItems,
    reminderTimes: cfg.reminderTimes ?? reminderItems.map((item) => item.time),
    completedTimes,
  });
  const nextItem = nextTime ? findReminderScheduleItem(reminderItems, nextTime) : undefined;
  const minsLeft = nextTime ? minutesUntilReminder(nextTime) : 0;
  const countdown = nextTime ? formatReminderCountdown(minsLeft, nextTime) : '';
  const progressRatio = total > 0 ? done / total : 0;
  const [draftTime, setDraftTime] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [expandedTimeKey, setExpandedTimeKey] = useState<string | null>(null);
  const [addTimeExpanded, setAddTimeExpanded] = useState(false);

  const openTimePicker = useCallback((key: string) => {
    setAddTimeExpanded(false);
    setExpandedTimeKey((cur) => (cur === key ? null : key));
  }, []);

  const openAddTimePicker = useCallback(() => {
    setExpandedTimeKey(null);
    setAddTimeExpanded((cur) => {
      const next = !cur;
      if (next && !draftTime.trim()) {
        setDraftTime(suggestNextReminderTime(reminderItems));
      }
      return next;
    });
  }, [reminderItems, draftTime]);

  const handleAdd = () => {
    const timeToUse = draftTime.trim() || suggestNextReminderTime(reminderItems);
    const next = addReminderScheduleItem(cfg, timeToUse, draftLabel);
    if (!next) {
      setAddError('이미 같은 시간이 있거나 추가할 수 없어요.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setAddError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    emit(next);
    setDraftTime(suggestNextReminderTime(next.reminderItems));
    setDraftLabel('');
    setAddTimeExpanded(false);
  };

  const handleRemove = (time: string) => {
    void Haptics.selectionAsync();
    emit(removeReminderScheduleItem(cfg, time));
  };

  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const mintShadow = tone.bgMint;

  return (
    <View style={[styles.root, styles.reminderRoot]}>
      {allowScheduleCompletion ? (
        <ReminderBrutalShell
          borderColor={line}
          shadowColor={shadowInk}
          backgroundColor={surface}
          style={styles.reminderProgressShell}>
          <View style={styles.reminderProgressInner}>
            <View style={styles.reminderProgressTop}>
              <View style={styles.reminderProgressHero}>
                <View style={styles.reminderProgressCountRow}>
                  <ThemedText style={[styles.reminderProgressCount, { color: tone.primary }]}>{done}</ThemedText>
                  <ThemedText style={[styles.reminderProgressTotal, { color: muted }]}>/{total}</ThemedText>
                  <ThemedText style={[styles.reminderProgressLabel, { color: muted }]}>완료</ThemedText>
                </View>
              </View>
              {nextTime ? (
                <View style={styles.reminderNextBlock}>
                  <ThemedText style={[styles.reminderNextKicker, { color: tone.primary }]}>다음 알림</ThemedText>
                  <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                    {resolveReminderItemTitle(nextItem ?? { time: nextTime, label: '' })}
                  </ThemedText>
                  <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                    {formatHhmmClockKo(nextTime)}
                    {countdown ? ` · ${countdown}` : ''}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.reminderAllDone, { borderColor: line }]}>
                  <ThemedText style={[styles.goalBadge, { color: ink }]}>오늘 알림 모두 완료</ThemedText>
                </View>
              )}
            </View>
            <View style={[styles.reminderProgressTrack, { borderColor: line }]}>
              <View
                style={[
                  styles.reminderProgressFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: tone.primaryContainer,
                    borderRightWidth: progressRatio > 0 && progressRatio < 1 ? RETRO_BORDER_WIDTH : 0,
                    borderRightColor: line,
                  },
                ]}
              />
            </View>
          </View>
        </ReminderBrutalShell>
      ) : null}

      <View style={styles.reminderSectionHead}>
        <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>알림 목록</ThemedText>
        <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
          {reminderItems.length}개
        </ThemedText>
      </View>

      <View style={styles.reminderList}>
        {reminderItems.length === 0 ? (
          <ThemedText style={[styles.sub, { color: muted }]}>아래에서 알림을 추가해 주세요.</ThemedText>
        ) : null}
        {reminderItems.map((item) => {
          const checked = completedTimes.includes(item.time);
          const isNext = allowScheduleCompletion && nextTime === item.time && !checked;
          const statusLabel = checked ? '완료' : isNext ? '다음' : '예정';
          const statusBg = checked
            ? tone.primaryContainer
            : isNext
              ? withAlpha(tone.tertiary, isDark ? 0.28 : 0.16)
              : withAlpha(line, isDark ? 0.22 : 0.08);
          const statusFg = checked ? tone.text : isNext ? tone.tertiary : muted;
          const cardShadow = checked ? mintShadow : shadowInk;
          const cardBorder = isNext ? tone.primary : line;
          const cardBorderWidth = isNext ? RETRO_BORDER_WIDTH + 1 : RETRO_BORDER_WIDTH;

          return (
            <ReminderBrutalShell
              key={item.time}
              borderColor={cardBorder}
              borderWidth={cardBorderWidth}
              shadowColor={cardShadow}
              backgroundColor={surface}>
              <View style={styles.reminderEditRow}>
                <View style={styles.reminderEditToolbar}>
                  {allowScheduleCompletion ? (
                    <View
                      style={[
                        styles.reminderStatusChip,
                        { borderColor: line, backgroundColor: statusBg },
                      ]}>
                      <IconSymbol
                        name="bell.fill"
                        size={14}
                        color={statusFg}
                      />
                      <ThemedText style={[styles.reminderStatusChipText, { color: statusFg }]}>
                        {statusLabel}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.reminderBellWrap}>
                      <IconSymbol name="bell.fill" size={14} color={muted} />
                    </View>
                  )}
                  <View style={styles.reminderEditActions}>
                    {allowScheduleCompletion ? (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={checked ? '완료 취소' : '완료로 표시'}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          emit(toggleReminderTimeDone(cfg, item.time));
                        }}
                        style={({ pressed }) => [
                          styles.reminderDoneBtn,
                          {
                            borderColor: line,
                            backgroundColor: checked ? tone.primaryContainer : surface,
                            opacity: pressed ? 0.88 : 1,
                          },
                          pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null,
                        ]}>
                        {checked ? <IconSymbol name="checkmark" size={12} color={ink} /> : null}
                        <ThemedText style={[styles.reminderDoneBtnText, { color: ink }]}>
                          {checked ? '완료됨' : '완료하기'}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="알림 삭제"
                      onPress={() => handleRemove(item.time)}
                      style={({ pressed }) => [
                        styles.reminderDeleteBtn,
                        {
                          borderColor: line,
                          backgroundColor: surface,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}>
                      <IconSymbol name="trash" size={13} color={muted} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.reminderEditMain}>
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
                    fullWidth
                    emphasizeColor={isNext ? tone.primary : undefined}
                  />
                  <TextInput
                    value={item.label}
                    onChangeText={(value) => emit(updateReminderItemLabel(cfg, item.time, value))}
                    placeholder="어떤 알림인지 적어 주세요"
                    placeholderTextColor={muted}
                    style={[
                      styles.reminderLabelInput,
                      {
                        color: ink,
                        borderColor: line,
                        backgroundColor: surface,
                        fontWeight: isNext ? '800' : '600',
                      },
                    ]}
                  />
                </View>
              </View>
            </ReminderBrutalShell>
          );
        })}
      </View>

      <ReminderBrutalShell borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.reminderAddInner}>
          <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>알림 추가</ThemedText>
          <ThemedText style={[styles.sub, { color: muted }]}>
            추가하면 마지막 알림에서 1시간 뒤 시각이 기본으로 들어가요.
          </ThemedText>
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
            fullWidth
          />
          <TextInput
            value={draftLabel}
            onChangeText={(value) => {
              setDraftLabel(value);
              setAddError(null);
            }}
            placeholder="예: 물 마시기"
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line, backgroundColor: surface }]}
          />
          {addError ? (
            <ThemedText style={[styles.sub, { color: tone.danger }]}>{addError}</ThemedText>
          ) : null}
          <BrutalConfirmButton
            label="추가"
            accessibilityLabel="알림 추가"
            align="stretch"
            fill={ink}
            labelColor={selectedFg}
            border={line}
            shadowColor={tone.solidShadow}
            onPress={handleAdd}
          />
        </View>
      </ReminderBrutalShell>
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
      const checkFill = completionCheckFill(theme);
      const checkIcon = completionCheckIconColor(checkFill);
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
                {
                  backgroundColor: cfg.doneToday ? checkFill : surface,
                  borderColor: checkFill,
                },
              ]}>
              <ThemedText
                style={{
                  color: cfg.doneToday ? checkIcon : ink,
                  fontWeight: '800',
                  fontSize: 18,
                }}>
                {cfg.doneToday ? '오늘 완료 ✓' : '오늘 했어요'}
              </ThemedText>
            </Pressable>
          </Card>
          <Card theme={theme}>
            <SectionLabel color={muted}>이번 주</SectionLabel>
            <WeekDots dots={weekDots} checkFill={checkFill} muted={muted} ink={ink} />
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
  counterFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  counterRoot: {
    gap: 14,
  },
  counterCardInner: {
    padding: 12,
    gap: 8,
  },
  counterProgressInner: {
    padding: 12,
    gap: 10,
  },
  counterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  counterChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterChipText: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  counterStepInput: {
    minHeight: 40,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  counterStepCol: {
    flex: 1,
    gap: 4,
  },
  counterStepHint: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
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
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickBtn: { minWidth: 52, minHeight: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  measureRoot: {
    gap: 14,
  },
  measureCardInner: {
    padding: 12,
    gap: 8,
  },
  measureStatusChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  measureStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  measureQuickBtn: {
    minWidth: 44,
    minHeight: 32,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  measureQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  measureInput: {
    flex: 1,
    borderWidth: RETRO_BORDER_WIDTH,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '800',
  },
  measureUnitLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  primaryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterTitle: { fontSize: 15, fontWeight: '700' },
  counterSlash: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  goalBadge: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  counterPrimaryRow: { flexDirection: 'row', gap: 8 },
  bigCounterBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  bigCounterText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  bigCounterTextOnAccent: { color: '#fff' },
  counterRow: { flexDirection: 'row', gap: 6 },
  counterBtn: {
    flex: 1,
    minHeight: 36,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  counterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
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
  memoRoot: {
    gap: 14,
  },
  memoCardInner: {
    padding: 12,
    gap: 8,
  },
  memoInput: {
    borderWidth: RETRO_BORDER_WIDTH,
    minHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  memoSaveBtn: {
    minHeight: 40,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  memoSaveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  memoEntryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
  },
  memoEntryDateChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  memoEntryDateText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  memoEntryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.1,
    minWidth: 0,
  },
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
  reminderRoot: {
    gap: 14,
    paddingTop: 2,
  },
  reminderProgressShell: {
    overflow: 'visible',
  },
  reminderProgressInner: {
    padding: 12,
    gap: 10,
  },
  reminderProgressTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  reminderProgressHero: {
    minWidth: 56,
    gap: 0,
  },
  reminderProgressCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  reminderProgressCount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  reminderProgressTotal: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  reminderProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginLeft: 4,
  },
  reminderNextBlock: {
    flex: 1,
    gap: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    paddingTop: 1,
  },
  reminderNextKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
    textAlign: 'right',
  },
  reminderNextTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
    textAlign: 'right',
  },
  reminderNextMeta: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    textAlign: 'right',
  },
  reminderAllDone: {
    flex: 1,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  reminderProgressTrack: {
    height: 14,
    width: '100%',
    overflow: 'hidden',
    borderWidth: RETRO_BORDER_WIDTH,
  },
  reminderProgressFill: {
    height: '100%',
  },
  reminderSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  reminderSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reminderCountBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderList: {
    gap: 12,
  },
  reminderEditRow: {
    padding: 12,
    gap: 8,
  },
  reminderEditToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 30,
  },
  reminderStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  reminderStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderBellWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderEditMain: { gap: 6, minWidth: 0 },
  reminderLabelInput: {
    borderWidth: RETRO_BORDER_WIDTH,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  reminderDoneBtn: {
    minHeight: 30,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: RETRO_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  reminderDoneBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  reminderDeleteBtn: {
    width: 30,
    height: 30,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderAddInner: {
    padding: 12,
    gap: 8,
  },
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
  checklistRoot: {
    gap: 14,
  },
  checklistCardInner: {
    padding: 12,
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checklistItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  checkDone: { textDecorationLine: 'line-through', opacity: 0.55 },
  checklistKeptChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  checklistKeptChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checklistAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingLeft: 10,
    minHeight: 40,
  },
  checklistAddInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
    minWidth: 0,
  },
  checklistAddBtn: {
    borderLeftWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
    minWidth: 52,
  },
  checklistAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  abstainKeptBadge: { fontSize: 11, fontWeight: '800', marginLeft: 'auto', marginRight: 4 },
});
