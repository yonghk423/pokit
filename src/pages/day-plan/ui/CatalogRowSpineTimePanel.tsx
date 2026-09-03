import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  addDaysToLocalDateKey,
  formatMinutesToHHmm,
  getLocalDateKey,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import {
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import {
  formatDateKeyCompact,
  formatHhmmClock,
  useTranslation,
} from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
import { ThemedText } from '@shared/ui/themed-text';

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
  /** inline: 목록 행 · sheet: 일정 수정 시트 등 넓은 패널 */
  presentation?: 'inline' | 'sheet';
  /** 호출부 호환용 — 범위 검증은 저장 시트/상위 화면에서 수행 */
  priorityStart?: string;
  /** 호출부 호환용 — 범위 검증은 저장 시트/상위 화면에서 수행 */
  priorityEnd?: string;
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
  /** note: 카드·브루탈 섀도우 없이 텍스트 중심 */
  visualStyle?: 'default' | 'note';
  /** 시작 필드 라벨 (기본: 시작) */
  startFieldLabel?: string;
  /** 종료 필드 라벨 (기본: 종료) */
  endFieldLabel?: string;
  /** 시트 확인 버튼 라벨 (기본: 시간 적용) */
  confirmLabel?: string;
  /** 시트 확인 버튼 a11y (기본: applyTimeA11y) */
  confirmA11yLabel?: string;
  /** sheet 확인 CTA 표시. note 시트는 기본 항상 표시, default는 dirty일 때만 */
  showSheetConfirm?: boolean;
};

export type CatalogRowSpineTimePanelHandle = {
  /** 열린 숫자 입력 초안까지 확정하고 저장에 사용할 최종 일정을 반환 */
  commitPendingSchedule: () => {
    startMinutes: number;
    endMinutes: number;
    endsNextCalendarDay: boolean;
  } | null;
};

