import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import {
  buildWorkStudyShareText,
  workStudyModeLabelKo,
  type WorkStudyMode,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { SettingsProgressBand } from '../../lib/SettingsProgressBand';
import { SettingsQuickChipRow } from '../../lib/SettingsQuickChipRow';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { StudyDdaySection } from './StudyDdaySection';
import { StudyTimetableSection } from './StudyTimetableSection';
import {
  getInitialWorkDataConfig,
  normalizeWorkDetailConfig,
  type WorkDetailDataConfig,
} from './workConfig';

const PRIMARY = 'rgb(0, 0, 0)';
const PLAN_MIN_PRESETS = [25, 45, 60, 90, 120];
const BREAK_MIN_PRESETS = [5, 10, 15];
const TODO_MEMO_MAX = 800;

export function WorkSettings({
  rhythmTitle,
  categoryKey = 'work',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
}) {
  const c = useMemo(() => goalDetailSettingsPalette(false), []);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  const initial = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [subject, setSubject] = useState(initial.subject);
  const [planMin, setPlanMin] = useState(initial.planMin);
  const [doneMin, setDoneMin] = useState(initial.doneMin);
  const [breakMin, setBreakMin] = useState(initial.breakMin);
  const [studyMode, setStudyMode] = useState<WorkStudyMode>(initial.studyMode);
  const [ddayEvents, setDdayEvents] = useState(initial.ddayEvents);
  const [timetableSlots, setTimetableSlots] = useState(initial.timetableSlots);
  const [focusMemo, setFocusMemo] = useState(initial.focusMemo);
  const [summary, setSummary] = useState(initial.summary);
  const lastRef = useRef<string | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const next = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());
    const key = JSON.stringify(next);
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    setDisplayName(next.displayName);
    setSubject(next.subject);
    setPlanMin(next.planMin);
    setDoneMin(next.doneMin);
    setBreakMin(next.breakMin);
    setStudyMode(next.studyMode);
    setDdayEvents(next.ddayEvents);
    setTimetableSlots(next.timetableSlots);
    setFocusMemo(next.focusMemo);
    setSummary(next.summary);
  }, [dataConfig]);

  const draftConfig = useMemo(
    (): WorkDetailDataConfig =>
      normalizeWorkDetailConfig({
        displayName,
        subject,
        planMin,
        doneMin,
        breakMin,
        studyMode,
        ddayEvents,
        timetableSlots,
        focusMemo,
        summary,
      }),
    [
      breakMin,
      displayName,
      doneMin,
      ddayEvents,
      focusMemo,
      planMin,
      studyMode,
      subject,
      summary,
      timetableSlots,
    ],
  );

  useEffect(() => {
    const s = JSON.stringify(draftConfig);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(draftConfig);
  }, [draftConfig, onChangeDataConfig]);

  const shareText = useMemo(
    () => buildWorkStudyShareText(draftConfig, { routineTitle: rhythmTitle }),
    [draftConfig, rhythmTitle],
  );

  const onShare = async () => {
    if (
      !subject.trim() &&
      !focusMemo.trim() &&
      ddayEvents.length === 0 &&
      timetableSlots.length === 0
    ) {
      Alert.alert('공유할 내용 없음', '과목·할 일·D-Day·시간표를 먼저 입력해 주세요.');
      return;
    }
    await Share.share({ message: shareText });
  };

  const onCopyPlan = async () => {
    if (
      !subject.trim() &&
      !focusMemo.trim() &&
      ddayEvents.length === 0 &&
      timetableSlots.length === 0
    ) {
      Alert.alert('복사할 내용 없음', '과목·할 일·D-Day·시간표를 먼저 입력해 주세요.');
      return;
    }
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(shareText);
    Alert.alert('복사 완료', '스터디 플랜을 클립보드에 복사했어요.');
  };

  const applyPomodoroPreset = () => {
    setStudyMode('pomodoro');
    setPlanMin(25);
    setBreakMin(5);
  };

  const setMode = (mode: WorkStudyMode) => {
    setStudyMode(mode);
    if (mode === 'free') {
      setBreakMin(0);
    } else if (breakMin <= 0) {
      setBreakMin(5);
    }
  };

  const cardBg = '#ffffff';
  const itemBg = 'rgba(0,0,0,0.03)';
  const itemBorder = 'rgba(0,0,0,0.06)';
  const focusRatio = planMin > 0 ? Math.min(1, doneMin / planMin) : 0;

  return (
    <View style={styles.root}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
      />

      <View style={styles.heading}>
        <ThemedText style={[styles.title, { color: c.onSurface }]}>스터디 설정</ThemedText>
        <ThemedText style={[styles.sub, { color: c.onVariant }]}>
          과목·D-Day·시간표·할 일을 정해 두고 공유하거나 복사할 수 있어요.
        </ThemedText>
      </View>

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

      <View style={[styles.fieldBlock, { borderColor: c.outline }]}>
        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>과목·주제</ThemedText>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="과목·주제"
          placeholderTextColor={c.outline}
          style={[styles.subjectInput, { color: c.onSurface, borderColor: c.outlineVariant }]}
        />
      </View>

      <View style={styles.modeRow}>
        <ThemedText style={[styles.fieldLabel, { color: c.onSurface }]}>스터디 모드</ThemedText>
        <View style={styles.modeChipRow}>
          {(['free', 'pomodoro'] as const).map((mode) => {
            const active = studyMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(mode)}
                style={[
                  styles.modeChip,
                  {
                    borderColor: active ? PRIMARY : c.outline,
                    backgroundColor: active ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={{
                    color: active ? c.onSurface : c.onVariant,
                    fontWeight: active ? '800' : '600',
                    fontSize: 13,
                  }}>
                  {workStudyModeLabelKo(mode)}
                </ThemedText>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뽀모도로 25분 5분 휴식 프리셋"
            onPress={applyPomodoroPreset}
            style={[styles.pomodoroPresetBtn, { borderColor: c.outline }]}>
            <ThemedText style={{ color: c.onSurface, fontWeight: '700', fontSize: 12 }}>
              25+5
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <SettingsProgressBand
        title="스터디 시간"
        valueLine={`${doneMin}분 / ${planMin}분`}
        subLine={
          studyMode === 'pomodoro'
            ? `뽀모도로 · 휴식 ${breakMin}분 · ${Math.round(focusRatio * 100)}%`
            : `목표 ${planMin}분 · ${Math.round(focusRatio * 100)}%`
        }
        ratio={focusRatio}
        palette={c}
      />

      <SettingsQuickChipRow
        label={studyMode === 'pomodoro' ? '집중 블록(분)' : '목표 스터디 시간'}
        values={PLAN_MIN_PRESETS}
        formatLabel={(m) => `${m}분`}
        selected={planMin}
        onSelect={setPlanMin}
        palette={c}
      />

      {studyMode === 'pomodoro' ? (
        <SettingsQuickChipRow
          label="휴식(분)"
          values={BREAK_MIN_PRESETS}
          formatLabel={(m) => `${m}분`}
          selected={breakMin}
          onSelect={setBreakMin}
          palette={c}
        />
      ) : null}

      {studyMode === 'pomodoro' ? (
        <View style={[styles.pomodoroHint, { backgroundColor: itemBg, borderColor: itemBorder }]}>
          <ThemedText style={[styles.pomodoroHintText, { color: c.onVariant }]}>
            1회 = 집중 {planMin}분 → 휴식 {breakMin}분
          </ThemedText>
        </View>
      ) : null}

      <StudyDdaySection events={ddayEvents} onChangeEvents={setDdayEvents} palette={c} />

      <StudyTimetableSection
        slots={timetableSlots}
        onChangeSlots={setTimetableSlots}
        defaultSubject={subject}
        palette={c}
      />

      <View style={[styles.toolbar, { borderTopColor: c.onSurface, borderBottomColor: c.outline }]}>
        <Pressable style={styles.toolbarBtn} onPress={onShare} accessibilityRole="button">
          <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
          <ThemedText style={[styles.toolbarText, { color: c.onSurface }]}>공유</ThemedText>
        </Pressable>
        <Pressable style={styles.toolbarBtn} onPress={onCopyPlan} accessibilityRole="button">
          <IconSymbol name="doc.on.doc" size={16} color={c.onSurface} />
          <ThemedText style={[styles.toolbarText, { color: c.onSurface }]}>복사</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.noteSection, { backgroundColor: cardBg, borderColor: c.outlineVariant }]}>
        <View style={styles.noteHeader}>
          <IconSymbol name="square.and.pencil" size={16} color={PRIMARY} />
          <ThemedText style={[styles.noteTitle, { color: c.onSurface }]}>할 일</ThemedText>
        </View>
        <TextInput
          value={focusMemo}
          onChangeText={(text) => setFocusMemo(text.slice(0, TODO_MEMO_MAX))}
          placeholder="오늘 할 일·집중할 내용을 자유롭게 적어 두세요"
          placeholderTextColor={c.outline}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          style={[styles.noteInput, { color: c.onSurface, borderColor: itemBorder, backgroundColor: itemBg }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  heading: { gap: 6 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  sub: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1, marginLeft: 2 },
  subjectInput: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  modeRow: { gap: 8 },
  modeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  modeChip: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  pomodoroPresetBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  pomodoroHint: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pomodoroHintText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  toolbar: {
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolbarText: { fontSize: 13, fontWeight: '700' },
  noteSection: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteTitle: { fontSize: 15, fontWeight: '800' },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
});
