import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { clampHhmmToPriorityWindow, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

import {
  hhmmToPickerDate,
  pickerDateToSnappedHhmm,
  TIME_SNAP_MINUTES,
} from '../lib/snappedPickerMath';

const PRIMARY = 'rgb(0, 0, 0)';

/** iOS `UIDatePicker`에서 허용하는 분 간격 */
type IosMinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

function toIosMinuteInterval(step: number): IosMinuteInterval {
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 5;
  const allowed: IosMinuteInterval[] = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30];
  return allowed.includes(s as IosMinuteInterval) ? (s as IosMinuteInterval) : 1;
}

export type SnappedTimePickerFieldPalette = {
  onSurface: string;
  onVariant: string;
  border: string;
  containerLowest: string;
};

export type SnappedTimePickerFieldProps = {
  label: string;
  hint: string;
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isDark: boolean;
  palette: SnappedTimePickerFieldPalette;
  /** 분 스냅 간격. 생략 시 5분(타임라인과 동일). 시작·마무리 등은 `1` 권장 */
  snapStepMinutes?: number;
  /** 데이플랜「시작~마무리」안으로만 시각이 잡힘(둘 다 유효할 때만) */
  routineDayStartHhmm?: string;
  routineDayEndHhmm?: string;
  /** 시각 pill 왼쪽에 표시할 날짜(예: 5월 21일) */
  dateCaption?: string;
};

export function SnappedTimePickerField({
  label,
  hint,
  valueHhmm,
  onChangeHhmm,
  expanded,
  onToggleExpand,
  isDark,
  palette,
  snapStepMinutes = TIME_SNAP_MINUTES,
  routineDayStartHhmm,
  routineDayEndHhmm,
  dateCaption,
}: SnappedTimePickerFieldProps) {
  const pickerDate = useMemo(() => hhmmToPickerDate(valueHhmm), [valueHhmm]);

  const applyRoutineWindow = useMemo(() => {
    const rs = routineDayStartHhmm?.trim() ?? '';
    const re = routineDayEndHhmm?.trim() ?? '';
    if (
      !rs ||
      !re ||
      parseHHmmToMinutes(rs) === null ||
      parseHHmmToMinutes(re) === null
    ) {
      return (hhmm: string) => hhmm;
    }
    return (hhmm: string) => clampHhmmToPriorityWindow(hhmm, rs, re, snapStepMinutes);
  }, [routineDayStartHhmm, routineDayEndHhmm, snapStepMinutes]);

  const onIosTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const snapped = pickerDateToSnappedHhmm(date, snapStepMinutes);
    onChangeHhmm(applyRoutineWindow(snapped));
  };

  const onAndroidTimeChange = (event: { type?: string }, date?: Date) => {
    if (event.type === 'dismissed') {
      onToggleExpand();
      return;
    }
    if (!date) return;
    const snapped = pickerDateToSnappedHhmm(date, snapStepMinutes);
    onChangeHhmm(applyRoutineWindow(snapped));
    onToggleExpand();
  };

  return (
    <View>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [styles.timeRow, pressed && { opacity: 0.9 }]}>
        <View style={styles.timeRowLeft}>
          <ThemedText
            style={[styles.timeRowLabel, { color: palette.onSurface }]}
            lightColor={palette.onSurface}
            darkColor={palette.onSurface}>
            {label}
          </ThemedText>
          <ThemedText
            style={[styles.timeRowHint, { color: palette.onVariant }]}
            lightColor={palette.onVariant}
            darkColor={palette.onVariant}>
            {hint}
          </ThemedText>
        </View>
        <View style={styles.timeRowRight}>
          {dateCaption ? (
            <ThemedText
              style={[styles.timeDateAside, { color: palette.onVariant }]}
              lightColor={palette.onVariant}
              darkColor={palette.onVariant}
              numberOfLines={1}>
              {dateCaption}
            </ThemedText>
          ) : null}
          <View
            style={[
              styles.timePill,
              {
                backgroundColor: palette.containerLowest,
                borderColor: expanded ? PRIMARY : palette.border,
              },
            ]}>
            <ThemedText
              style={[styles.timePillText, { color: palette.onSurface }]}
              lightColor={palette.onSurface}
              darkColor={palette.onSurface}>
              {formatHhmmClockKo(valueHhmm)}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {Platform.OS === 'ios' && expanded ? (
        <View style={styles.iosPickerBlock}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            themeVariant={isDark ? 'dark' : 'light'}
            minuteInterval={toIosMinuteInterval(snapStepMinutes)}
            onChange={onIosTimeChange}
          />
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${label} 시간 선택 확인`}
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.86 }]}>
            <ThemedText style={styles.confirmBtnText}>확인</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {Platform.OS === 'android' && expanded ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={onAndroidTimeChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeRowLeft: { flex: 1, gap: 2, minWidth: 0 },
  timeRowLabel: { fontSize: 14, fontWeight: '700' },
  timeRowHint: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  timeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  timeDateAside: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'right',
  },
  timePill: {
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  timePillText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  iosPickerBlock: {
    paddingTop: 6,
    gap: 2,
  },
  confirmBtn: {
    alignSelf: 'flex-end',
    minWidth: 68,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: -0.1,
  },
});
