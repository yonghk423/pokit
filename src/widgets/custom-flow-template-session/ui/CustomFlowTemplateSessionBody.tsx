import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  applyCounterDelta,
  applyHabitDoneToggle,
  applyJournalSave,
  applyMeasurementSave,
  blockDurationSec,
  buildHabitWeekDots,
  ensureCounterDayBoundary,
  focusElapsedMinFromSession,
  formatMeasurementDelta,
  formatReminderCountdown,
  formatValueCompact,
  JOURNAL_MOOD_OPTIONS,
  MEASUREMENT_UNIT_OPTIONS,
  measurementQuickDeltas,
  measurementRecordedToday,
  minutesUntilReminder,
  normalizeCustomFlowDetailConfig,
  reminderProgress,
  resetCounterCount,
  resolveNextReminderTime,
  toggleReminderTimeDone,
  type CustomFlowTemplateKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

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
};

function unitLabelKo(unit: string): string {
  return MEASUREMENT_UNIT_OPTIONS.find((o) => o.key === unit)?.labelKo ?? '';
}

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

export function CustomFlowTemplateSessionBody({
  templateKey,
  config: rawConfig,
  onChange,
  theme,
  block,
  sessionProgress = 0,
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
      const unit = unitLabelKo(cfg.unit);
      const [draft, setDraft] = useState(() =>
        cfg.currentValue > 0 ? String(cfg.currentValue) : '',
      );
      useEffect(() => {
        setDraft(cfg.currentValue > 0 ? String(cfg.currentValue) : '');
      }, [cfg.currentValue]);

      const parsed = parseFloat(draft.replace(',', '.'));
      const quickDeltas = measurementQuickDeltas(cfg.unit);
      const delta = formatMeasurementDelta(cfg.currentValue, cfg.previousValue);
      const chartValues = cfg.history.slice(-7).map((h) => h.value);
      const goalRatio =
        cfg.useGoalValue && cfg.goalValue > 0
          ? Math.min(1, cfg.currentValue / cfg.goalValue)
          : null;
      const recordedToday = measurementRecordedToday(cfg);

      const applyDelta = (d: number) => {
        const base = Number.isFinite(parsed) ? parsed : cfg.currentValue;
        setDraft(String(Math.max(0, Math.round((base + d) * 10) / 10)));
      };

      return (
        <View style={styles.root}>
          <Card theme={theme} gap={12}>
            <SectionLabel color={muted}>{cfg.metricLabel.trim() || '기록'}</SectionLabel>
            <View style={styles.heroRow}>
              <ThemedText
                style={[styles.heroValue, { color: ink }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {cfg.currentValue > 0 ? formatValueCompact(cfg.currentValue) : '—'}
              </ThemedText>
              {unit ? (
                <ThemedText style={[styles.heroUnit, { color: muted }]}>{unit}</ThemedText>
              ) : null}
            </View>
            {delta ? (
              <ThemedText style={[styles.deltaLine, { color: accent }]}>
                어제 대비 {delta}
                {unit ? ` ${unit}` : ''}
              </ThemedText>
            ) : cfg.previousValue > 0 ? (
              <ThemedText style={[styles.sub, { color: muted }]}>
                이전 {formatValueCompact(cfg.previousValue)}
                {unit ? ` ${unit}` : ''}
              </ThemedText>
            ) : null}
            {goalRatio != null ? (
              <>
                <ThemedText style={[styles.sub, { color: muted }]}>
                  목표 {formatValueCompact(cfg.goalValue)}
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

          <Card theme={theme}>
            {recordedToday ? (
              <ThemedText style={[styles.badge, { color: accent, borderColor: accent }]}>
                오늘 기록 완료 · 수정하려면 값을 바꾸고 저장하세요
              </ThemedText>
            ) : null}
            <View style={styles.quickRow}>
              {quickDeltas.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => applyDelta(d)}
                  style={[styles.quickBtn, { borderColor: line }]}>
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
        </View>
      );
    }

    case 'counter': {
      if (!('goalCount' in cfg)) return null;
      const live = ensureCounterDayBoundary(cfg);
      const ratio = live.goalCount > 0 ? Math.min(1, live.currentCount / live.goalCount) : 0;
      const goalReached = live.currentCount >= live.goalCount;
      return (
        <Card theme={theme}>
          <ThemedText style={[styles.counterTitle, { color: ink }]}>
            {live.activityLabel.trim() || '횟수'}
          </ThemedText>
          <View style={styles.counterValueRow}>
            <ThemedText style={[styles.heroValue, { color: ink }]}>
              {live.currentCount}
            </ThemedText>
            <ThemedText style={[styles.counterSlash, { color: muted }]}> / {live.goalCount}</ThemedText>
            {live.unitLabel.trim() ? (
              <ThemedText style={[styles.heroUnit, { color: muted }]}> {live.unitLabel.trim()}</ThemedText>
            ) : null}
          </View>
          <View style={[styles.track, { backgroundColor: line }]}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }]} />
          </View>
          {goalReached ? (
            <ThemedText style={[styles.goalBadge, { color: accent }]}>목표 달성!</ThemedText>
          ) : (
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>
              {live.goalCount - live.currentCount}번 더 하면 목표예요
            </ThemedText>
          )}
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              emit(applyCounterDelta(live, 1));
            }}
            style={[styles.bigPlusBtn, { backgroundColor: accent }]}>
            <ThemedText style={styles.bigPlusText}>+1</ThemedText>
          </Pressable>
          <View style={styles.counterRow}>
            <Pressable
              disabled={live.currentCount <= 0}
              onPress={() => emit(applyCounterDelta(live, -1))}
              style={[styles.counterBtn, { borderColor: line, opacity: live.currentCount <= 0 ? 0.35 : 1 }]}>
              <ThemedText style={{ color: ink, fontWeight: '700' }}>−1</ThemedText>
            </Pressable>
            <Pressable onPress={() => emit(applyCounterDelta(live, 5))} style={[styles.counterBtn, { borderColor: line }]}>
              <ThemedText style={{ color: ink, fontWeight: '700' }}>+5</ThemedText>
            </Pressable>
            <Pressable onPress={() => emit(resetCounterCount(live))} style={[styles.counterBtn, { borderColor: line }]}>
              <ThemedText style={{ color: muted, fontWeight: '600', fontSize: 12 }}>리셋</ThemedText>
            </Pressable>
          </View>
          {live.dailyReset ? (
            <ThemedText style={[styles.sub, { color: muted, textAlign: 'center' }]}>자정에 횟수가 초기화돼요</ThemedText>
          ) : null}
        </Card>
      );
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
      const [draft, setDraft] = useState(cfg.lastEntry ?? '');
      const [mood, setMood] = useState(cfg.moodToday ?? '');
      useEffect(() => {
        setDraft(cfg.lastEntry ?? '');
        setMood(cfg.moodToday ?? '');
      }, [cfg.lastEntry, cfg.moodToday]);

      return (
        <View style={styles.root}>
          <Card theme={theme}>
            <ThemedText style={[styles.prompt, { color: ink }]}>
              {cfg.prompt.trim() || '한 줄 기록'}
            </ThemedText>
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
                        backgroundColor: selected ? withAlpha(accent, 0.12) : surface,
                      },
                    ]}>
                    <ThemedText style={{ color: selected ? accent : muted, fontWeight: selected ? '700' : '500', fontSize: 12 }}>
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

    case 'reminder': {
      if (!('reminderTimes' in cfg)) return null;
      const { done, total } = reminderProgress(cfg);
      const nextTime = resolveNextReminderTime(cfg);
      const minsLeft = nextTime ? minutesUntilReminder(nextTime) : 0;
      const countdown = nextTime ? formatReminderCountdown(minsLeft, nextTime) : '';
      return (
        <View style={styles.root}>
          <Card theme={theme}>
            <ThemedText style={[styles.sub, { color: muted }]}>
              {done}/{total} 완료
            </ThemedText>
            {nextTime ? (
              <ThemedText style={[styles.nextReminder, { color: ink }]}>
                다음 · {nextTime} · {countdown}
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
          <Card theme={theme} flushList>
            {cfg.reminderTimes.map((time, index) => {
              const checked = cfg.completedTimes.includes(time);
              const isNext = nextTime === time && !checked;
              const isLast = index === cfg.reminderTimes.length - 1;
              return (
                <Pressable
                  key={time}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    emit(toggleReminderTimeDone(cfg, time));
                  }}
                  style={[
                    styles.reminderRow,
                    {
                      borderBottomColor: line,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    },
                    isNext && {
                      backgroundColor: withAlpha(accent, 0.08),
                      borderLeftWidth: 3,
                      borderLeftColor: accent,
                    },
                  ]}>
                  <IconSymbol name="bell" size={16} color={isNext ? accent : muted} />
                  <View style={styles.reminderTextCol}>
                    <ThemedText style={[styles.reminderTime, { color: ink }]}>{time}</ThemedText>
                    <ThemedText style={[styles.reminderMeta, { color: isNext ? accent : muted }]}>
                      {checked ? '완료' : isNext ? '다음 알림' : '예정'}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.checkBox,
                      {
                        borderColor: checked ? accent : line,
                        backgroundColor: checked ? accent : surface,
                      },
                    ]}>
                    {checked ? <IconSymbol name="checkmark" size={10} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </View>
      );
    }

    case 'checklist':
    default: {
      if (!('checklist' in cfg)) return null;
      const tasks = cfg.checklist;
      const doneCount = tasks.filter((t) => t.done).length;
      const ratio = tasks.length > 0 ? doneCount / tasks.length : 0;
      const [draft, setDraft] = useState('');

      return (
        <View style={styles.root}>
          <Card theme={theme}>
            <ThemedText style={[styles.counterTitle, { color: ink }]}>
              {doneCount}/{tasks.length} 완료
            </ThemedText>
            <View style={[styles.track, { backgroundColor: line }]}>
              <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }]} />
            </View>
            {doneCount === tasks.length && tasks.length > 0 ? (
              <ThemedText style={[styles.goalBadge, { color: accent }]}>모든 할 일 완료!</ThemedText>
            ) : null}
          </Card>
          <Card theme={theme}>
            <View style={[styles.addRow, { borderColor: line }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="할 일 추가"
                placeholderTextColor={muted}
                style={[styles.addInput, { color: ink }]}
                returnKeyType="done"
                onSubmitEditing={() => {
                  const text = draft.trim();
                  if (!text) return;
                  emit({
                    ...cfg,
                    templateKey: 'checklist',
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
                    templateKey: 'checklist',
                    checklist: [...tasks, { id: `task_${Date.now()}`, text, done: false }],
                  });
                  setDraft('');
                }}
                style={[styles.addBtn, { borderColor: ink }]}>
                <ThemedText style={{ color: ink, fontWeight: '800', fontSize: 11 }}>ADD</ThemedText>
              </Pressable>
            </View>
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => {
                  void Haptics.selectionAsync();
                  emit({
                    ...cfg,
                    templateKey: 'checklist',
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
                    task.done && styles.checkDone,
                  ]}>
                  {task.text}
                </ThemedText>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    emit({
                      ...cfg,
                      templateKey: 'checklist',
                      checklist: tasks.filter((t) => t.id !== task.id),
                    })
                  }>
                  <IconSymbol name="trash" size={14} color={muted} />
                </Pressable>
              </Pressable>
            ))}
          </Card>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  root: { gap: 10, width: '100%' },
  card: { borderWidth: 2, padding: 14, width: '100%' },
  cardFlushList: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  sub: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 2,
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
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { minWidth: 52, minHeight: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  measureInput: { flex: 1, borderWidth: 2, minHeight: 48, paddingHorizontal: 12, fontSize: 22, fontWeight: '800' },
  primaryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterTitle: { fontSize: 15, fontWeight: '700' },
  counterSlash: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  goalBadge: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  bigPlusBtn: { minHeight: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  bigPlusText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  counterRow: { flexDirection: 'row', gap: 8 },
  counterBtn: { flex: 1, minHeight: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 4 },
  addInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 6 },
  addBtn: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  checkBox: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 16, fontWeight: '600' },
  checkDone: { textDecorationLine: 'line-through', opacity: 0.55 },
});
