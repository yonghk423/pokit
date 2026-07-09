import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  formatMinutesToHHmm,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';
import { hhmmToPickerDate, pickerDateToSnappedHhmm } from '@widgets/daily-rhythm-time-field';

type IosMinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

function toIosMinuteInterval(step: number): IosMinuteInterval {
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 5;
  const allowed: IosMinuteInterval[] = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30];
  return allowed.includes(s as IosMinuteInterval) ? (s as IosMinuteInterval) : 5;
}

export const CATALOG_SPINE_TIME_PANEL_COLLAPSED_HEIGHT = 66;
export const CATALOG_SPINE_TIME_PANEL_EXPANDED_HEIGHT = 228;

type Props = {
  startMinutes: number;
  endMinutes: number;
  ink: string;
  muted: string;
  line: string;
  isDark: boolean;
  disabled?: boolean;
  priorityStart: string;
  priorityEnd: string;
  onScheduleChange: (startMinutes: number, endMinutes: number) => void;
  onPickerExpandedChange?: (expanded: boolean) => void;
  contentInsetLeft?: number;
};

/** 루틴 목록 행 — 펼침 시 시작·종료 시각 선택(컴팩트) */
export function CatalogRowSpineTimePanel({
  startMinutes,
  endMinutes,
  ink,
  muted,
  line,
  isDark,
  disabled = false,
  priorityStart,
  priorityEnd,
  onScheduleChange,
  onPickerExpandedChange,
  contentInsetLeft = 34,
}: Props) {
  const [draftStart, setDraftStart] = useState(() => formatMinutesToHHmm(startMinutes));
  const [draftEnd, setDraftEnd] = useState(() => formatMinutesToHHmm(endMinutes));
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (expanded !== null) return;
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
  }, [expanded, startMinutes, endMinutes]);

  useEffect(() => {
    onPickerExpandedChange?.(expanded !== null);
  }, [expanded, onPickerExpandedChange]);

  const applyRoutineWindow = useMemo(() => {
    const rs = priorityStart.trim();
    const re = priorityEnd.trim();
    if (!rs || !re || parseHHmmToMinutes(rs) === null || parseHHmmToMinutes(re) === null) {
      return (hhmm: string) => hhmm;
    }
    return (hhmm: string) => clampHhmmToPriorityWindow(hhmm, rs, re, 5);
  }, [priorityEnd, priorityStart]);

  const commitDraft = useCallback(
    (startHhmm: string, endHhmm: string) => {
      const start = parseHHmmToMinutes(startHhmm);
      let end = parseHHmmToMinutes(endHhmm);
      if (start === null || end === null) return;
      if (end <= start) end = Math.min(24 * 60, start + 15);
      onScheduleChange(start, end);
    },
    [onScheduleChange],
  );

  const updateDraftStart = useCallback(
    (hhmm: string) => {
      setDraftStart(applyRoutineWindow(hhmm));
    },
    [applyRoutineWindow],
  );

  const updateDraftEnd = useCallback(
    (hhmm: string) => {
      setDraftEnd(applyRoutineWindow(hhmm));
    },
    [applyRoutineWindow],
  );

  const resetDraftFromProps = useCallback(() => {
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
  }, [endMinutes, startMinutes]);

  const handleConfirm = useCallback(() => {
    if (disabled) return;
    commitDraft(draftStart, draftEnd);
    setExpanded(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [commitDraft, disabled, draftEnd, draftStart]);

  const toggleExpand = useCallback(
    (field: 'start' | 'end') => {
      if (disabled) return;
      void Haptics.selectionAsync();
      setExpanded((cur) => {
        if (cur === field) {
          resetDraftFromProps();
          return null;
        }
        if (cur === null) {
          resetDraftFromProps();
        }
        return field;
      });
    },
    [disabled, resetDraftFromProps],
  );

  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const activeField = expanded;
  const pickerDate = useMemo(
    () => hhmmToPickerDate(activeField === 'end' ? draftEnd : draftStart),
    [activeField, draftEnd, draftStart],
  );

  const committedStart = formatMinutesToHHmm(startMinutes);
  const committedEnd = formatMinutesToHHmm(endMinutes);
  const displayStart = expanded !== null ? draftStart : committedStart;
  const displayEnd = expanded !== null ? draftEnd : committedEnd;

  const onIosTimeChange = (_: unknown, date?: Date) => {
    if (!date || !activeField) return;
    const snapped = pickerDateToSnappedHhmm(date, 5);
    if (activeField === 'start') {
      updateDraftStart(snapped);
    } else {
      updateDraftEnd(snapped);
    }
  };

  const onAndroidTimeChange = (event: { type?: string }, date?: Date) => {
    if (event.type === 'dismissed') {
      resetDraftFromProps();
      setExpanded(null);
      return;
    }
    if (!date || !activeField) return;
    const snapped = pickerDateToSnappedHhmm(date, 5);
    if (activeField === 'start') {
      updateDraftStart(snapped);
    } else {
      updateDraftEnd(snapped);
    }
  };

  const renderSegment = (field: 'start' | 'end', label: string, valueHhmm: string) => {
    const selected = activeField === field;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${label} ${formatHhmmClockKo(valueHhmm)}`}
        disabled={disabled}
        onPress={() => toggleExpand(field)}
        style={({ pressed }) => [
          styles.segment,
          selected && { backgroundColor: ink },
          !selected && pressed && { opacity: 0.72 },
          disabled && { opacity: 0.45 },
        ]}>
        <ThemedText
          style={[styles.segmentLabel, { color: selected ? selectedFg : muted }]}
          numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText
          style={[styles.segmentTime, { color: selected ? selectedFg : ink }]}
          numberOfLines={1}>
          {formatHhmmClockKo(valueHhmm)}
        </ThemedText>
      </Pressable>
    );
  };

  const renderConfirmSegment = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="선택한 시간 적용"
      disabled={disabled}
      onPress={handleConfirm}
      style={({ pressed }) => [
        styles.confirmSegment,
        { backgroundColor: ink, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
      ]}>
      <ThemedText style={[styles.confirmSegmentLabel, { color: selectedFg }]}>확인</ThemedText>
    </Pressable>
  );

  return (
    <View style={[styles.root, { paddingLeft: contentInsetLeft }]}>
      <View style={[styles.track, { backgroundColor: trackBg, borderColor: line }]}>
        {renderSegment('start', '시작', displayStart)}
        <View style={[styles.segmentDivider, { backgroundColor: line }]} />
        {renderSegment('end', '종료', displayEnd)}
        {activeField ? (
          <>
            <View style={[styles.segmentDivider, { backgroundColor: line }]} />
            {renderConfirmSegment()}
          </>
        ) : null}
      </View>
      {Platform.OS === 'ios' && activeField ? (
        <View style={styles.pickerWrap}>
          <View style={styles.pickerScale}>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              display="spinner"
              themeVariant={isDark ? 'dark' : 'light'}
              minuteInterval={toIosMinuteInterval(5)}
              onChange={onIosTimeChange}
              style={styles.iosPicker}
            />
          </View>
        </View>
      ) : null}
      {Platform.OS === 'android' && activeField ? (
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
  root: {
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 14,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 2,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  segmentDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  segmentLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  segmentTime: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  pickerWrap: {
    marginTop: 0,
    overflow: 'hidden',
    alignItems: 'center',
  },
  pickerScale: {
    height: 132,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.8 }],
    marginTop: -22,
    marginBottom: -18,
  },
  iosPicker: {
    width: '100%',
    height: 196,
  },
  confirmSegment: {
    width: 42,
    flexShrink: 0,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  confirmSegmentLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
