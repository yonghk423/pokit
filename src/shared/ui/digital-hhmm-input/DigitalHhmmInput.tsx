import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';

export type DigitalHhmmInputProps = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  ink: string;
  muted: string;
  line: string;
  surface?: string;
  /** 오전/오후 선택 시 글자색 (기본: 밝은 전경) */
  selectedForeground?: string;
  disabled?: boolean;
  /** 분 증감 간격. 기본 1분 */
  snapStepMinutes?: number;
  /**
   * 오전 12:00을 `00:00` 대신 `24:00`(하루 끝)으로 저장.
   * 밤 구간·하루 마무리처럼 자정을 끝 시각으로 쓸 때.
   */
  mapMidnightToEndOfDay?: boolean;
  /** 접근성 라벨 접두 (예: 시작, 종료) */
  accessibilityLabelPrefix?: string;
  /** 레거시 호환용(키패드 제거로 현재 미사용) */
  onInputFocus?: () => void;
};

/** 키보드가 열린 채 확인을 누를 때 등 — blur 없이 현재 초안을 확정 */
export type DigitalHhmmInputHandle = {
  flush: () => string;
};

type Meridiem = 'am' | 'pm';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseHhmm(raw: string): { total: number } | null {
  const t = raw.trim();
  if (t === '24:00') return { total: 24 * 60 };
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { total: h * 60 + min };
}

