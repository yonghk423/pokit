import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  WORK_STUDY_WEEKDAY_LABELS_KO,
  weekdayFromDate,
  type WorkStudyTimetableSlot,
  type WorkStudyWeekday,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

const PRIMARY = 'rgb(0, 0, 0)';

type Props = {
  slots: WorkStudyTimetableSlot[];
  onChangeSlots: (next: WorkStudyTimetableSlot[]) => void;
  defaultSubject?: string;
  palette: ReturnType<typeof goalDetailSettingsPalette>;
};

function makeSlotId() {
  return `tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeHhmmInput(raw: string, fallback: string): string {
  const t = raw.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return fallback;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function StudyTimetableSection({ slots, onChangeSlots, defaultSubject = '', palette }: Props) {
  const [selectedWeekday, setSelectedWeekday] = useState<WorkStudyWeekday>(() =>
    weekdayFromDate(new Date()),
  );
  const [draftSubject, setDraftSubject] = useState(defaultSubject);
  const [startHhmm, setStartHhmm] = useState('09:00');
  const [endHhmm, setEndHhmm] = useState('10:00');
  const [place, setPlace] = useState('');

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.weekday === selectedWeekday)
        .sort((a, b) => a.startHhmm.localeCompare(b.startHhmm)),
    [selectedWeekday, slots],
  );

  const addSlot = () => {
    const subject = draftSubject.trim();
    if (!subject) return;
    const start = normalizeHhmmInput(startHhmm, '09:00');
    let end = normalizeHhmmInput(endHhmm, '10:00');
    if (end <= start) end = normalizeHhmmInput('10:00', '10:00');
    onChangeSlots([
      ...slots,
      {
        id: makeSlotId(),
        weekday: selectedWeekday,
        startHhmm: start,
        endHhmm: end,
        subject,
        place: place.trim(),
      },
    ]);
    setPlace('');
  };

  const removeSlot = (id: string) => {
    onChangeSlots(slots.filter((s) => s.id !== id));
  };

  return (
    <View style={[styles.wrap, { borderColor: palette.outline }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="clock.fill" size={18} color={PRIMARY} />
        <ThemedText style={[styles.title, { color: palette.onSurface }]}>주간 시간표</ThemedText>
      </View>
      <ThemedText style={[styles.hint, { color: palette.onVariant }]}>
        요일별 수업·스터디 블록을 추가해요.
      </ThemedText>

      <View style={styles.weekdayRow}>
        {WORK_STUDY_WEEKDAY_LABELS_KO.map((label, index) => {
          const weekday = index as WorkStudyWeekday;
          const active = selectedWeekday === weekday;
          const count = slots.filter((s) => s.weekday === weekday).length;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedWeekday(weekday)}
              style={[
                styles.weekdayChip,
                {
                  borderColor: active ? PRIMARY : palette.outlineVariant,
                  backgroundColor: active ? 'rgba(0,0,0,0.06)' : palette.surfaceLowest,
                },
              ]}>
              <ThemedText
                style={{
                  color: active ? palette.onSurface : palette.onVariant,
                  fontWeight: active ? '800' : '600',
                  fontSize: 12,
                }}>
                {label}
              </ThemedText>
              {count > 0 ? (
                <View style={[styles.countDot, { backgroundColor: PRIMARY }]}>
                  <ThemedText style={styles.countDotText}>{count}</ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {daySlots.length > 0 ? (
        <View style={styles.slotList}>
          {daySlots.map((slot) => (
            <View
              key={slot.id}
              style={[styles.slotRow, { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceLowest }]}>
              <View style={styles.slotMain}>
                <ThemedText style={[styles.slotTime, { color: palette.onSurface }]}>
                  {slot.startHhmm}–{slot.endHhmm}
                </ThemedText>
                <ThemedText style={[styles.slotSubject, { color: palette.onSurface }]} numberOfLines={1}>
                  {slot.subject}
                </ThemedText>
                {slot.place.trim() ? (
                  <ThemedText style={[styles.slotPlace, { color: palette.onVariant }]} numberOfLines={1}>
                    {slot.place.trim()}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => removeSlot(slot.id)}
                hitSlop={8}
                accessibilityLabel="시간표 항목 삭제"
                style={styles.removeBtn}>
                <IconSymbol name="trash" size={14} color={palette.onVariant} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText style={[styles.empty, { color: palette.onVariant }]}>
          {WORK_STUDY_WEEKDAY_LABELS_KO[selectedWeekday]}요일 시간표가 비어 있어요.
        </ThemedText>
      )}

      <View style={[styles.addBlock, { borderColor: palette.outlineVariant }]}>
        <ThemedText style={[styles.addLabel, { color: palette.onVariant }]}>
          {WORK_STUDY_WEEKDAY_LABELS_KO[selectedWeekday]}요일 추가
        </ThemedText>
        <TextInput
          value={draftSubject}
          onChangeText={setDraftSubject}
          placeholder="과목·스터디 이름"
          placeholderTextColor={palette.outline}
          style={[styles.fieldInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
        />
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <ThemedText style={[styles.timeLabel, { color: palette.onVariant }]}>시작</ThemedText>
            <TextInput
              value={startHhmm}
              onChangeText={setStartHhmm}
              onBlur={() => setStartHhmm((v) => normalizeHhmmInput(v, '09:00'))}
              placeholder="09:00"
              placeholderTextColor={palette.outline}
              keyboardType="numbers-and-punctuation"
              style={[styles.timeInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
            />
          </View>
          <View style={styles.timeField}>
            <ThemedText style={[styles.timeLabel, { color: palette.onVariant }]}>종료</ThemedText>
            <TextInput
              value={endHhmm}
              onChangeText={setEndHhmm}
              onBlur={() => setEndHhmm((v) => normalizeHhmmInput(v, '10:00'))}
              placeholder="10:00"
              placeholderTextColor={palette.outline}
              keyboardType="numbers-and-punctuation"
              style={[styles.timeInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
            />
          </View>
        </View>
        <TextInput
          value={place}
          onChangeText={setPlace}
          placeholder="장소 (선택)"
          placeholderTextColor={palette.outline}
          style={[styles.fieldInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
        />
        <Pressable onPress={addSlot} style={styles.addBtn}>
          <ThemedText style={styles.addBtnText}>시간표 추가</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weekdayChip: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    overflow: 'visible',
  },
  countDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : {}),
  },
  slotList: { gap: 8 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  slotMain: { flex: 1, gap: 2 },
  slotTime: { fontSize: 13, fontWeight: '800' },
  slotSubject: { fontSize: 15, fontWeight: '700' },
  slotPlace: { fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 4 },
  empty: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 6 },
  addBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  addLabel: { fontSize: 12, fontWeight: '700' },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { fontSize: 11, fontWeight: '700' },
  timeInput: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
