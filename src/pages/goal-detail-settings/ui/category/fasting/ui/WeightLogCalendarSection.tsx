import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  addMonths,
  buildMonthCalendarGrid,
  dateKeyFromDate,
  formatDateKeyDisplayKo,
  formatMonthTitleKo,
  getLocalDateKey,
  toMonthStart,
} from '@entities/day-plan';
import {
  clampWeightKg,
  readWeightLogForDate,
  removeFastingWeightLog,
  setFastingWeightLog,
  type FastingWeightLogs,
} from '@entities/day-plan/lib/weightLog';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

const PRIMARY = 'rgb(0, 0, 0)';
const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일'];

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

type Props = {
  weightLogs: FastingWeightLogs;
  onChangeWeightLogs: (next: FastingWeightLogs) => void;
  onLatestWeightChange?: (weightKg: number) => void;
  palette: Palette;
};

export function WeightLogCalendarSection({
  weightLogs,
  onChangeWeightLogs,
  onLatestWeightChange,
  palette,
}: Props) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthStart, setMonthStart] = useState(() => toMonthStart(new Date()));
  const [draftWeightStr, setDraftWeightStr] = useState('');

  const monthGrid = useMemo(() => buildMonthCalendarGrid(monthStart), [monthStart]);
  const monthTitle = useMemo(() => formatMonthTitleKo(monthStart), [monthStart]);
  const selectedWeight = readWeightLogForDate(weightLogs, selectedDateKey);

  useEffect(() => {
    setDraftWeightStr(selectedWeight != null ? String(selectedWeight) : '');
  }, [selectedDateKey, selectedWeight]);

  const saveWeight = () => {
    const parsed = parseFloat(draftWeightStr.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    const nextLogs = setFastingWeightLog(weightLogs, selectedDateKey, clampWeightKg(parsed));
    onChangeWeightLogs(nextLogs);
    onLatestWeightChange?.(clampWeightKg(parsed));
  };

  const clearWeight = () => {
    const nextLogs = removeFastingWeightLog(weightLogs, selectedDateKey);
    onChangeWeightLogs(nextLogs);
    setDraftWeightStr('');
  };

  return (
    <View style={[styles.wrap, { borderColor: palette.outline }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="calendar" size={16} color={PRIMARY} />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: palette.onSurface }]}>날짜별 체중 기록</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.onVariant }]}>
            날짜를 고르고 그날의 체중(kg)을 입력해요.
          </ThemedText>
        </View>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          onPress={() => setMonthStart((m) => addMonths(m, -1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={14} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.monthTitle, { color: palette.onSurface }]}>{monthTitle}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          onPress={() => setMonthStart((m) => addMonths(m, 1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={14} color={palette.onSurface} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADERS.map((label) => (
          <ThemedText key={label} style={[styles.weekdayLabel, { color: palette.onVariant }]}>
            {label}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {monthGrid.map((day) => {
          const dateKey = dateKeyFromDate(day);
          const inMonth = day.getMonth() === monthStart.getMonth();
          const selected = dateKey === selectedDateKey;
          const logged = readWeightLogForDate(weightLogs, dateKey);
          const isToday = dateKey === todayKey;
          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatDateKeyDisplayKo(dateKey)} 선택`}
              onPress={() => setSelectedDateKey(dateKey)}
              style={[
                styles.dayCell,
                selected && { backgroundColor: 'rgba(0,0,0,0.08)', borderColor: PRIMARY },
                !inMonth && styles.dayCellMuted,
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  {
                    color: inMonth ? palette.onSurface : palette.outline,
                    fontWeight: isToday ? '900' : selected ? '800' : '600',
                  },
                ]}>
                {day.getDate()}
              </ThemedText>
              {logged != null ? (
                <ThemedText style={[styles.weightMini, { color: palette.onVariant }]} numberOfLines={1}>
                  {logged.toFixed(1)}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.inputBlock, { borderColor: palette.outlineVariant }]}>
        <ThemedText style={[styles.selectedDate, { color: palette.onVariant }]}>
          {formatDateKeyDisplayKo(selectedDateKey)}
        </ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            value={draftWeightStr}
            onChangeText={setDraftWeightStr}
            onSubmitEditing={saveWeight}
            returnKeyType="done"
            keyboardType="decimal-pad"
            placeholder="체중(kg)"
            placeholderTextColor={palette.outline}
            style={[styles.input, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="체중 저장"
            onPress={saveWeight}
            style={styles.saveBtn}>
            <ThemedText style={styles.saveBtnText}>저장</ThemedText>
          </Pressable>
          {selectedWeight != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="기록 삭제"
              onPress={clearWeight}
              hitSlop={8}
              style={styles.clearBtn}>
              <IconSymbol name="trash" size={14} color={palette.onVariant} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 13, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: 2,
    gap: 0,
  },
  dayLabel: { fontSize: 12, lineHeight: 14 },
  weightMini: { fontSize: 8, fontWeight: '700', lineHeight: 10 },
  dayCellMuted: { opacity: 0.35 },
  inputBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  selectedDate: { fontSize: 12, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  clearBtn: { padding: 6 },
});