function SolidShadowFace({
  borderColor,
  shadowColor,
  backgroundColor,
  shadowSize = SOLID_SHADOW_OFFSET,
  shellStyle,
  faceStyle,
  children,
}: {
  borderColor: string;
  shadowColor: string;
  backgroundColor: string;
  shadowSize?: number;
  shellStyle?: object;
  faceStyle?: object;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.shadowShell,
        { marginRight: shadowSize, marginBottom: shadowSize },
        shellStyle,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadowBlock,
          {
            backgroundColor: shadowColor,
            borderColor,
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      <View
        style={[
          styles.shadowFace,
          { backgroundColor, borderColor },
          faceStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

/** 루틴 목록 행 — 펼침 시 시작·종료 시각 선택(숫자 입력) */
export const CatalogRowSpineTimePanel = forwardRef<CatalogRowSpineTimePanelHandle, Props>(
  function CatalogRowSpineTimePanel(
    {
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
      presentation = 'inline',
      disabled = false,
      onScheduleChange,
      onPickerExpandedChange,
      onRequestScrollIntoView,
      contentInsetLeft = 34,
      visualStyle = 'default',
      startFieldLabel,
      endFieldLabel,
      confirmLabel,
      confirmA11yLabel,
      showSheetConfirm,
    },
    ref,
  ) {
  const { t, locale } = useTranslation();
  const isSheet = presentation === 'sheet';
  const isNote = visualStyle === 'note';
  const resolvedStartLabel = startFieldLabel?.trim() || t('goalDetail.study.start');
  const resolvedEndLabel = endFieldLabel?.trim() || t('goalDetail.study.end');
  const resolvedConfirmLabel = confirmLabel?.trim() || t('dayPlan.applyTimeLabel');
  const resolvedConfirmA11y = confirmA11yLabel?.trim() || t('dayPlan.applyTimeA11y');
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : '#000000';
  const panelSurface = isDark ? tone.surfaceAlt : '#FFFFFF';
  const shadowSize = isSheet ? 4 : 2;

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
      setRangeError(t('dayPlan.spineEndAfterStartError'));
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

  useImperativeHandle(
    ref,
    () => ({
      commitPendingSchedule: () => {
        if (disabled) return null;
        if (expandedRef.current === null && draftEndsNext === endsNextCalendarDay) {
          return { startMinutes, endMinutes, endsNextCalendarDay };
        }

        Keyboard.dismiss();
        const { start, end } = flushActiveFieldToDrafts();
        const parsedStart = parseHHmmToMinutes(start);
        const parsedEnd = parseHHmmToMinutes(end);
        if (
          parsedStart === null ||
          parsedEnd === null ||
          (!draftEndsNext && parsedEnd <= parsedStart)
        ) {
          setRangeError(t('dayPlan.spineEndAfterStartError'));
          return null;
        }

        setRangeError(null);
        setExpanded(null);
        return {
          startMinutes: parsedStart,
          endMinutes: parsedEnd,
          endsNextCalendarDay: draftEndsNext,
        };
      },
    }),
    [
      disabled,
      draftEndsNext,
      endMinutes,
      endsNextCalendarDay,
      flushActiveFieldToDrafts,
      startMinutes,
    ],
  );

  const toggleExpand = useCallback(
    (field: 'start' | 'end') => {
      if (disabled) return;
      void Haptics.selectionAsync();
      const cur = expandedRef.current;
      if (cur === field) {
        Keyboard.dismiss();
        resetDraftFromProps();
        setExpanded(null);
        return;
      }
      if (cur !== null) {
        flushActiveFieldToDrafts();
      } else {
        resetDraftFromProps();
      }
      setExpanded(field);
    },
    [disabled, flushActiveFieldToDrafts, resetDraftFromProps],
  );

  const activeField = expanded;
  const committedStart = formatMinutesToHHmm(startMinutes);
  const committedEnd = formatMinutesToHHmm(endMinutes);
  const displayStart = expanded !== null ? draftStart : committedStart;
  const displayEnd = expanded !== null ? draftEnd : committedEnd;
  const isDateChoiceDirty = draftEndsNext !== endsNextCalendarDay;
  const showConfirm = Boolean(activeField || isDateChoiceDirty);
  const sheetConfirmVisible =
    showSheetConfirm !== undefined
      ? showSheetConfirm
      : isNote
        ? true
        : showConfirm;

  const resolvedDateLabels = useMemo(() => {
    const key =
      typeof baseDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDateKey.trim())
        ? baseDateKey.trim()
        : getLocalDateKey();
    const start = startDateLabel?.trim() || formatDateKeyCompact(key, locale);
    const today = endDateLabelToday?.trim() || start;
    const next =
      endDateLabelNextDay?.trim() || formatDateKeyCompact(addDaysToLocalDateKey(key, 1), locale);
    return { start, today, next };
  }, [baseDateKey, endDateLabelNextDay, endDateLabelToday, locale, startDateLabel]);

  const renderSegment = (field: 'start' | 'end', label: string, valueHhmm: string) => {
    const selected = activeField === field;
    const dateLabel =
      field === 'start'
        ? resolvedDateLabels.start
        : draftEndsNext
          ? resolvedDateLabels.next
          : resolvedDateLabels.today;
    const selectedText = isDark ? tone.text : tone.tertiary;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${label} ${formatHhmmClock(valueHhmm, locale)} ${dateLabel}`}
        disabled={disabled}
        onPress={() => toggleExpand(field)}
        style={({ pressed }) => [
          styles.segment,
          isSheet && styles.segmentSheet,
          isNote && styles.segmentNote,
          isSheet && isNote && styles.segmentNoteSheet,
          selected && !isNote && { backgroundColor: tone.bgMint },
          selected && isNote && styles.segmentNoteSelected,
          !selected && pressed && { opacity: 0.88 },
          disabled && { opacity: 0.45 },
        ]}>
        <ThemedText
          style={[
            styles.segmentLabel,
            isSheet && styles.segmentLabelSheet,
            { color: selected ? selectedText : muted },
            selected && isNote && { color: ink },
            cityPopFont('700'),
          ]}
          numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText
          style={[
            styles.segmentTime,
            isSheet && styles.segmentTimeSheet,
            isNote && styles.segmentTimeNote,
            isSheet && isNote && styles.segmentTimeNoteSheet,
            { color: selected ? selectedText : ink },
            isNote && { color: ink, borderBottomColor: ink },
            selected && isNote && { borderBottomColor: ink },
            cityPopFont('800'),
          ]}
          numberOfLines={1}>
          {formatHhmmClock(valueHhmm, locale)}
        </ThemedText>
        <ThemedText
          style={[
            styles.segmentDate,
            isSheet && styles.segmentDateSheet,
            { color: selected ? selectedText : muted },
            selected && isNote && { color: muted },
            cityPopFont('600'),
          ]}
          numberOfLines={1}>
          {dateLabel}
        </ThemedText>
      </Pressable>
    );
  };

  const renderInlineConfirmSegment = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedConfirmA11y}
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
      <ThemedText style={[styles.confirmSegmentLabel, { color: isDark ? '#09090b' : '#FAFAFA' }]}>
        {t('common.confirm')}
      </ThemedText>
    </Pressable>
  );

  const renderDayChoice = (nextDay: boolean, label: string) => {
    const selected = draftEndsNext === nextDay;
    const selectedText = isDark ? tone.text : tone.tertiary;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextDay ? t('dayRhythm.setNextDayA11y') : t('dayRhythm.setTodayA11y')}
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          void Haptics.selectionAsync();
          flushActiveFieldToDrafts();
          setDraftEndsNext(nextDay);
          setRangeError(null);
        }}
        style={({ pressed }) => [styles.dayChoicePress, pressed && { opacity: 0.92 }]}>
        {isNote ? (
          <View style={[styles.dayChoiceFace, isSheet && styles.dayChoiceFaceSheet, styles.dayChoiceFaceNote]}>
            <ThemedText
              style={[
                styles.dayChoiceText,
                isSheet && styles.dayChoiceTextSheet,
                styles.dayChoiceTextNote,
                { color: selected ? ink : muted },
                selected && styles.dayChoiceTextNoteOn,
                cityPopFont(selected ? '700' : '600'),
              ]}>
              {label}
            </ThemedText>
          </View>
        ) : (
          <SolidShadowFace
            borderColor={line}
            shadowColor={shadowInk}
            backgroundColor={selected ? tone.bgMint : panelSurface}
            shadowSize={selected ? shadowSize : Math.max(2, shadowSize - 2)}
            shellStyle={styles.dayChoiceShell}
            faceStyle={[styles.dayChoiceFace, isSheet && styles.dayChoiceFaceSheet]}>
            <ThemedText
              style={[
                styles.dayChoiceText,
                isSheet && styles.dayChoiceTextSheet,
                { color: selected ? selectedText : muted },
                cityPopFont('800'),
              ]}>
              {label}
            </ThemedText>
          </SolidShadowFace>
        )}
      </Pressable>
    );
  };

  const trackInner = (
    <View style={[styles.trackInner, isNote && styles.trackInnerNote]}>
      {renderSegment('start', resolvedStartLabel, displayStart)}
      <View
        style={[
          styles.segmentDivider,
          isNote
            ? [styles.segmentDividerNote, { backgroundColor: line }]
            : { backgroundColor: line },
        ]}
      />
      {renderSegment('end', resolvedEndLabel, displayEnd)}
      {!isSheet && showConfirm ? (
        <>
          <View
            style={[
              styles.segmentDivider,
              isNote
                ? [styles.segmentDividerNote, { backgroundColor: line }]
                : { backgroundColor: line },
            ]}
          />
          {renderInlineConfirmSegment()}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, isNote && styles.rootNote, { paddingLeft: contentInsetLeft }]}>
      {isNote ? (
        <View style={[styles.trackNote, { borderColor: line }]}>{trackInner}</View>
      ) : (
        <SolidShadowFace
          borderColor={line}
          shadowColor={shadowInk}
          backgroundColor={panelSurface}
          shadowSize={shadowSize}
          shellStyle={styles.trackShell}
          faceStyle={styles.trackFace}>
          {trackInner}
        </SolidShadowFace>
      )}

      <View
        style={[
          styles.endDateChoiceRow,
          isSheet && styles.endDateChoiceRowSheet,
          isNote && styles.endDateChoiceRowNote,
          isNote && { borderTopColor: line },
        ]}>
        {renderDayChoice(false, t('dayRhythm.today'))}
        {renderDayChoice(true, t('dayRhythm.nextDay'))}
      </View>

      {isSheet && sheetConfirmVisible ? (
        isNote ? (
          <View style={styles.sheetConfirmNoteRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={resolvedConfirmA11y}
              disabled={disabled}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.sheetConfirmNoteHit,
                disabled && { opacity: 0.35 },
                pressed && { opacity: 0.55 },
              ]}>
              <ThemedText
                style={[
                  styles.sheetConfirmNoteText,
                  { color: ink, borderBottomColor: ink },
                  cityPopFont('700'),
                ]}>
                {resolvedConfirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <BrutalConfirmButton
            label={resolvedConfirmLabel}
            accessibilityLabel={resolvedConfirmA11y}
            align="stretch"
            fill={ink}
            labelColor={isDark ? '#09090b' : '#FAFAFA'}
            border={line}
            shadowColor={shadowInk}
            disabled={disabled}
            onPress={handleConfirm}
            style={styles.sheetConfirmBtn}
          />
        )
      ) : null}

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
          surface={isNote ? 'transparent' : panelSurface}
          selectedForeground={isDark ? '#09090b' : '#FAFAFA'}
          disabled={disabled}
          snapStepMinutes={1}
          accessibilityLabelPrefix={activeField === 'end' ? resolvedEndLabel : resolvedStartLabel}
          onInputFocus={onRequestScrollIntoView}
        />
      ) : null}
    </View>
  );
  },
);

const styles = StyleSheet.create({
  root: {
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 14,
  },
  shadowShell: {
    position: 'relative',
  },
  shadowBlock: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  shadowFace: {
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
  },
  trackShell: {
    alignSelf: 'stretch',
  },
  trackFace: {
    overflow: 'hidden',
  },
  trackInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  segmentSheet: {
    minHeight: 72,
    paddingVertical: 12,
    gap: 4,
  },
  segmentDivider: {
    width: RETRO_BORDER_WIDTH,
    alignSelf: 'stretch',
  },
  segmentLabel: {
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  segmentLabelSheet: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  segmentTime: {
    fontSize: 12,
    letterSpacing: -0.25,
  },
  segmentTimeSheet: {
    fontSize: 17,
    letterSpacing: -0.35,
  },
  segmentDate: {
    marginTop: 1,
    fontSize: 10,
    letterSpacing: -0.1,
  },
  segmentDateSheet: {
    fontSize: 12,
  },
  endDateChoiceRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  endDateChoiceRowSheet: {
    marginTop: 14,
    gap: 12,
  },
  dayChoicePress: {
    flex: 1,
  },
  dayChoiceShell: {
    alignSelf: 'stretch',
    width: '100%',
  },
  dayChoiceFace: {
    minHeight: 40,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChoiceFaceSheet: {
    minHeight: 52,
    paddingHorizontal: 10,
  },
  dayChoiceText: {
    fontSize: 12,
    textAlign: 'center',
  },
  dayChoiceTextSheet: {
    fontSize: 14,
  },
  sheetConfirmBtn: {
    marginTop: 12,
  },
  rangeError: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.15,
  },
  confirmSegment: {
    width: 52,
    flexShrink: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderLeftWidth: RETRO_BORDER_WIDTH,
  },
  confirmSegmentLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rootNote: {
    paddingRight: 0,
    paddingBottom: 4,
  },
  trackNote: {
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  trackInnerNote: {
    gap: 0,
  },
  segmentNote: {
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 0,
    flex: 1,
  },
  segmentNoteSheet: {
    minHeight: 0,
    paddingVertical: 10,
    gap: 4,
  },
  segmentNoteSelected: {
    opacity: 1,
  },
  segmentTimeNote: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 2,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  segmentTimeNoteSheet: {
    fontSize: 15,
    letterSpacing: -0.3,
  },
  segmentDividerNote: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  endDateChoiceRowNote: {
    marginTop: 0,
    paddingTop: 12,
    gap: 20,
    justifyContent: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dayChoiceFaceNote: {
    minHeight: 0,
    paddingHorizontal: 0,
    alignItems: 'flex-start',
  },
  dayChoiceTextNote: {
    fontSize: 13,
  },
  dayChoiceTextNoteOn: {
    textDecorationLine: 'underline',
  },
  sheetConfirmNoteRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  sheetConfirmNoteHit: {
    paddingVertical: 4,
    paddingLeft: 12,
  },
  sheetConfirmNoteText: {
    fontSize: 13,
    letterSpacing: -0.15,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 1,
  },
});
