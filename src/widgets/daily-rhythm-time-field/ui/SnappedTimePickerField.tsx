import * as Haptics from 'expo-haptics';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clampHhmmToPriorityWindow, parseHHmmToMinutes } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { formatHhmmClock, useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import {
  DigitalHhmmInput,
  type DigitalHhmmInputHandle,
} from '@shared/ui/digital-hhmm-input';
import { ThemedText } from '@shared/ui/themed-text';

import { TIME_SNAP_MINUTES } from '../lib/snappedPickerMath';

export type SnappedTimePickerFieldPalette = {
  onSurface: string;
  onVariant: string;
  border: string;
  containerLowest: string;
};

export type SnappedTimePickerFieldHandle = {
  flush: () => string | null;
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
  /** 목표 상세 슬롯 등 — 라벨·시각 pill을 작게 */
  compact?: boolean;
  disabled?: boolean;
};

export const SnappedTimePickerField = forwardRef<
  SnappedTimePickerFieldHandle,
  SnappedTimePickerFieldProps
>(function SnappedTimePickerField(
  {
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
    compact = false,
    disabled = false,
  },
  ref,
) {
  const { t, locale } = useTranslation();
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
  useImperativeHandle(
    ref,
    () => ({
      flush: () => {
        const flushed = digitalInputRef.current?.flush();
        if (!flushed) return null;
        const next = applyRoutineWindow(flushed);
        onChangeHhmm(next);
        return next;
      },
    }),
    [applyRoutineWindow, onChangeHhmm],
  );
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';
  const shadowInk = isDark ? RetroFlatColors.dark.solidShadow : '#000000';
  const pillShadow = expanded ? 0 : 2;

  return (
    <View>
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [
          styles.timeRow,
          emphasized && styles.timeRowEmphasized,
          compact && styles.timeRowCompact,
          pressed && !disabled && { opacity: 0.9 },
          disabled && { opacity: 0.45 },
        ]}>
        <View style={[styles.timeRowLeft, compact && styles.timeRowLeftCompact]}>
          <ThemedText
            style={[
              styles.timeRowLabel,
              emphasized && styles.timeRowLabelEmphasized,
              compact && styles.timeRowLabelCompact,
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
              compact && styles.timeRowHintCompact,
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
                compact && styles.timeDateAsideCompact,
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
              styles.timePillShell,
              pillShadow > 0 && { marginRight: pillShadow, marginBottom: pillShadow },
            ]}>
            {pillShadow > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  styles.timePillShadow,
                  {
                    backgroundColor: shadowInk,
                    transform: [{ translateX: pillShadow }, { translateY: pillShadow }],
                  },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.timePill,
                emphasized && styles.timePillEmphasized,
                compact && styles.timePillCompact,
                { backgroundColor: palette.containerLowest },
              ]}>
              <ThemedText
                style={[
                  styles.timePillText,
                  emphasized && styles.timePillTextEmphasized,
                  compact && styles.timePillTextCompact,
                  { color: palette.onSurface },
                ]}
                lightColor={palette.onSurface}
                darkColor={palette.onSurface}>
                {formatHhmmClock(valueHhmm, locale)}
              </ThemedText>
            </View>
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
            disabled={disabled}
          />
          <BrutalConfirmButton
            accessibilityLabel={t('dayPlan.timeConfirmA11y', { label })}
            disabled={disabled}
            onPress={() => {
              const flushed = digitalInputRef.current?.flush();
              if (flushed) onChangeHhmm(applyRoutineWindow(flushed));
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
          />
        </View>
      ) : null}
    </View>
  );
});

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
  timeRowCompact: {
    gap: 8,
  },
  timeRowLeft: { flex: 1, gap: 2, minWidth: 0 },
  timeRowLeftCompact: { gap: 1 },
  timeRowLabel: { fontSize: 14, fontWeight: '700' },
  timeRowLabelEmphasized: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  timeRowLabelCompact: { fontSize: 13, fontWeight: '700' },
  timeRowHint: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  timeRowHintEmphasized: { fontSize: 12, lineHeight: 16 },
  timeRowHintCompact: { fontSize: 10, lineHeight: 13 },
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
  timeDateAsideCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  timePillShell: {
    position: 'relative',
  },
  timePillShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  timePill: {
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  timePillEmphasized: {
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timePillCompact: {
    minWidth: 86,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  timePillText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  timePillTextEmphasized: { fontSize: 18, letterSpacing: -0.35 },
  timePillTextCompact: { fontSize: 13, letterSpacing: -0.2 },
  inputBlock: {
    paddingTop: 6,
    gap: 8,
  },
});
