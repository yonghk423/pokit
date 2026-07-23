import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addDaysToLocalDateKey,
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  formatMinutesToHHmm,
  getLocalDateKey,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import { DigitalHhmmInput } from '@shared/ui/digital-hhmm-input';
import { ThemedText } from '@shared/ui/themed-text';

import { formatDateKeyCompactKo } from '../lib/dayPlanEditorShared';

/** 시작·종료 트랙 + 당일/다음 날 (숫자 입력 접힘) — 폴백용 */
export const CATALOG_SPINE_TIME_PANEL_COLLAPSED_HEIGHT = 128;
/** 위 + 오전/오후·시·분 입력 — 폴백용 (실측 onLayout 우선) */
export const CATALOG_SPINE_TIME_PANEL_EXPANDED_HEIGHT = 300;

type Props = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
  /** 시작 기준 달력일(YYYY-MM-DD). 없으면 오늘 */
  baseDateKey?: string;
  startDateLabel?: string;
  endDateLabelToday?: string;
  endDateLabelNextDay?: string;
  ink: string;
  muted: string;
  line: string;
  isDark: boolean;
  disabled?: boolean;
  priorityStart: string;
  priorityEnd: string;
  onScheduleChange: (
    startMinutes: number,
    endMinutes: number,
    endsNextCalendarDay: boolean,
  ) => void;
  onPickerExpandedChange?: (expanded: boolean) => void;
  contentInsetLeft?: number;
};

/** 루틴 목록 행 — 펼침 시 시작·종료 시각 선택(숫자 입력) */
export function CatalogRowSpineTimePanel({
  startMinutes,
  endMinutes,
  endsNextCalendarDay = false,
  baseDateKey,
  startDateLabel,
  endDateLabelToday,
  endDateLabelNextDay,
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
  const [draftEndsNext, setDraftEndsNext] = useState(endsNextCalendarDay);
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (expanded !== null) return;
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
    setDraftEndsNext(endsNextCalendarDay);
  }, [expanded, startMinutes, endMinutes, endsNextCalendarDay]);

  useEffect(() => {
    onPickerExpandedChange?.(expanded !== null);
  }, [expanded, onPickerExpandedChange]);

  const applyRoutineWindow = useMemo(() => {
    const rs = priorityStart.trim();
    const re = priorityEnd.trim();
    if (!rs || !re || parseHHmmToMinutes(rs) === null || parseHHmmToMinutes(re) === null) {
      return (hhmm: string) => hhmm;
    }
    /** 입력 중에는 1분 단위로만 클램프 — 5분 스냅은 DigitalHhmmInput blur에서 처리 */
    return (hhmm: string) => clampHhmmToPriorityWindow(hhmm, rs, re, 1);
  }, [priorityEnd, priorityStart]);

  const commitDraft = useCallback(
    (startHhmm: string, endHhmm: string, endsNext: boolean) => {
      const start = parseHHmmToMinutes(startHhmm);
      let end = parseHHmmToMinutes(endHhmm);
      if (start === null || end === null) return;
      if (!endsNext && end <= start) end = Math.min(24 * 60, start + 15);
      onScheduleChange(start, end, endsNext);
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
    setDraftEndsNext(endsNextCalendarDay);
  }, [endMinutes, endsNextCalendarDay, startMinutes]);

  const handleConfirm = useCallback(() => {
    if (disabled) return;
    commitDraft(draftStart, draftEnd, draftEndsNext);
    setExpanded(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [commitDraft, disabled, draftEnd, draftEndsNext, draftStart]);

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

  const committedStart = formatMinutesToHHmm(startMinutes);
  const committedEnd = formatMinutesToHHmm(endMinutes);
  const displayStart = expanded !== null ? draftStart : committedStart;
  const displayEnd = expanded !== null ? draftEnd : committedEnd;

  const resolvedDateLabels = useMemo(() => {
    const key =
      typeof baseDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDateKey.trim())
        ? baseDateKey.trim()
        : getLocalDateKey();
    const start = startDateLabel?.trim() || formatDateKeyCompactKo(key);
    const today = endDateLabelToday?.trim() || start;
    const next =
      endDateLabelNextDay?.trim() || formatDateKeyCompactKo(addDaysToLocalDateKey(key, 1));
    return { start, today, next };
  }, [baseDateKey, endDateLabelNextDay, endDateLabelToday, startDateLabel]);

  const renderSegment = (field: 'start' | 'end', label: string, valueHhmm: string) => {
    const selected = activeField === field;
    const dateLabel =
      field === 'start'
        ? resolvedDateLabels.start
        : draftEndsNext
          ? resolvedDateLabels.next
          : resolvedDateLabels.today;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${label} ${formatHhmmClockKo(valueHhmm)} ${dateLabel}`}
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
        <ThemedText
          style={[styles.segmentDate, { color: selected ? selectedFg : muted }]}
          numberOfLines={1}>
          {dateLabel}
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

  const renderEndDateChoice = () => (
    <View style={styles.endDateChoiceRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="종료 시간을 당일로 설정"
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          void Haptics.selectionAsync();
          setDraftEndsNext(false);
          commitDraft(draftStart, draftEnd, false);
        }}
        style={({ pressed }) => [
          styles.endDateChoiceBtn,
          {
            backgroundColor: !draftEndsNext ? ink : trackBg,
            borderColor: line,
            opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          },
        ]}>
        <ThemedText style={[styles.endDateChoiceText, { color: !draftEndsNext ? selectedFg : ink }]}>
          당일
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="종료 시간을 다음 날로 설정"
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          void Haptics.selectionAsync();
          setDraftEndsNext(true);
          commitDraft(draftStart, draftEnd, true);
        }}
        style={({ pressed }) => [
          styles.endDateChoiceBtn,
          {
            backgroundColor: draftEndsNext ? ink : trackBg,
            borderColor: line,
            opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          },
        ]}>
        <ThemedText style={[styles.endDateChoiceText, { color: draftEndsNext ? selectedFg : ink }]}>
          다음 날
        </ThemedText>
      </Pressable>
    </View>
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
      {renderEndDateChoice()}
      {activeField ? (
        <DigitalHhmmInput
          valueHhmm={activeField === 'end' ? draftEnd : draftStart}
          onChangeHhmm={activeField === 'end' ? updateDraftEnd : updateDraftStart}
          ink={ink}
          muted={muted}
          line={line}
          surface={trackBg}
          selectedForeground={selectedFg}
          disabled={disabled}
          snapStepMinutes={5}
          accessibilityLabelPrefix={activeField === 'end' ? '종료' : '시작'}
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
  segmentDate: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  endDateChoiceRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  endDateChoiceBtn: {
    flex: 1,
    minHeight: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  endDateChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
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
