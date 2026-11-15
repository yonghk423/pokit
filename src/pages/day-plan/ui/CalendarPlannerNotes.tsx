import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useState, useSyncExternalStore } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { useTranslation } from '@shared/lib/i18n';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { subscribeCalendarPlanner, notifyCalendarPlannerUpdated } from '../model/calendarPlannerUpdates';
import { HeroCardAppearanceControls } from './HeroCardAppearanceControls';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { ThemedText } from '@shared/ui/themed-text';
import type { AppFontId } from '@shared/lib/ui-font';

type PlannerEntry = { memo: string; task: string; done: boolean; fontId?: AppFontId };

export function CalendarPlannerNotes({ month, scale, readOnly, expandedHeight, inkColor = '#383B37', ruleColor = '#B7B1A7' }: { month: string; scale: number; readOnly: boolean; expandedHeight?: number; inkColor?: string; ruleColor?: string }) {
  const key = 'pokit:calendar-planner:' + month;
  const { locale } = useTranslation();
  const english = locale === 'en';
  const [editing, setEditing] = useState(false);
  const saved = useSyncExternalStore(
    subscribeCalendarPlanner,
    () => JSON.stringify(localStorageClient.getJson<PlannerEntry>(key)),
    () => JSON.stringify(localStorageClient.getJson<PlannerEntry>(key)),
  );
  const entry: PlannerEntry = JSON.parse(saved) ?? { memo: '', task: '', done: false };
  const memoLabel = english ? 'Note' : translateUiText("메모");
  function update(patch: Partial<PlannerEntry>, notify = true) {
    const current = localStorageClient.getJson<PlannerEntry>(key) ?? { memo: '', task: '', done: false };
    localStorageClient.setJson(key, { ...current, ...patch });
    if (notify) notifyCalendarPlannerUpdated();
  }
  function finish() {
    Keyboard.dismiss();
    setEditing(false);
    notifyCalendarPlannerUpdated();
  }
  const ink = { fontSize: 13 * scale, color: inkColor };
  return <View style={{ marginTop: 10 * scale, borderTopWidth: 0.5, borderColor: ruleColor, paddingVertical: 6 * scale }}>
    <Pressable testID="calendar-planner-memo-open" accessibilityRole="button" accessibilityLabel={english ? 'Edit monthly memo' : translateUiText("월간 메모 편집")} disabled={readOnly} onPress={() => setEditing(true)} style={{ height: expandedHeight ?? 54 * scale, borderBottomWidth: 0.5, borderColor: ruleColor, paddingTop: 2 * scale }}>
      <ThemedText style={[ink, { fontWeight: '700', marginBottom: 3 * scale, opacity: 0.82 }]}>{english ? 'NOTE' : translateUiText("메모")}</ThemedText>
      <ThemedText fontId={entry.fontId} numberOfLines={expandedHeight == null ? 2 : undefined} style={[ink, { minHeight: 26 * scale, color: entry.memo ? inkColor : navyMuted(inkColor), opacity: entry.memo ? 1 : 0.58 }]}>{entry.memo || (english ? 'Add a note' : translateUiText("메모를 입력하세요"))}</ThemedText>
    </Pressable>
    {editing && !readOnly && <PlannerNotesEditor
      month={month}
      entry={entry}
      memoLabel={memoLabel}
      inkColor={inkColor}
      doneLabel={english ? 'Done' : translateUiText("완료")}
      onChange={patch => update(patch, false)}
      onClose={finish}
    />}
  </View>;
}

function PlannerNotesEditor({ month, entry, memoLabel, inkColor, doneLabel, onChange, onClose }: {
  month: string; entry: PlannerEntry; memoLabel: string; inkColor: string; doneLabel: string;
  onChange: (patch: Partial<PlannerEntry>) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const initialText = entry.memo;
  const [draft, setDraft] = useState(initialText);
  const [fontId, setFontId] = useState<AppFontId | undefined>(entry.fontId);
  const { locale } = useTranslation();
  const english = locale === 'en';
  function finishEditing() {
    onClose();
  }
  const title = memoLabel;
  return <AppModal transparent statusBarTranslucent visible onRequestClose={finishEditing}>
    <KeyboardAvoidingView testID="calendar-planner-keyboard-editor" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
      <Pressable accessibilityLabel={doneLabel} onPress={finishEditing} style={StyleSheet.absoluteFill} />
      <View style={[styles.sheet, { marginTop: insets.top + 12, paddingBottom: 16 }]}>
        <View style={styles.toolbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.month}>{month}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={finishEditing} style={styles.done}>
            <Text style={styles.doneText}>{doneLabel}</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={styles.editorContent}>
          <Text style={styles.sectionLabel}>{english ? 'NOTE' : translateUiText("메모")}</Text>
          <ThemedTextInput
            testID="calendar-planner-editor-input"
            autoFocus
            multiline
            accessibilityLabel={title}
            fontId={fontId}
            placeholder={english ? 'Add a note' : translateUiText("메모를 입력하세요")}
            placeholderTextColor={inkColor.toLowerCase() === '#f0f3f8' ? '#A7B4C4' : '#A9A8AE'}
            value={draft}
            onChange={event => { const value = event.nativeEvent.text; setDraft(value); onChange({ memo: value }); }}
            textAlignVertical="top"
            style={[styles.input, { color: inkColor, height: 160 }]}
          />
          <Text style={styles.letteringLabel}>{english ? 'LETTERING' : translateUiText("레터링")}</Text>
          <HeroCardAppearanceControls paper="#FAFAF6" pen={inkColor} fontId={fontId} fontsOnly onChange={patch => {
            const next = patch.fontId;
            setFontId(next);
            onChange({ fontId: next });
          }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </AppModal>;
}

function navyMuted(color: string) {
  return color.toLowerCase() === '#f0f3f8' ? '#B7C5D5' : '#8D928B';
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.18)' },
  sheet: { maxHeight: '70%', flexShrink: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FAFAF6', paddingHorizontal: 22 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D8DCD5' },
  month: { fontSize: 12, color: '#777D74', marginBottom: 4 },
  done: { minHeight: 44, minWidth: 60, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  doneText: { fontSize: 17, color: '#278B77' },
  editorContent: { paddingBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#777D74', marginTop: 12, marginBottom: 6 },
  letteringLabel: { fontSize: 13, fontWeight: '600', color: '#777D74', marginTop: 12, marginBottom: 2 },
  input: { fontSize: 17, lineHeight: 26, color: '#383B37', paddingTop: 12, paddingBottom: 24 },
});
