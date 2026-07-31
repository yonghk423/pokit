import * as Haptics from 'expo-haptics';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clampHhmmToPriorityWindow, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
import { ThemedText } from '@shared/ui/themed-text';

import { TIME_SNAP_MINUTES } from '../lib/snappedPickerMath';

const PRIMARY = 'rgb(0, 0, 0)';

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
  /** 오전 12:00 → `24:00`(하루 끝). 밤 구간 등 */
  mapMidnightToEndOfDay?: boolean;
  /** 시각 pill 왼쪽에 표시할 날짜(예: 5월 21일) */
  dateCaption?: string;
  /** 온보딩 등 — 라벨·시각 pill을 조금 키움 */
  emphasized?: boolean;
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
  mapMidnightToEndOfDay = false,
  dateCaption,
  emphasized = false,
}: SnappedTimePickerFieldProps) {
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
    /** 입력 중 스냅 간섭 방지 — 최종 스냅은 DigitalHhmmInput blur */
    return (hhmm: string) => clampHhmmToPriorityWindow(hhmm, rs, re, 1);
  }, [routineDayStartHhmm, routineDayEndHhmm]);

  const digitalInputRef = useRef<DigitalHhmmInputHandle>(null);
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';

  return (
    <View>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [
          styles.timeRow,
          emphasized && styles.timeRowEmphasized,
          pressed && { opacity: 0.9 },
        ]}>
        <View style={styles.timeRowLeft}>
          <ThemedText
            style={[
              styles.timeRowLabel,
              emphasized && styles.timeRowLabelEmphasized,
              { color: palette.onSurface },
            ]}
            lightColor={palette.onSurface}
            darkColor={palette.onSurface}>
            {label}
          </ThemedText>
          <ThemedText
            style={[
              styles.timeRowHint,
              emphasized && styles.timeRowHintEmphasized,
              { color: palette.onVariant },
            ]}
            lightColor={palette.onVariant}
            darkColor={palette.onVariant}>
            {hint}
          </ThemedText>
        </View>
        <View style={styles.timeRowRight}>
          {dateCaption ? (
            <ThemedText
              style={[
                styles.timeDateAside,
                emphasized && styles.timeDateAsideEmphasized,
                { color: palette.onVariant },
              ]}
              lightColor={palette.onVariant}
              darkColor={palette.onVariant}
              numberOfLines={1}>
              {dateCaption}
            </ThemedText>
          ) : null}
          <View
            style={[
              styles.timePill,
              emphasized && styles.timePillEmphasized,
              {
                backgroundColor: palette.containerLowest,
                borderColor: expanded ? PRIMARY : palette.border,
              },
            ]}>
            <ThemedText
              style={[
                styles.timePillText,
                emphasized && styles.timePillTextEmphasized,
                { color: palette.onSurface },
              ]}
              lightColor={palette.onSurface}
              darkColor={palette.onSurface}>
              {formatHhmmClockKo(valueHhmm)}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.inputBlock}>
          <DigitalHhmmInput
            ref={digitalInputRef}
            valueHhmm={valueHhmm}
            onChangeHhmm={onChangeHhmm}
            ink={palette.onSurface}
            muted={palette.onVariant}
            line={palette.border}
            surface={palette.containerLowest}
            selectedForeground={selectedFg}
            snapStepMinutes={snapStepMinutes}
            mapMidnightToEndOfDay={mapMidnightToEndOfDay}
            accessibilityLabelPrefix={label}
          />
          <Pressable
            onPress={() => {
              const flushed = digitalInputRef.current?.flush();
              if (flushed) onChangeHhmm(applyRoutineWindow(flushed));
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
  timeRowEmphasized: {
    minHeight: 56,
    paddingVertical: 4,
  },
  timeRowLeft: { flex: 1, gap: 2, minWidth: 0 },
  timeRowLabel: { fontSize: 14, fontWeight: '700' },
  timeRowLabelEmphasized: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  timeRowHint: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  timeRowHintEmphasized: { fontSize: 12, lineHeight: 16 },
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
  timeDateAsideEmphasized: {
    fontSize: 13,
    fontWeight: '700',
  },
  timePill: {
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
  },
  timePillEmphasized: {
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timePillText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  timePillTextEmphasized: { fontSize: 18, letterSpacing: -0.35 },
  inputBlock: {
    paddingTop: 6,
    gap: 4,
  },
  confirmBtn: {
    alignSelf: 'flex-end',
    minWidth: 68,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 0,
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
