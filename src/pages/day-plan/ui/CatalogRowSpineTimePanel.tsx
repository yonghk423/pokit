import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  addDaysToLocalDateKey,
  formatHhmmClockKo,
  formatMinutesToHHmm,
  getLocalDateKey,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
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
  onScheduleChange: (
    startMinutes: number,
    endMinutes: number,
    endsNextCalendarDay: boolean,
  ) => void;
  onPickerExpandedChange?: (expanded: boolean) => void;
  /** 키패드가 필드를 가리지 않도록 부모 ScrollView 스크롤 요청 */
  onRequestScrollIntoView?: () => void;
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
  onScheduleChange,
  onPickerExpandedChange,
  onRequestScrollIntoView,
  contentInsetLeft = 34,
}: Props) {
  const [draftStart, setDraftStart] = useState(() => formatMinutesToHHmm(startMinutes));
  const [draftEnd, setDraftEnd] = useState(() => formatMinutesToHHmm(endMinutes));
  const [draftEndsNext, setDraftEndsNext] = useState(endsNextCalendarDay);
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const digitalInputRef = useRef<DigitalHhmmInputHandle>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    if (expanded !== null) return;
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
    setDraftEndsNext(endsNextCalendarDay);
    setRangeError(null);
  }, [expanded, startMinutes, endMinutes, endsNextCalendarDay]);

  useEffect(() => {
    onPickerExpandedChange?.(expanded !== null);
  }, [expanded, onPickerExpandedChange]);

  /** 키패드가 올라오면 부모에 스크롤만 요청 — UI 높이는 늘리지 않음 */
  useEffect(() => {
    if (expanded === null || !onRequestScrollIntoView) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => onRequestScrollIntoView());
    });
    return () => showSub.remove();
  }, [expanded, onRequestScrollIntoView]);

  const commitDraft = useCallback(
    (startHhmm: string, endHhmm: string, endsNext: boolean): boolean => {
      const start = parseHHmmToMinutes(startHhmm);
      const end = parseHHmmToMinutes(endHhmm);
      if (start === null || end === null) return false;
      if (!endsNext && end <= start) return false;
      onScheduleChange(start, end, endsNext);
      return true;
    },
    [onScheduleChange],
  );

  const resetDraftFromProps = useCallback(() => {
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
    setDraftEndsNext(endsNextCalendarDay);
    setRangeError(null);
  }, [endMinutes, endsNextCalendarDay, startMinutes]);

  /** 현재 편집 필드의 DigitalHhmmInput 초안을 draftStart/End에 반영 */
  const flushActiveFieldToDrafts = useCallback((): {
    start: string;
    end: string;
  } => {
    const field = expandedRef.current;
    const flushed = digitalInputRef.current?.flush();
    let start = draftStart;
    let end = draftEnd;
    if (flushed && field === 'start') {
      start = flushed;
      setDraftStart(flushed);
    } else if (flushed && field === 'end') {
      end = flushed;
      setDraftEnd(flushed);
    }
    return { start, end };
  }, [draftEnd, draftStart]);

  const handleConfirm = useCallback(() => {
    if (disabled) return;
    Keyboard.dismiss();
    const { start, end } = flushActiveFieldToDrafts();
    if (!commitDraft(start, end, draftEndsNext)) {
      setRangeError('당일 종료 시각은 시작 시각보다 늦어야 해요. 다음 날을 선택하거나 시각을 바꿔 주세요.');
      return;
    }
    setRangeError(null);
    setExpanded(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    commitDraft,
    disabled,
    draftEndsNext,
    flushActiveFieldToDrafts,
  ]);

  const toggleExpand = useCallback(
    (field: 'start' | 'end') => {
      if (disabled) return;
      void Haptics.selectionAsync();
      const cur = expandedRef.current;
      if (cur === field) {
        // 같은 필드 다시 탭 → 접기 (미확정 초안 폐기)
        Keyboard.dismiss();
        resetDraftFromProps();
        setExpanded(null);
        return;
      }
      if (cur !== null) {
        // 시작 ↔ 종료 전환: 현재 필드 초안 보존 후 전환
        flushActiveFieldToDrafts();
      } else {
        resetDraftFromProps();
      }
      setExpanded(field);
    },
    [disabled, flushActiveFieldToDrafts, resetDraftFromProps],
  );

  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const activeField = expanded;

  const committedStart = formatMinutesToHHmm(startMinutes);
  const committedEnd = formatMinutesToHHmm(endMinutes);
  const displayStart = expanded !== null ? draftStart : committedStart;
  const displayEnd = expanded !== null ? draftEnd : committedEnd;
  const isDateChoiceDirty = draftEndsNext !== endsNextCalendarDay;

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
        {
          backgroundColor: ink,
          borderColor: line,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
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
          flushActiveFieldToDrafts();
          setDraftEndsNext(false);
          setRangeError(null);
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
          flushActiveFieldToDrafts();
          setDraftEndsNext(true);
          setRangeError(null);
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
        {activeField || isDateChoiceDirty ? (
          <>
            <View style={[styles.segmentDivider, { backgroundColor: line }]} />
            {renderConfirmSegment()}
          </>
        ) : null}
      </View>
      {renderEndDateChoice()}
      {rangeError ? (
        <ThemedText style={[styles.rangeError, { color: muted }]}>{rangeError}</ThemedText>
      ) : null}
      {activeField ? (
        <DigitalHhmmInput
          key={activeField}
          ref={digitalInputRef}
          valueHhmm={activeField === 'end' ? draftEnd : draftStart}
          onChangeHhmm={activeField === 'end' ? setDraftEnd : setDraftStart}
          ink={ink}
          muted={muted}
          line={line}
          surface={trackBg}
          selectedForeground={selectedFg}
          disabled={disabled}
          snapStepMinutes={1}
          accessibilityLabelPrefix={activeField === 'end' ? '종료' : '시작'}
          onInputFocus={onRequestScrollIntoView}
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
  rangeError: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: -0.15,
  },
  confirmSegment: {
    width: 48,
    flexShrink: 0,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderLeftWidth: 2,
  },
  confirmSegmentLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
