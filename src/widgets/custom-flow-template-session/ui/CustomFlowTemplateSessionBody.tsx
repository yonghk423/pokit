import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatDurationMinutes, formatHhmmClock, useTranslation, type I18nKey } from '@shared/lib/i18n';
import { RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
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

/** 노트 구조선용 ink — outline(연회색)은 계층이 안 보여 ink를 우선 */
function resolveNoteInkBase(line: string | undefined, ink: string | undefined): string {
  if (ink && ink !== 'transparent') return ink;
  if (line && line !== 'transparent') return line;
  return '#000000';
}

/** 필드·칩 등 얇은 보더 폴백 */
function resolveNoteRuleColor(line: string | undefined, ink: string | undefined): string {
  const base = resolveNoteInkBase(line, ink);
  return withAlpha(base, 0.32);
}

type NoteDividerWeight = 'section' | 'row' | 'none';

/** 노트 섹션=이중 굵은 선, 행=가는 단선 */
function NoteRuleFooter({
  ink,
  weight = 'section',
}: {
  ink: string;
  weight?: Exclude<NoteDividerWeight, 'none'>;
}) {
  if (weight === 'row') {
    return <View style={[styles.noteRuleRow, { backgroundColor: withAlpha(ink, 0.2) }]} />;
  }
  return (
    <View style={styles.noteRuleBlock}>
      <View style={[styles.noteRulePrimary, { backgroundColor: withAlpha(ink, 0.82) }]} />
      <View style={[styles.noteRuleSecondary, { backgroundColor: withAlpha(ink, 0.22) }]} />
    </View>
  );
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
  const presentation = useUiSurfacePresentation();
  const isNote = presentation === 'note';
  const noteInk = resolveNoteInkBase(theme.line, theme.ink);
  return (
    <View
      style={[
        isNote ? styles.cardNote : styles.card,
        flushList && styles.cardFlushList,
        isNote
          ? { gap: flushList ? 0 : gap }
          : { borderColor: theme.line, backgroundColor: theme.surface, gap: flushList ? 0 : gap },
      ]}>
      {children}
      {isNote && !flushList ? <NoteRuleFooter ink={noteInk} weight="section" /> : null}
    </View>
  );
}

function SectionLabel({ children, color }: { children: string; color: string }) {
  return <ThemedText style={[styles.sectionLabel, { color }]}>{children}</ThemedText>;
}

/** 시안 `.brutal-shadow` — 노트 표면에서는 보더·섀도우 없이 계층형 구분선만 */
function ReminderBrutalShell({
  borderColor,
  shadowColor,
  backgroundColor,
  ink,
  borderWidth = RETRO_BORDER_WIDTH,
  shadowSize = 2,
  noteDivider = 'section',
  style,
  children,
}: {
  borderColor: string;
  shadowColor: string;
  backgroundColor: string;
  /** 노트 구분선 폴백 (line이 transparent일 때) */
  ink?: string;
  borderWidth?: number;
  shadowSize?: number;
  /** 노트: section=이중 굵은 선, row=행 단선, none=선 없음 */
  noteDivider?: NoteDividerWeight;
  style?: object;
  children: React.ReactNode;
}) {
  const presentation = useUiSurfacePresentation();
  if (presentation === 'note') {
    const noteInk = resolveNoteInkBase(borderColor, ink ?? shadowColor);
    return (
      <View
        style={[
          styles.noteShell,
          noteDivider === 'section' && styles.noteShellSection,
          noteDivider === 'row' && styles.noteShellRow,
          style,
        ]}>
        {children}
        {noteDivider !== 'none' ? <NoteRuleFooter ink={noteInk} weight={noteDivider} /> : null}
      </View>
    );
  }
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
  const { t } = useTranslation();
  const weekdayKeys = ['mon','tue','wed','thu','fri','sat','sun'] as const;
  const checkIcon = completionCheckIconColor(checkFill);
  return (
    <View style={styles.weekRow}>
      {dots.map((done, idx) => (
        <View key={weekdayKeys[idx]} style={styles.weekCol}>
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
          <ThemedText style={[styles.weekLabel, { color: done ? ink : muted }]}>{t(`goalDetail.weekday.${weekdayKeys[idx]}`)}</ThemedText>
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
  const { t } = useTranslation();
  const { ink, muted, line, surface } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const noteRule = resolveNoteRuleColor(line, ink);
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const unit = resolveMeasurementUnitLabel(cfg.unit, cfg.customUnitLabel);
  const hasMetric = cfg.metricLabel.trim().length > 0 || cfg.unit !== 'none';
  const [draft, setDraft] = useState(() => (cfg.currentValue > 0 ? String(cfg.currentValue) : ''));
  const didSeedMetricRef = useRef(false);
  const lastCommittedRef = useRef<number | null>(
    cfg.currentValue > 0 ? cfg.currentValue : null,
  );

  useEffect(() => {
    setDraft(cfg.currentValue > 0 ? String(cfg.currentValue) : '');
    lastCommittedRef.current = cfg.currentValue > 0 ? cfg.currentValue : null;
  }, [cfg.currentValue, cfg.unit, cfg.metricLabel]);

  /** 실사용(아코디언·설정): 빈 값 기록은 체중으로 바로 시작 — 템플릿 미리보기와 같은 조작 경로 */
  useEffect(() => {
    if (previewMode || didSeedMetricRef.current || hasMetric) return;
    const preset = MEASUREMENT_METRIC_PRESETS[0];
    if (!preset) return;
    didSeedMetricRef.current = true;
    emit(applyMeasurementMetricPreset(cfg, preset, { includeSampleData: false }));
  }, [previewMode, hasMetric, cfg, emit]);

  const parsed = parseFloat(draft.replace(',', '.'));
  const quickDeltas = measurementQuickDeltas(cfg.unit);
  const delta = formatMeasurementDelta(cfg.currentValue, cfg.previousValue, cfg.unit);
  const chartValues = cfg.history.slice(-7).map((h) => h.value);
  const goalRatio =
    cfg.useGoalValue && cfg.goalValue > 0 ? Math.min(1, cfg.currentValue / cfg.goalValue) : null;
  const recordedToday = measurementRecordedToday(cfg);
  const metricTitle = cfg.metricLabel.trim() || t('customFlowTemplate.recordFallback');
  const displayValue =
    cfg.currentValue > 0 ? formatMeasurementValue(cfg.currentValue, cfg.unit) : '—';
  const presetHint = previewMode
    ? t('customFlowTemplate.measurePresetHint')
    : t('customFlowTemplate.measurePresetHintLive');

  const commitValue = (raw: number) => {
    if (!hasMetric || !Number.isFinite(raw)) return;
    const rounded = roundMeasurementValue(raw, cfg.unit);
    if (lastCommittedRef.current === rounded) return;
    if (rounded === cfg.currentValue && recordedToday) {
      lastCommittedRef.current = rounded;
      return;
    }
    lastCommittedRef.current = rounded;
    void Haptics.selectionAsync();
    emit(applyMeasurementSave(cfg, rounded));
  };

  const applyDelta = (d: number) => {
    const base = Number.isFinite(parsed) ? parsed : cfg.currentValue > 0 ? cfg.currentValue : 0;
    const next = roundMeasurementValue(base + d, cfg.unit);
    setDraft(String(next));
    commitValue(next);
  };

  const commitDraft = () => {
    const raw = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(raw)) return;
    commitValue(raw);
  };

  return (
    <View style={[styles.root, styles.measureRoot, isNote && styles.rootNote]}>
      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.measureCardInner}>
          <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>
            {t('customFlowTemplate.measurePrompt')}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: muted }]}>{presetHint}</ThemedText>
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
                    isNote && styles.counterChipNote,
                    {
                      borderColor: selected
                        ? tone.primary
                        : isNote
                          ? noteRule
                          : line === 'transparent'
                            ? muted
                            : line,
                      backgroundColor: selected
                        ? tone.primaryContainer
                        : surface === 'transparent' || isNote
                          ? 'transparent'
                          : surface,
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

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
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
                  {t('customFlowTemplate.deltaSinceYesterday', {
                    delta: `${delta}${unit ? ` ${unit}` : ''}`,
                  })}
                </ThemedText>
              ) : cfg.previousValue > 0 ? (
                <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                  {t('customFlowTemplate.previousValue', {
                    value: `${formatMeasurementValue(cfg.previousValue, cfg.unit)}${unit ? ` ${unit}` : ''}`,
                  })}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                  {!hasMetric
                    ? t('customFlowTemplate.measurePickFirst')
                    : recordedToday
                      ? t('customFlowTemplate.recordedToday')
                      : t('customFlowTemplate.noRecordYet')}
                </ThemedText>
              )}
              {goalRatio != null ? (
                <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                  {t('customFlowTemplate.goalValue', {
                    value: `${formatMeasurementValue(cfg.goalValue, cfg.unit)}${unit ? ` ${unit}` : ''}`,
                  })}{' '}
                  · {Math.round(goalRatio * 100)}%
                </ThemedText>
              ) : (
                <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                  {cfg.history.length > 0
                    ? t('common.countRecords', { count: cfg.history.length })
                    : t('customFlowTemplate.valueRecord')}
                </ThemedText>
              )}
            </View>
          </View>
          {goalRatio != null ? (
            <View
              style={[
                styles.reminderProgressTrack,
                isNote && styles.reminderProgressTrackNote,
                { borderColor: isNote ? noteRule : line },
              ]}>
              <View
                style={[
                  styles.reminderProgressFill,
                  {
                    width: `${Math.round(goalRatio * 100)}%`,
                    backgroundColor: tone.primaryContainer,
                    borderRightWidth: !isNote && goalRatio > 0 && goalRatio < 1 ? RETRO_BORDER_WIDTH : 0,
                    borderRightColor: line,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </ReminderBrutalShell>

      {chartValues.length >= 2 ? (
        <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.measureCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>
              {t('customFlowTemplate.recent7DaysTrend')}
            </ThemedText>
            <MiniBarChart
              values={chartValues}
              goal={cfg.useGoalValue ? cfg.goalValue : undefined}
              accent={tone.primary}
              muted={muted}
            />
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.measureCardInner}>
          {!hasMetric ? (
            <ThemedText style={[styles.sub, { color: muted }]}>
              {t('customFlowTemplate.measurePickFirst')}
            </ThemedText>
          ) : null}
          {recordedToday ? (
            <View
              style={[
                styles.measureStatusChip,
                isNote && styles.measureStatusChipNote,
                {
                  borderColor: isNote ? noteRule : line,
                  backgroundColor: tone.primaryContainer,
                },
              ]}>
              <ThemedText style={[styles.measureStatusChipText, { color: tone.text }]}>
                {t('customFlowTemplate.recordDoneAuto')}
              </ThemedText>
            </View>
          ) : null}
          {hasMetric ? (
            <View style={styles.quickRow}>
              {quickDeltas.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    applyDelta(d);
                  }}
                  style={({ pressed }) => [
                    styles.measureQuickBtn,
                    isNote && styles.measureQuickBtnNote,
                    {
                      borderColor: isNote ? noteRule : line,
                      backgroundColor: isNote || surface === 'transparent' ? 'transparent' : surface,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <ThemedText style={[styles.measureQuickBtnText, { color: ink }]}>
                    {d > 0 ? `+${d}` : String(d)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.measureInputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onEndEditing={commitDraft}
              onBlur={commitDraft}
              editable={hasMetric}
              keyboardType="decimal-pad"
              placeholder={t('customFlowTemplate.valueInputPlaceholder')}
              placeholderTextColor={muted}
              accessibilityLabel={t('customFlowTemplate.valueInput')}
              style={[
                styles.measureInput,
                isNote && styles.measureInputNote,
                {
                  color: ink,
                  borderColor: isNote ? noteRule : line,
                  backgroundColor: isNote || surface === 'transparent' ? 'transparent' : surface,
                  opacity: hasMetric ? 1 : 0.45,
                },
              ]}
            />
            {unit ? (
              <ThemedText
                style={[
                  styles.measureUnitLabel,
                  isNote && styles.measureUnitLabelNote,
                  { color: muted },
                ]}>
                {unit}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </ReminderBrutalShell>
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
  const { t } = useTranslation();
  const { ink, muted, line, accent } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const [draft, setDraft] = useState(cfg.lastEntry ?? '');
  const [mood, setMood] = useState(cfg.moodToday ?? '');
  useEffect(() => {
    setDraft(cfg.lastEntry ?? '');
    setMood(cfg.moodToday ?? '');
  }, [cfg.lastEntry, cfg.moodToday]);

  return (
    <View style={[styles.root, isNote && styles.rootNote]}>
      <Card theme={theme} gap={isNote ? 6 : 10}>
        <ThemedText style={[styles.prompt, { color: ink }]}>{cfg.prompt.trim() || t('customFlowTemplate.journalFallback')}</ThemedText>
        <SectionLabel color={muted}>{t('customFlowTemplate.mood')}</SectionLabel>
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
          placeholder={t('customFlowTemplate.journalPlaceholder')}
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
          <ThemedText style={styles.primaryBtnText}>{t('common.save')}</ThemedText>
        </Pressable>
      </Card>
      {cfg.recentEntries.length > 0 ? (
        <Card theme={theme}>
          <SectionLabel color={muted}>{t('customFlowTemplate.recentRecords')}</SectionLabel>
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
  const { t } = useTranslation();
  const { ink, muted, line, surface } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const noteRule = resolveNoteRuleColor(line, ink);
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
    <View style={[styles.root, styles.memoRoot, isNote && styles.rootNote, isNote && styles.memoRootNote]}>
      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={[styles.memoCardInner, isNote && styles.memoCardInnerNote]}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.memoWrite')}</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              {hasDraft ? t('common.charCount', { count: draftLen }) : t('customFlowTemplate.emptyDraft')}
            </ThemedText>
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder={t('customFlowTemplate.memoPlaceholder')}
            placeholderTextColor={muted}
            textAlignVertical="top"
            style={[
              styles.memoInput,
              isNote && styles.memoInputNote,
              {
                color: ink,
                borderColor: isNote ? noteRule : line,
                backgroundColor: isNote ? 'transparent' : surface,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('customFlowTemplate.saveMemoA11y')}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.memoSaveBtn,
              isNote && styles.memoSaveBtnNote,
              {
                borderColor: line,
                backgroundColor: ink,
                opacity: pressed ? 0.9 : 1,
              },
              !isNote && pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : null,
            ]}>
            <ThemedText style={[styles.memoSaveBtnText, { color: selectedFg }]}>{t('common.save')}</ThemedText>
          </Pressable>
        </View>
      </ReminderBrutalShell>

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={[styles.memoCardInner, isNote && styles.memoCardInnerNote]}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.recentMemos')}</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              {t('common.countItems', { count: recent.length })}
            </ThemedText>
          </View>
          {recent.length === 0 ? (
            <ThemedText style={[styles.sub, { color: muted }]}>
              {t('customFlowTemplate.recentMemosHint')}
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
                    {entry.dateKey ? entry.dateKey.slice(5) : t('common.today')}
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
  const { t } = useTranslation();
  const { ink, muted, line, surface } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const noteRule = resolveNoteRuleColor(line, ink);
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
    variant === 'abstain' ? t('customFlowTemplate.allAbstainDone') : t('customFlowTemplate.allTodosDone');
  const addPlaceholder = variant === 'abstain' ? t('customFlowTemplate.addAbstainPlaceholder') : t('customFlowTemplate.addTodoPlaceholder');
  const sectionTitle = variant === 'abstain' ? t('customFlowTemplate.abstainList') : t('customFlowTemplate.todoList');
  const statusKicker = variant === 'abstain' ? t('customFlowTemplate.kept') : t('customFlowTemplate.statusComplete');
  const remainingLabel =
    variant === 'abstain'
      ? remaining > 0
        ? t('common.countRemaining', { count: remaining })
        : t('customFlowTemplate.allKept')
      : remaining > 0
        ? t('common.countRemaining', { count: remaining })
        : t('customFlowTemplate.allDoneShort');

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
    <View style={[styles.root, styles.checklistRoot, isNote && styles.rootNote, isNote && styles.checklistRootNote]}>
      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={[styles.counterProgressInner, isNote && styles.counterProgressInnerNote]}>
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
          <View style={[styles.reminderProgressTrack, isNote && styles.reminderProgressTrackNote, { borderColor: isNote ? noteRule : line }]}>
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

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={[styles.checklistCardInner, isNote && styles.checklistCardInnerNote]}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{sectionTitle}</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>{t('common.countItems', { count: total })}</ThemedText>
          </View>

          {tasks.length === 0 ? (
            <ThemedText style={[styles.sub, { color: muted }]}>{t('customFlowTemplate.addItemsHint')}</ThemedText>
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
                      {t('customFlowTemplate.kept')}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('customFlowTemplate.deleteItemA11y')}
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
              accessibilityLabel={t('common.add')}
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
              <ThemedText style={[styles.checklistAddBtnText, { color: selectedFg }]}>{t('common.add')}</ThemedText>
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
  const { t } = useTranslation();
  const { ink, muted, line, surface } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const noteRule = resolveNoteRuleColor(line, ink);
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
    remaining <= 0 ? t('customFlowTemplate.goalReached') : t('customFlowTemplate.remainingToGoal', { count: remaining });
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
        isNote && styles.counterChipNote,
        {
          borderColor: selected ? tone.primary : isNote ? noteRule : line === 'transparent' ? muted : line,
          backgroundColor: selected ? tone.primaryContainer : surface === 'transparent' || isNote ? 'transparent' : surface,
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

  const resolveCounterPresetLabel = (presetId: string, fallback: string) => {
    const key = `customFlowTemplate.counterPreset.${presetId}` as I18nKey;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const activityTitle = live.activityLabel.trim() || t('customFlowTemplate.countFallback');

  return (
    <View style={[styles.root, styles.counterRoot, isNote && styles.rootNote]}>
      {previewMode ? (
        <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.counterCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>
              {t('customFlowTemplate.commonPresets')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: muted }]}>
              {t('customFlowTemplate.presetFillHint')}
            </ThemedText>
            <View style={styles.counterChipRow}>
              {COUNTER_ACTIVITY_PRESETS.map((preset) => {
                const presetLabel = resolveCounterPresetLabel(preset.id, preset.activityLabel);
                const selected =
                  (live.activityLabel === presetLabel ||
                    live.activityLabel === preset.activityLabel) &&
                  live.goalCount === preset.goalCount;
                return renderChip(preset.id, presetLabel, selected, () => {
                  void Haptics.selectionAsync();
                  emit(
                    applyCounterActivityPreset(
                      live,
                      { ...preset, activityLabel: presetLabel },
                      {
                        includeSampleData: previewMode,
                      },
                    ),
                  );
                });
              })}
            </View>
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
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
                {goalReached ? t('customFlowTemplate.goalAchieved') : remainingMessage}
              </ThemedText>
              <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                {t('customFlowTemplate.percentFilled', { percent: Math.round(ratio * 100) })}
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
        <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
          <View style={styles.counterCardInner}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.recent7DaysTrend')}</ThemedText>
            <MiniBarChart
              values={chartValues}
              goal={live.goalCount}
              accent={tone.primary}
              muted={muted}
            />
          </View>
        </ReminderBrutalShell>
      ) : null}

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.countControls')}</ThemedText>
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
                {t('customFlowTemplate.todayGoalFilled')}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.counterPrimaryRow}>
            <Pressable
              disabled={live.currentCount <= 0}
              accessibilityRole="button"
              accessibilityLabel={t('customFlowTemplate.decreaseByA11y', { step: live.stepSize })}
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
              accessibilityLabel={t('customFlowTemplate.increaseByA11y', { step: live.stepSize })}
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
            {t('customFlowTemplate.undoHint')}
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
                <ThemedText style={[styles.counterBtnText, { color: tone.text }]}>{t('customFlowTemplate.fillToGoal')}</ThemedText>
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
                <ThemedText style={[styles.counterBtnText, { color: muted }]}>{t('customFlowTemplate.reset')}</ThemedText>
              </Pressable>
            )}
          </View>
          {!goalReached ? (
            <Pressable onPress={() => emit(resetCounterCount(live))} style={styles.textActionBtn}>
              <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
                {t('customFlowTemplate.resetTodayRecord')}
              </ThemedText>
            </Pressable>
          ) : null}
          {live.dailyReset ? (
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
              {t('customFlowTemplate.midnightResetHint')}
            </ThemedText>
          ) : null}
        </View>
      </ReminderBrutalShell>

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={styles.counterCardInner}>
          <View style={styles.reminderSectionHead}>
            <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.countSettings')}</ThemedText>
            <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
              {t('customFlowTemplate.goalCount', { count: live.goalCount })}
            </ThemedText>
          </View>
          <ThemedText style={[styles.sub, { color: muted }]}>
            {t('customFlowTemplate.countSettingsHint')}
          </ThemedText>

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>{t('customFlowTemplate.whatToCount')}</ThemedText>
          <TextInput
            value={live.activityLabel}
            onChangeText={(value) => emit(applyCounterActivitySettings(live, { activityLabel: value }))}
            placeholder={t('customFlowTemplate.activityPlaceholder')}
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line, backgroundColor: surface }]}
          />

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>{t('customFlowTemplate.dailyGoal')}</ThemedText>
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

          <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>{t('customFlowTemplate.primaryStep')}</ThemedText>
          <View style={styles.reminderAddRow}>
            <View style={styles.counterStepCol}>
              <ThemedText style={[styles.counterStepHint, { color: muted }]}>{t('customFlowTemplate.primaryStep')}</ThemedText>
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
              <ThemedText style={[styles.counterStepHint, { color: muted }]}>{t('customFlowTemplate.secondaryStep')}</ThemedText>
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
              <ThemedText style={[styles.counterFieldLabel, { color: muted }]}>
                {t('customFlowTemplate.commonPresets')}
              </ThemedText>
              <View style={styles.counterChipRow}>
                {COUNTER_ACTIVITY_PRESETS.map((preset) => {
                  const presetLabel = resolveCounterPresetLabel(preset.id, preset.activityLabel);
                  const selected =
                    (live.activityLabel === presetLabel ||
                      live.activityLabel === preset.activityLabel) &&
                    live.goalCount === preset.goalCount;
                  return renderChip(preset.id, presetLabel, selected, () => {
                    void Haptics.selectionAsync();
                    emit(
                      applyCounterActivityPreset(
                        live,
                        { ...preset, activityLabel: presetLabel },
                        {
                          includeSampleData: false,
                        },
                      ),
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
  const { t, locale } = useTranslation();
  const { ink, muted, line, surface } = theme;
  const isNote = useUiSurfacePresentation() === 'note';
  const noteRule = resolveNoteRuleColor(line, ink);
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
      setAddError(t('customFlowTemplate.duplicateTimeError'));
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
    <View style={[styles.root, styles.reminderRoot, isNote && styles.rootNote, isNote && styles.reminderRootNote]}>
      {allowScheduleCompletion ? (
        <ReminderBrutalShell ink={ink}
          borderColor={line}
          shadowColor={shadowInk}
          backgroundColor={surface}
          style={styles.reminderProgressShell}>
          <View style={[styles.reminderProgressInner, isNote && styles.reminderProgressInnerNote]}>
            <View style={styles.reminderProgressTop}>
              <View style={styles.reminderProgressHero}>
                <View style={styles.reminderProgressCountRow}>
                  <ThemedText style={[styles.reminderProgressCount, { color: tone.primary }]}>{done}</ThemedText>
                  <ThemedText style={[styles.reminderProgressTotal, { color: muted }]}>/{total}</ThemedText>
                  <ThemedText style={[styles.reminderProgressLabel, { color: muted }]}>{t('customFlowTemplate.statusComplete')}</ThemedText>
                </View>
              </View>
              {nextTime ? (
                <View style={styles.reminderNextBlock}>
                  <ThemedText style={[styles.reminderNextKicker, { color: tone.primary }]}>{t('customFlowTemplate.nextReminder')}</ThemedText>
                  <ThemedText style={[styles.reminderNextTitle, { color: ink }]} numberOfLines={2}>
                    {resolveReminderItemTitle(nextItem ?? { time: nextTime, label: '' })}
                  </ThemedText>
                  <ThemedText style={[styles.reminderNextMeta, { color: muted }]}>
                    {formatHhmmClock(nextTime, locale)}
                    {countdown ? ` · ${countdown}` : ''}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.reminderAllDone, { borderColor: line }]}>
                  <ThemedText style={[styles.goalBadge, { color: ink }]}>{t('customFlowTemplate.allRemindersDone')}</ThemedText>
                </View>
              )}
            </View>
            <View style={[styles.reminderProgressTrack, isNote && styles.reminderProgressTrackNote, { borderColor: isNote ? noteRule : line }]}>
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

      <View style={[styles.reminderSectionHead, isNote && styles.reminderSectionHeadNote]}>
        <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.reminderList')}</ThemedText>
        <ThemedText style={[styles.reminderCountBadge, { color: muted }]}>
          {t('common.countItems', { count: reminderItems.length })}
        </ThemedText>
      </View>
      {isNote ? <NoteRuleFooter ink={resolveNoteInkBase(line, ink)} weight="section" /> : null}

      <View style={[styles.reminderList, isNote && styles.reminderListNote]}>
        {reminderItems.length === 0 ? (
          <ThemedText style={[styles.sub, { color: muted }]}>{t('customFlowTemplate.addRemindersHint')}</ThemedText>
        ) : null}
        {reminderItems.map((item) => {
          const checked = completedTimes.includes(item.time);
          const isNext = allowScheduleCompletion && nextTime === item.time && !checked;
          const statusLabel = checked ? t('customFlowTemplate.statusComplete') : isNext ? t('customFlowTemplate.statusNext') : t('customFlowTemplate.statusScheduled');
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
            <ReminderBrutalShell ink={ink}
              key={item.time}
              borderColor={cardBorder}
              borderWidth={cardBorderWidth}
              shadowColor={cardShadow}
              backgroundColor={surface}
              noteDivider="row">
              <View style={[styles.reminderEditRow, isNote && styles.reminderEditRowNote]}>
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
                        accessibilityLabel={checked ? t('common.completeCancel') : t('customFlowTemplate.markDoneA11y')}
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
                          {checked ? t('customFlowTemplate.doneState') : t('customFlowTemplate.markDone')}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('customFlowTemplate.deleteReminderA11y')}
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
                    placeholder={t('customFlowTemplate.reminderLabelPlaceholder')}
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

      <ReminderBrutalShell ink={ink} borderColor={line} shadowColor={shadowInk} backgroundColor={surface}>
        <View style={[styles.reminderAddInner, isNote && styles.reminderAddInnerNote]}>
          <ThemedText style={[styles.reminderSectionTitle, { color: muted }]}>{t('customFlowTemplate.addReminder')}</ThemedText>
          <ThemedText style={[styles.sub, { color: muted }]}>
            {t('customFlowTemplate.addReminderHint')}
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
            placeholder={t('timePicker.placeholder')}
            accessibilityLabel={t('customFlowTemplate.newReminderTimeA11y')}
            fullWidth
          />
          <TextInput
            value={draftLabel}
            onChangeText={(value) => {
              setDraftLabel(value);
              setAddError(null);
            }}
            placeholder={t('customFlowTemplate.reminderExamplePlaceholder')}
            placeholderTextColor={muted}
            style={[styles.reminderLabelInput, { color: ink, borderColor: line, backgroundColor: surface }]}
          />
          {addError ? (
            <ThemedText style={[styles.sub, { color: tone.danger }]}>{addError}</ThemedText>
          ) : null}
          <BrutalConfirmButton
            label={t('common.add')}
            accessibilityLabel={t('customFlowTemplate.addReminderA11y')}
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
  const { t, locale } = useTranslation();
  const isNote = useUiSurfacePresentation() === 'note';

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
        <View style={[styles.root, isNote && styles.rootNote]}>
          <Card theme={theme} gap={isNote ? 6 : 10}>
            {cfg.streakDays > 0 ? (
              <View style={[styles.streakBadge, { borderColor: accent }]}>
                <ThemedText style={{ color: accent, fontWeight: '800', fontSize: 15 }}>
                  {t('customFlowTemplate.streakDays', { count: cfg.streakDays })}
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
                {cfg.doneToday ? t('customFlowTemplate.doneTodayCheck') : t('customFlowTemplate.doneTodayBtn')}
              </ThemedText>
            </Pressable>
          </Card>
          <Card theme={theme} gap={isNote ? 6 : 10}>
            <SectionLabel color={muted}>{t('customFlowTemplate.thisWeek')}</SectionLabel>
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
        <View style={[styles.root, isNote && styles.rootNote]}>
          <Card theme={theme} gap={isNote ? 6 : 10}>
            <ThemedText style={[styles.timerValue, { color: ink }]}>
              {String(Math.floor(remainMin)).padStart(2, '0')}:
              {String(Math.round((remainMin % 1) * 60)).padStart(2, '0')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>{t('customFlowTemplate.remainingFocusTime')}</ThemedText>
            <View style={[styles.track, { backgroundColor: line, marginTop: 8 }]}>
              <View style={[styles.fill, { width: `${Math.round(focusRatio * 100)}%`, backgroundColor: accent }]} />
            </View>
          </Card>
          <View style={styles.splitRow}>
            <View style={[styles.splitCard, { borderColor: line, backgroundColor: surface }]}>
              <ThemedText style={[styles.splitLabel, { color: muted }]}>{t('customFlowTemplate.goalLabel')}</ThemedText>
              <ThemedText style={[styles.splitValue, { color: ink }]}>{formatDurationMinutes(cfg.planMin, locale)}</ThemedText>
            </View>
            <View style={[styles.splitCard, { borderColor: line, backgroundColor: surface }]}>
              <ThemedText style={[styles.splitLabel, { color: muted }]}>{t('customFlowTemplate.focusLabel')}</ThemedText>
              <ThemedText style={[styles.splitValue, { color: ink }]}>{formatDurationMinutes(elapsedMin, locale)}</ThemedText>
            </View>
          </View>
          {cfg.focusMemo.trim() ? (
            <Card theme={theme}>
              <SectionLabel color={muted}>{t('customFlowTemplate.focusMemo')}</SectionLabel>
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
  rootNote: { gap: 4, width: '100%', alignSelf: 'stretch' },
  card: { borderWidth: 2, padding: 14, width: '100%' },
  cardNote: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    width: '100%',
  },
  cardFlushList: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  noteShell: {
    width: '100%',
    alignSelf: 'stretch',
  },
  noteShellSection: {
    paddingTop: 4,
    paddingBottom: 2,
    marginBottom: 4,
    gap: 0,
  },
  noteShellRow: {
    paddingTop: 4,
    paddingBottom: 0,
    marginBottom: 0,
  },
  noteRuleBlock: {
    marginTop: 6,
    gap: 2,
    width: '100%',
  },
  noteRulePrimary: {
    height: 1.5,
    width: '100%',
    borderRadius: 0,
  },
  noteRuleSecondary: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
    borderRadius: 0,
  },
  noteRuleRow: {
    marginTop: 4,
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
  reminderLabelInputNote: {
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 2,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  reminderProgressTrackNote: {
    height: 8,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'transparent',
  },
  reminderSectionHeadNote: {
    paddingTop: 2,
    paddingBottom: 2,
  },
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
    gap: 4,
  },
  counterCardInner: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  counterProgressInner: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  counterProgressInnerNote: {
    paddingVertical: 2,
    gap: 6,
  },
  counterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  counterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterChipNote: {
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 0,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    gap: 4,
  },
  measureCardInner: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    gap: 8,
  },
  measureStatusChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  measureStatusChipNote: {
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 2,
    alignSelf: 'flex-start',
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
  measureQuickBtnNote: {
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    minWidth: 36,
    paddingHorizontal: 4,
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
  measureInputNote: {
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 2,
    minHeight: 36,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  measureUnitLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  measureUnitLabelNote: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterTitle: { fontSize: 15, fontWeight: '700' },
  counterSlash: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  goalBadge: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  counterPrimaryRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
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
  counterRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    alignSelf: 'stretch',
  },
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
  memoRootNote: {
    gap: 4,
  },
  memoCardInner: {
    padding: 12,
    gap: 8,
  },
  memoCardInnerNote: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 6,
    width: '100%',
    alignSelf: 'stretch',
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
  memoInputNote: {
    minHeight: 72,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 0,
    paddingVertical: 6,
    fontSize: 13,
    lineHeight: 19,
    width: '100%',
  },
  memoSaveBtn: {
    minHeight: 40,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  memoSaveBtnNote: {
    minHeight: 34,
    alignSelf: 'stretch',
    width: '100%',
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
  reminderRootNote: {
    gap: 4,
    paddingTop: 0,
  },
  reminderProgressShell: {
    overflow: 'visible',
  },
  reminderProgressInner: {
    padding: 12,
    gap: 10,
  },
  reminderProgressInnerNote: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 6,
    width: '100%',
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
  reminderListNote: {
    gap: 0,
  },
  reminderEditRow: {
    padding: 12,
    gap: 8,
  },
  reminderEditRowNote: {
    paddingVertical: 4,
    paddingHorizontal: 0,
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
  reminderAddInnerNote: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 6,
    width: '100%',
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
  checklistRootNote: {
    gap: 4,
  },
  checklistCardInner: {
    padding: 12,
    gap: 8,
  },
  checklistCardInnerNote: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 4,
    width: '100%',
    alignSelf: 'stretch',
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
