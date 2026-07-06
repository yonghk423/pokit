import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import {
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialReminderDataConfig,
  MAX_CUSTOM_REMINDER_TIMES,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeReminderDetailConfig,
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
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  return (
    <>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
      />
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
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null } = props;
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
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, c }} />
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
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null } = props;
  const seed = () => normalizeCounterDetailConfig(dataConfig ?? getInitialCounterDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [activityLabel, setActivityLabel] = useState(() => seed().activityLabel);
  const [unitLabel, setUnitLabel] = useState(() => seed().unitLabel);
  const [goalCountStr, setGoalCountStr] = useState(() => String(seed().goalCount));
  const [dailyReset, setDailyReset] = useState(() => seed().dailyReset);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setActivityLabel(next.activityLabel);
    setUnitLabel(next.unitLabel);
    setGoalCountStr(String(next.goalCount));
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
    const payload = normalizeCounterDetailConfig({
      templateKey: 'counter',
      displayName,
      summary,
      activityLabel,
      unitLabel,
      goalCount: goalRaw,
      currentCount: base.currentCount,
      dailyReset,
      countDateKey: base.countDateKey,
      ...(base.icon ? { icon: base.icon } : {}),
      ...(base.accentColor ? { accentColor: base.accentColor } : {}),
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, summary, activityLabel, unitLabel, goalCountStr, dailyReset, onChangeDataConfig, dataConfig]);

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, c }} />
      <TemplateSection title="횟수 설정" c={c}>
        <FieldLabel c={c}>무엇을 셀까요?</FieldLabel>
        <FieldInput value={activityLabel} onChangeText={(v) => setActivityLabel(v.slice(0, 40))} placeholder="예: 푸쉬업, 물 마시기" c={c} />
        <FieldLabel c={c}>단위</FieldLabel>
        <FieldInput value={unitLabel} onChangeText={(v) => setUnitLabel(v.slice(0, 12))} placeholder="회" c={c} />
        <FieldLabel c={c}>하루 목표</FieldLabel>
        <FieldInput value={goalCountStr} onChangeText={setGoalCountStr} placeholder="8" c={c} keyboardType="number-pad" />
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
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null } = props;
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
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, c }} />
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
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null } = props;
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
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, c }} />
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
  const { rhythmTitle, categoryKey, dataConfig, onChangeDataConfig, allowRename = true, renameLockedReason = null } = props;
  const seed = () => normalizeReminderDetailConfig(dataConfig ?? getInitialReminderDataConfig());
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const [reminderTimes, setReminderTimes] = useState<string[]>(() => seed().reminderTimes);
  const [draftTime, setDraftTime] = useState('');
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setReminderTimes(next.reminderTimes);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  const persistTimes = (times: string[]) => {
    const base = seed();
    const payload = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      displayName,
      summary,
      reminderTimes: times,
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
    persistTimes(reminderTimes);
  }, [displayName, summary, reminderTimes, onChangeDataConfig, dataConfig]);

  const addTime = () => {
    const normalized = normalizeReminderDetailConfig({ reminderTimes: [draftTime] }).reminderTimes[0];
    if (!normalized || reminderTimes.includes(normalized)) return;
    if (reminderTimes.length >= MAX_CUSTOM_REMINDER_TIMES) return;
    setReminderTimes((prev) => [...prev, normalized].sort());
    setDraftTime('');
  };

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader {...{ rhythmTitle, categoryKey, displayName, setDisplayName, summary, setSummary, allowRename, renameLockedReason, c }} />
      <TemplateSection title="알림 시간" c={c}>
        {reminderTimes.map((time) => (
          <View key={time} style={[styles.timeRow, { borderColor: c.outline }]}>
            <ThemedText style={[styles.timeText, { color: c.onSurface }]}>{time}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="시간 삭제"
              onPress={() => setReminderTimes((prev) => prev.filter((t) => t !== time))}>
              <ThemedText style={[styles.removeTime, { color: c.onVariant }]}>삭제</ThemedText>
            </Pressable>
          </View>
        ))}
        {reminderTimes.length < MAX_CUSTOM_REMINDER_TIMES ? (
          <View style={styles.timeAddRow}>
            <FieldInput value={draftTime} onChangeText={setDraftTime} placeholder="09:30" c={c} />
            <Pressable accessibilityRole="button" onPress={addTime} style={[styles.addTimeBtn, { borderColor: c.onSurface }]}>
              <ThemedText style={{ color: c.onSurface, fontWeight: '700', fontSize: 13 }}>추가</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <ThemedText style={[styles.helper, { color: c.onVariant }]}>
          알림은 추후 연동될 예정이에요. 지금은 시간 목록만 저장해요.
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
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  timeText: { fontSize: 16, fontWeight: '700' },
  removeTime: { fontSize: 12, fontWeight: '600' },
  timeAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addTimeBtn: { borderWidth: 2, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
});
