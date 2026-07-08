import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import {
  COUNTER_ACTIVITY_PRESETS,
  COUNTER_UNIT_OPTIONS,
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialReminderDataConfig,
  MAX_CUSTOM_REMINDER_TIMES,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  type CounterUnitKey,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeReminderDetailConfig,
  normalizeReminderTime,
  REMINDER_SCHEDULE_PRESETS,
  sortReminderScheduleItems,
  type ReminderScheduleItem,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailCategoryKey } from '../../../model/types';
import { RoutineSummaryField } from '../lib/RoutineSummaryField';
import { RoutineTitleField } from '../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../lib/routineTitleFallback';
import { goalDetailSettingsPalette } from '../lib/settingsPalette';

type SettingsProps = {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  onDeleteCategory?: () => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
};

function useTemplateSettingsPalette() {
  const scheme = useColorScheme();
  return useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
}

function TemplateSection({
  title,
  children,
  c,
}: {
  title: string;
  children: React.ReactNode;
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  return (
    <View style={[styles.section, { borderColor: c.outline }]}>
      <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>{title}</ThemedText>
      {children}
    </View>
  );
}

function FieldLabel({ children, c }: { children: string; c: ReturnType<typeof goalDetailSettingsPalette> }) {
  return <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>{children}</ThemedText>;
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  c,
  keyboardType,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  c: ReturnType<typeof goalDetailSettingsPalette>;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.outline}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        multiline ? styles.inputMultiline : styles.input,
        { color: c.onSurface, borderColor: c.outline, backgroundColor: c.surfaceLowest },
      ]}
    />
  );
}

function TitleSummaryHeader({
  rhythmTitle,
  categoryKey,
  displayName,
  setDisplayName,
  summary,
  setSummary,
  allowRename,
  renameLockedReason,
  hideTitleField = false,
  c,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  displayName: string;
  setDisplayName: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  allowRename: boolean;
  renameLockedReason: 'running' | 'today' | null;
  hideTitleField?: boolean;
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  return (
    <>
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
      <RoutineSummaryField
        value={summary}
        onChangeValue={setSummary}
        palette={c}
        placeholder="한 줄 메모 (선택)"
      />
    </>
  );
}

export function HabitSettings(props: SettingsProps) {
  const c = useTemplateSettingsPalette();
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null, hideTitleField = false } = props;
  const seed = () => normalizeHabitDetailConfig(dataConfig ?? getInitialHabitDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const base = seed();
    const payload = normalizeHabitDetailConfig({
      templateKey: 'habit',
      displayName,
      summary,
      doneToday: base.doneToday,
      streakDays: base.streakDays,
      lastDoneDateKey: base.lastDoneDateKey,
      recentDoneDateKeys: base.recentDoneDateKeys,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, summary, onChangeDataConfig, dataConfig]);

  const streak = useMemo(() => seed().streakDays, [dataConfig]);

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, hideTitleField, c }} />
      {streak > 0 ? (
        <TemplateSection title="연속 기록" c={c}>
          <ThemedText style={[styles.helper, { color: c.onSurface, fontWeight: '700' }]}>{streak}일 연속</ThemedText>
        </TemplateSection>
      ) : null}
    </View>
  );
}