function formatHhmm(total: number): string {
  if (total >= 24 * 60) return '24:00';
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${pad2(Math.floor(safe / 60))}:${pad2(safe % 60)}`;
}

function h24To12(h24: number): { ap: Meridiem; h12: number } {
  if (h24 === 24) return { ap: 'am', h12: 12 };
  const ap: Meridiem = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { ap, h12 };
}

function draftsFromValue(valueHhmm: string): { hour: string; min: string; ap: Meridiem } {
  const parsed = parseHhmm(valueHhmm);
  /** `24:00`은 편집 시 오전 12:00으로 취급(하루 끝 표기는 상위에서) */
  const total = parsed?.total === 24 * 60 ? 0 : (parsed?.total ?? 9 * 60);
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const { ap, h12 } = h24To12(h24);
  return { hour: pad2(h12), min: pad2(min), ap };
}

function normalizeTotal(total: number): number {
  const m = Math.round(total);
  if (!Number.isFinite(m)) return 9 * 60;
  if (m >= 24 * 60) return 24 * 60;
  if (m < 0) {
    const cycle = ((m % (24 * 60)) + (24 * 60)) % (24 * 60);
    return cycle;
  }
  return m;
}

function hourMinuteFromTotal(total: number): { hour24: number; min: number } {
  if (total >= 24 * 60) return { hour24: 0, min: 0 };
  const safe = Math.max(0, Math.min(23 * 60 + 59, total));
  return { hour24: Math.floor(safe / 60), min: safe % 60 };
}

function composeFromParts(
  hour24: number,
  min: number,
  mapMidnightToEndOfDay: boolean,
): string {
  const h = Math.max(0, Math.min(23, Math.round(hour24)));
  const m = Math.max(0, Math.min(59, Math.round(min)));
  const total = h * 60 + m;
  if (mapMidnightToEndOfDay && total === 0) return '24:00';
  return formatHhmm(total);
}

function nextHour(total: number, delta: number, mapMidnightToEndOfDay: boolean): string {
  const { hour24, min } = hourMinuteFromTotal(total);
  const h = (hour24 + delta + 24) % 24;
  return composeFromParts(h, min, mapMidnightToEndOfDay);
}

function nextMinute(
  total: number,
  delta: number,
  step: number,
  mapMidnightToEndOfDay: boolean,
): string {
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 1;
  const base = total >= 24 * 60 ? 0 : total;
  const moved = normalizeTotal(base + delta * s);
  if (moved >= 24 * 60) return mapMidnightToEndOfDay ? '24:00' : '00:00';
  return formatHhmm(moved);
}

/**
 * 키패드 없이 시·분 증감 버튼 + 오전/오후 토글로 `HH:mm`을 입력합니다.
 */
export const DigitalHhmmInput = forwardRef<DigitalHhmmInputHandle, DigitalHhmmInputProps>(
  function DigitalHhmmInput(
    {
      valueHhmm,
      onChangeHhmm,
      ink,
      muted,
      line,
      surface = 'transparent',
      selectedForeground = '#FAFAFA',
      disabled = false,
      snapStepMinutes = 1,
      mapMidnightToEndOfDay = false,
      accessibilityLabelPrefix,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const synced = useMemo(() => parseHhmm(valueHhmm)?.total ?? 9 * 60, [valueHhmm]);
    const [draftTotal, setDraftTotal] = useState<number>(synced);
    const draftTotalRef = useRef(draftTotal);
    const onChangeRef = useRef(onChangeHhmm);
    draftTotalRef.current = draftTotal;
    onChangeRef.current = onChangeHhmm;

    useEffect(() => {
      setDraftTotal(synced);
    }, [synced]);

    const prefix = accessibilityLabelPrefix?.trim() || t('common.time');
    const display = useMemo(() => draftsFromValue(formatHhmm(draftTotal)), [draftTotal]);
    const amLabel = t('common.am');
    const pmLabel = t('common.pm');
    const meridiemOptions = [
      { value: 'am' as const, label: amLabel },
      { value: 'pm' as const, label: pmLabel },
    ];

    const emit = (nextHhmm: string): string => {
      onChangeRef.current(nextHhmm);
      const parsed = parseHhmm(nextHhmm)?.total ?? 9 * 60;
      setDraftTotal(parsed);
      return nextHhmm;
    };

    useImperativeHandle(ref, () => ({
      flush: () => formatHhmm(draftTotalRef.current),
    }));

    const applyHour = (delta: number) => {
      if (disabled) return;
      void Haptics.selectionAsync();
      emit(nextHour(draftTotalRef.current, delta, mapMidnightToEndOfDay));
    };

    const applyMinute = (delta: number) => {
      if (disabled) return;
      void Haptics.selectionAsync();
      emit(nextMinute(draftTotalRef.current, delta, snapStepMinutes, mapMidnightToEndOfDay));
    };

    const setMeridiem = (next: Meridiem) => {
      if (disabled || next === display.ap) return;
      void Haptics.selectionAsync();
      const { hour24, min } = hourMinuteFromTotal(draftTotalRef.current);
      const currentIsPm = hour24 >= 12;
      const targetIsPm = next === 'pm';
      if (currentIsPm === targetIsPm) return;
      const shifted = (hour24 + 12) % 24;
      emit(composeFromParts(shifted, min, mapMidnightToEndOfDay));
    };

    return (
      <View
        style={[styles.root, disabled && styles.disabled]}
        pointerEvents={disabled ? 'none' : 'auto'}>
        <View style={styles.meridiemRow}>
          {meridiemOptions.map(({ value, label }) => {
            const selected = display.ap === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={t('timeInput.meridiemA11y', { prefix, meridiem: label })}
                disabled={disabled}
                onPress={() => setMeridiem(value)}
                style={({ pressed }) => [
                  styles.meridiemBtn,
                  {
                    backgroundColor: selected ? ink : surface,
                    borderColor: line,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <ThemedText
                  style={[styles.meridiemText, { color: selected ? selectedForeground : ink }]}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.fieldsRow, { borderColor: line, backgroundColor: surface }]}>
          <View style={styles.stepCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('timeInput.hourIncreaseA11y', { prefix })}
              onPress={() => applyHour(1)}
              style={({ pressed }) => [styles.stepBtn, { borderColor: line, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={[styles.stepText, { color: ink }]}>+</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('timeInput.hourDecreaseA11y', { prefix })}
              onPress={() => applyHour(-1)}
              style={({ pressed }) => [styles.stepBtn, { borderColor: line, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={[styles.stepText, { color: ink }]}>-</ThemedText>
            </Pressable>
          </View>
          <View style={styles.fieldCol}>
            <ThemedText style={[styles.fieldCaption, { color: muted }]}>{t('common.hour')}</ThemedText>
            <ThemedText style={[styles.digitText, { color: ink }]}>{display.hour}</ThemedText>
          </View>
          <ThemedText style={[styles.colon, { color: ink }]}>:</ThemedText>
          <View style={styles.fieldCol}>
            <ThemedText style={[styles.fieldCaption, { color: muted }]}>{t('common.minute')}</ThemedText>
            <ThemedText style={[styles.digitText, { color: ink }]}>{display.min}</ThemedText>
          </View>
          <View style={styles.stepCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('timeInput.minuteIncreaseA11y', { prefix })}
              onPress={() => applyMinute(1)}
              style={({ pressed }) => [styles.stepBtn, { borderColor: line, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={[styles.stepText, { color: ink }]}>+</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('timeInput.minuteDecreaseA11y', { prefix })}
              onPress={() => applyMinute(-1)}
              style={({ pressed }) => [styles.stepBtn, { borderColor: line, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText style={[styles.stepText, { color: ink }]}>-</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  meridiemRow: {
    flexDirection: 'row',
    gap: 6,
  },
  meridiemBtn: {
    flex: 1,
    minHeight: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  meridiemText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  stepCol: {
    width: 36,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  fieldCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
  },
  fieldCaption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  digitText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  colon: {
    fontSize: 26,
    fontWeight: '800',
    paddingBottom: 2,
    marginTop: 12,
  },
});