export function CounterSettings(props: SettingsProps) {
  const c = useTemplateSettingsPalette();
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null, hideTitleField = false } = props;
  const seed = () => normalizeCounterDetailConfig(dataConfig ?? getInitialCounterDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [activityLabel, setActivityLabel] = useState(() => seed().activityLabel);
  const [unitKey, setUnitKey] = useState<CounterUnitKey>(() => seed().unitKey);
  const [customUnitLabel, setCustomUnitLabel] = useState(() => seed().customUnitLabel ?? '');
  const [goalCountStr, setGoalCountStr] = useState(() => String(seed().goalCount));
  const [stepSizeStr, setStepSizeStr] = useState(() => String(seed().stepSize));
  const [secondaryStepSizeStr, setSecondaryStepSizeStr] = useState(() => String(seed().secondaryStepSize));
  const [dailyReset, setDailyReset] = useState(() => seed().dailyReset);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setActivityLabel(next.activityLabel);
    setUnitKey(next.unitKey);
    setCustomUnitLabel(next.customUnitLabel ?? '');
    setGoalCountStr(String(next.goalCount));
    setStepSizeStr(String(next.stepSize));
    setSecondaryStepSizeStr(String(next.secondaryStepSize));
    setDailyReset(next.dailyReset);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const base = seed();
    const goalRaw = parseInt(goalCountStr, 10);
    const stepRaw = parseInt(stepSizeStr, 10);
    const secondaryRaw = parseInt(secondaryStepSizeStr, 10);
    const payload = normalizeCounterDetailConfig({
      templateKey: 'counter',
      displayName,
      summary,
      activityLabel,
      unitKey,
      ...(unitKey === 'custom' ? { customUnitLabel } : {}),
      goalCount: goalRaw,
      stepSize: stepRaw,
      secondaryStepSize: secondaryRaw,
      currentCount: base.currentCount,
      dailyReset,
      countDateKey: base.countDateKey,
      history: base.history,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [
    displayName,
    summary,
    activityLabel,
    unitKey,
    customUnitLabel,
    goalCountStr,
    stepSizeStr,
    secondaryStepSizeStr,
    dailyReset,
    onChangeDataConfig,
    dataConfig,
  ]);

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, hideTitleField, c }} />
      <TemplateSection title="횟수 설정" c={c}>
        <FieldLabel c={c}>자주 쓰는 예시</FieldLabel>
        <View style={styles.chipsRow}>
          {COUNTER_ACTIVITY_PRESETS.map((preset) => {
            const selected =
              activityLabel === preset.activityLabel &&
              unitKey === preset.unitKey &&
              goalCountStr === String(preset.goalCount);
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setActivityLabel(preset.activityLabel);
                  setUnitKey(preset.unitKey);
                  if (preset.customUnitLabel) setCustomUnitLabel(preset.customUnitLabel);
                  setGoalCountStr(String(preset.goalCount));
                  setStepSizeStr(String(preset.stepSize));
                  setSecondaryStepSizeStr(String(preset.secondaryStepSize));
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? c.onSurface : c.outline,
                    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: selected ? c.onSurface : c.onVariant,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}>
                  {preset.activityLabel}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel c={c}>무엇을 셀까요?</FieldLabel>
        <FieldInput value={activityLabel} onChangeText={(v) => setActivityLabel(v.slice(0, 40))} placeholder="예: 푸쉬업, 독서" c={c} />

        <FieldLabel c={c}>단위</FieldLabel>
        <View style={styles.chipsRow}>
          {COUNTER_UNIT_OPTIONS.map((opt) => {
            const selected = unitKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setUnitKey(opt.key)}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? c.onSurface : c.outline,
                    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: selected ? c.onSurface : c.onVariant,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}>
                  {opt.labelKo}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {unitKey === 'custom' ? (
          <>
            <FieldLabel c={c}>표시 단위</FieldLabel>
            <FieldInput
              value={customUnitLabel}
              onChangeText={(v) => setCustomUnitLabel(v.slice(0, 12))}
              placeholder="예: 잔, 세트, 페이지"
              c={c}
            />
          </>
        ) : null}

        <FieldLabel c={c}>하루 목표</FieldLabel>
        <FieldInput value={goalCountStr} onChangeText={setGoalCountStr} placeholder="8" c={c} keyboardType="number-pad" />

        <FieldLabel c={c}>빠른 추가 단위</FieldLabel>
        <View style={styles.inlineFields}>
          <FieldInput value={stepSizeStr} onChangeText={setStepSizeStr} placeholder="1" c={c} keyboardType="number-pad" />
          <FieldInput
            value={secondaryStepSizeStr}
            onChangeText={setSecondaryStepSizeStr}
            placeholder="5"
            c={c}
            keyboardType="number-pad"
          />
        </View>
        <ThemedText style={[styles.helper, { color: c.onVariant }]}>
          큰 버튼과 보조 버튼에 쓰일 증가값이에요.
        </ThemedText>

        <View style={styles.switchRow}>
          <ThemedText style={[styles.helper, { color: c.onSurface, flex: 1 }]}>자정에 횟수 초기화</ThemedText>
          <Switch value={dailyReset} onValueChange={setDailyReset} />
        </View>
      </TemplateSection>
    </View>
  );
}

export function FocusSettings(props: SettingsProps) {
  const c = useTemplateSettingsPalette();
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null, hideTitleField = false } = props;
  const seed = () => normalizeFocusDetailConfig(dataConfig ?? getInitialFocusDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [planMinStr, setPlanMinStr] = useState(() => String(seed().planMin));
  const [focusMemo, setFocusMemo] = useState(() => seed().focusMemo);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const presets = [15, 25, 45, 60, 90];

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setPlanMinStr(String(next.planMin));
    setFocusMemo(next.focusMemo);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const base = seed();
    const payload = normalizeFocusDetailConfig({
      templateKey: 'focus',
      displayName,
      summary,
      planMin: parseInt(planMinStr, 10) || 25,
      doneMin: base.doneMin,
      focusMemo,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, summary, planMinStr, focusMemo, onChangeDataConfig, dataConfig]);

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, hideTitleField, c }} />
      <TemplateSection title="집중 시간" c={c}>
        <FieldLabel c={c}>목표 시간(분)</FieldLabel>
        <FieldInput value={planMinStr} onChangeText={setPlanMinStr} placeholder="25" c={c} keyboardType="number-pad" />
        <View style={styles.chipsRow}>
          {presets.map((min) => {
            const selected = parseInt(planMinStr, 10) === min;
            return (
              <Pressable
                key={min}
                accessibilityRole="button"
                onPress={() => setPlanMinStr(String(min))}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? c.onSurface : c.outline,
                    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText style={{ color: selected ? c.onSurface : c.onVariant, fontWeight: selected ? '700' : '500', fontSize: 13 }}>
                  {min}분
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <FieldLabel c={c}>집중 메모 (선택)</FieldLabel>
        <FieldInput value={focusMemo} onChangeText={(v) => setFocusMemo(v.slice(0, 200))} placeholder="예: 방해 금지 모드 켜기" c={c} multiline />
      </TemplateSection>
    </View>
  );
}

export function JournalSettings(props: SettingsProps) {
  const c = useTemplateSettingsPalette();
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null, hideTitleField = false } = props;
  const seed = () => normalizeJournalDetailConfig(dataConfig ?? getInitialJournalDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [prompt, setPrompt] = useState(() => seed().prompt);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setPrompt(next.prompt);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const base = seed();
    const payload = normalizeJournalDetailConfig({
      templateKey: 'journal',
      displayName,
      summary,
      prompt,
      lastEntry: base.lastEntry,
      moodToday: base.moodToday,
      recentEntries: base.recentEntries,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, summary, prompt, onChangeDataConfig, dataConfig]);

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, hideTitleField, c }} />
      <TemplateSection title="기록 설정" c={c}>
        <FieldLabel c={c}>질문·주제 (선택)</FieldLabel>
        <FieldInput value={prompt} onChangeText={(v) => setPrompt(v.slice(0, 80))} placeholder="예: 오늘 기분은?" c={c} />
        <ThemedText style={[styles.helper, { color: c.onVariant }]}>세션에서 짧은 메모를 남겨요.</ThemedText>
      </TemplateSection>
    </View>
  );
}

export function ReminderSettings(props: SettingsProps) {
  const c = useTemplateSettingsPalette();
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null, hideTitleField = false } = props;
  const seed = () => normalizeReminderDetailConfig(dataConfig ?? getInitialReminderDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [reminderItems, setReminderItems] = useState<ReminderScheduleItem[]>(() => seed().reminderItems);
  const [draftTime, setDraftTime] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setReminderItems(next.reminderItems);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  const persistItems = (items: ReminderScheduleItem[]) => {
    const base = seed();
    const payload = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      displayName,
      summary,
      reminderItems: items,
      completedTimes: base.completedTimes,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  };

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    persistItems(reminderItems);
  }, [displayName, summary, reminderItems, onChangeDataConfig, dataConfig]);

  const addItem = () => {
    const time = normalizeReminderTime(draftTime);
    if (!time || reminderItems.some((item) => item.time === time)) return;
    if (reminderItems.length >= MAX_CUSTOM_REMINDER_TIMES) return;
    const next = sortReminderScheduleItems([
      ...reminderItems,
      { time, label: draftLabel.trim().slice(0, 40) },
    ]);
    setReminderItems(next);
    setDraftTime('');
    setDraftLabel('');
  };

  const updateItemLabel = (time: string, label: string) => {
    setReminderItems((prev) =>
      prev.map((item) => (item.time === time ? { ...item, label: label.slice(0, 40) } : item)),
    );
  };

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, hideTitleField, c }} />
      <TemplateSection title="알림 시간" c={c}>
        <FieldLabel c={c}>자주 쓰는 예시</FieldLabel>
        <View style={styles.chipsRow}>
          {REMINDER_SCHEDULE_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              onPress={() => setReminderItems(preset.items)}
              style={[styles.chip, { borderColor: c.outline, backgroundColor: c.surfaceLowest }]}>
              <ThemedText style={[styles.chipText, { color: c.onVariant }]}>{preset.title}</ThemedText>
            </Pressable>
          ))}
        </View>

        {reminderItems.map((item) => (
          <View key={item.time} style={[styles.reminderSettingRow, { borderColor: c.outline }]}>
            <View style={styles.reminderSettingMain}>
              <ThemedText style={[styles.timeText, { color: c.onSurface }]}>{item.time}</ThemedText>
              <FieldInput
                value={item.label}
                onChangeText={(value) => updateItemLabel(item.time, value)}
                placeholder="어떤 알림인지 적어 주세요"
                c={c}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="알림 삭제"
              onPress={() => setReminderItems((prev) => prev.filter((row) => row.time !== item.time))}>
              <ThemedText style={[styles.removeTime, { color: c.onVariant }]}>삭제</ThemedText>
            </Pressable>
          </View>
        ))}

        {reminderItems.length < MAX_CUSTOM_REMINDER_TIMES ? (
          <View style={styles.reminderAddBlock}>
            <FieldLabel c={c}>알림 추가</FieldLabel>
            <View style={styles.timeAddRow}>
              <FieldInput value={draftTime} onChangeText={setDraftTime} placeholder="09:30" c={c} />
              <FieldInput
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder="예: 스트레칭"
                c={c}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={addItem}
              style={[styles.addTimeBtn, { borderColor: c.onSurface, alignSelf: 'flex-start' }]}>
              <ThemedText style={{ color: c.onSurface, fontWeight: '700', fontSize: 13 }}>추가</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <ThemedText style={[styles.helper, { color: c.onVariant }]}>
          각 시간마다 어떤 알림인지 적어 두면 세션에서 바로 확인할 수 있어요.
        </ThemedText>
      </TemplateSection>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16 },
  section: { borderWidth: 2, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 2, minHeight: 44, paddingHorizontal: 12, fontSize: 15, fontWeight: '600' },
  inputMultiline: { borderWidth: 2, minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
  helper: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8 },
  chipText: { fontSize: 13 },
  inlineFields: { flexDirection: 'row', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  reminderSettingRow: {
    borderWidth: 2,
    padding: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reminderSettingMain: { flex: 1, gap: 8, minWidth: 0 },
  reminderAddBlock: { gap: 8 },
  timeText: { fontSize: 16, fontWeight: '700' },
  removeTime: { fontSize: 12, fontWeight: '600' },
  timeAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addTimeBtn: { borderWidth: 2, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
});
