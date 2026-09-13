import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  RETRO_RADIUS,
  RetroFlatColors,
  cityPopFont,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { SmoothSegmentedControl } from '@shared/ui/smooth-segmented-control';
import { ThemedText } from '@shared/ui/themed-text';

export type DigitalHhmmInputProps = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  ink: string;
  muted: string;
  line: string;
  surface?: string;
  /** @deprecated 민트 선택면 + 틸 잉크로 통일. API 호환용 */
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
  /** 오전/오후 선택면. 생략 시 시티팝 민트 */
  accentFill?: string;
  /** 오전/오후 선택 글자. 생략 시 틸 잉크 */
  accentInk?: string;
  /** 시·분 숫자색. 생략 시 ink */
  digitColor?: string;
};

/** 키보드가 열린 채 확인을 누를 때 등 — blur 없이 현재 초안을 확정 */
export type DigitalHhmmInputHandle = {
  flush: () => string;
};

type Meridiem = 'am' | 'pm';

const PANEL_SHADOW = 3;
const STEP_SHADOW = 2;

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
  /** `24:00`은 편집 시 자정(00:xx)으로 취급(하루 끝 표기는 상위에서) */
  const total = parsed?.total === 24 * 60 ? 0 : (parsed?.total ?? 9 * 60);
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const { ap, h12 } = h24To12(h24);
  // 자정은 12가 아니라 00 — 「오전 12:00」혼동 방지
  const hour = h24 === 0 ? '00' : pad2(h12);
  return { hour, min: pad2(min), ap };
}

function normalizeTotal(total: number): number {
  const m = Math.round(total);
  if (!Number.isFinite(m)) return 9 * 60;
  if (m >= 24 * 60) return 24 * 60;
  if (m < 0) {
    const cycle = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
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

/**
 * 시(+/-)는 같은 오전·오후 안에서만 순환한다.
 * 예: 오후 11 → 오후 12(정오). 오전/오후 전환은 탭으로만.
 */
export function nextHourWithinMeridiem(
  total: number,
  delta: number,
  mapMidnightToEndOfDay: boolean,
): string {
  const { hour24, min } = hourMinuteFromTotal(total);
  const base = hour24 >= 12 ? 12 : 0;
  const offset = ((hour24 - base + delta) % 12 + 12) % 12;
  return composeFromParts(base + offset, min, mapMidnightToEndOfDay);
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

function SolidShadowFace({
  shadowColor,
  backgroundColor,
  shadowSize,
  children,
  shellStyle,
  faceStyle,
}: {
  shadowColor: string;
  backgroundColor: string;
  shadowSize: number;
  children: ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
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
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      <View style={[styles.shadowFaceBase, { backgroundColor }, faceStyle]}>{children}</View>
    </View>
  );
}

function StepButton({
  a11y,
  label,
  ink,
  fill,
  shadowColor,
  disabled,
  onPress,
}: {
  a11y: string;
  label: string;
  ink: string;
  fill: string;
  shadowColor: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepPress,
        pressed && !disabled && { transform: [{ translateX: 1 }, { translateY: 1 }] },
      ]}>
      <SolidShadowFace
        shadowColor={shadowColor}
        backgroundColor={fill}
        shadowSize={STEP_SHADOW}
        faceStyle={styles.stepFace}>
        <ThemedText style={[styles.stepText, { color: ink }, cityPopFont('800')]}>{label}</ThemedText>
      </SolidShadowFace>
    </Pressable>
  );
}

/**
 * 키패드 없이 시·분 증감 버튼 + 오전/오후 토글로 `HH:mm`을 입력합니다.
 * City Pop / Flat Brutalism Lite — 민트 선택 · solid shadow · 눌림 시 면색 유지.
 */
export const DigitalHhmmInput = forwardRef<DigitalHhmmInputHandle, DigitalHhmmInputProps>(
  function DigitalHhmmInput(
    {
      valueHhmm,
      onChangeHhmm,
      ink,
      muted,
      line: _line,
      surface,
      selectedForeground: _selectedForeground,
      disabled = false,
      snapStepMinutes = 1,
      mapMidnightToEndOfDay = false,
      accessibilityLabelPrefix,
      accentFill,
      accentInk,
      digitColor,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const isDark = useColorScheme() === 'dark';
    const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
    const shadowInk = isDark ? tone.solidShadow : '#000000';
    const selectedFill = accentFill ?? tone.bgMint;
    const selectedInk = accentInk ?? (isDark ? tone.text : tone.tertiary);
    const resolvedDigit = digitColor ?? ink;
    const unselectedFill = surface ?? (isDark ? tone.surfaceAlt : tone.bg);
    const unselectedInk = muted;

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

    const emit = (nextHhmm: string): string => {
      onChangeRef.current(nextHhmm);
      const parsed = parseHhmm(nextHhmm)?.total ?? 9 * 60;
      setDraftTotal(parsed);
      return nextHhmm;
    };

    useImperativeHandle(ref, () => ({
      flush: () => {
        const total = draftTotalRef.current;
        if (mapMidnightToEndOfDay && (total === 0 || total >= 24 * 60)) {
          return '24:00';
        }
        return formatHhmm(total);
      },
    }));

    const applyHour = (delta: number) => {
      if (disabled) return;
      void Haptics.selectionAsync();
      emit(nextHourWithinMeridiem(draftTotalRef.current, delta, mapMidnightToEndOfDay));
    };

    const applyMinute = (delta: number) => {
      if (disabled) return;
      void Haptics.selectionAsync();
      emit(nextMinute(draftTotalRef.current, delta, snapStepMinutes, mapMidnightToEndOfDay));
    };

    const setMeridiem = (next: Meridiem) => {
      if (disabled || next === display.ap) return;
      const { hour24, min } = hourMinuteFromTotal(draftTotalRef.current);
      const currentIsPm = hour24 >= 12;
      const targetIsPm = next === 'pm';
      if (currentIsPm === targetIsPm) return;
      const shifted = (hour24 + 12) % 24;
      emit(composeFromParts(shifted, min, mapMidnightToEndOfDay));
    };

    const meridiemSegmentOptions = [
      {
        value: 'am' as const,
        label: t('common.am'),
        accessibilityLabel: t('timeInput.meridiemA11y', { prefix, meridiem: t('common.am') }),
      },
      {
        value: 'pm' as const,
        label: t('common.pm'),
        accessibilityLabel: t('timeInput.meridiemA11y', { prefix, meridiem: t('common.pm') }),
      },
    ] as const;

    return (
      <View
        style={[styles.root, disabled && styles.disabled]}
        pointerEvents={disabled ? 'none' : 'auto'}>
        <SmoothSegmentedControl
          options={meridiemSegmentOptions}
          value={display.ap}
          onChange={setMeridiem}
          selectedFill={selectedFill}
          trackFill={unselectedFill}
          selectedInk={selectedInk}
          unselectedInk={unselectedInk}
          shadowColor={shadowInk}
          disabled={disabled}
          minHeight={34}
        />

        <SolidShadowFace
          shadowColor={shadowInk}
          backgroundColor={unselectedFill}
          shadowSize={PANEL_SHADOW}
          shellStyle={styles.panelShell}
          faceStyle={styles.panelFace}>
          <View style={styles.fieldsRow}>
            <View style={styles.unitBlock}>
              <ThemedText style={[styles.fieldCaption, { color: muted }, cityPopFont('700')]}>
                {t('common.hour')}
              </ThemedText>
              <View style={styles.unitRow}>
                <View style={styles.stepStack}>
                  <StepButton
                    a11y={t('timeInput.hourIncreaseA11y', { prefix })}
                    label="+"
                    ink={ink}
                    fill={unselectedFill}
                    shadowColor={shadowInk}
                    disabled={disabled}
                    onPress={() => applyHour(1)}
                  />
                  <StepButton
                    a11y={t('timeInput.hourDecreaseA11y', { prefix })}
                    label="−"
                    ink={ink}
                    fill={unselectedFill}
                    shadowColor={shadowInk}
                    disabled={disabled}
                    onPress={() => applyHour(-1)}
                  />
                </View>
                <ThemedText style={[styles.digitText, { color: resolvedDigit }, cityPopFont('800')]}>
                  {display.hour}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.colon, { color: resolvedDigit }, cityPopFont('800')]}>:</ThemedText>

            <View style={styles.unitBlock}>
              <ThemedText style={[styles.fieldCaption, { color: muted }, cityPopFont('700')]}>
                {t('common.minute')}
              </ThemedText>
              <View style={styles.unitRow}>
                <View style={styles.stepStack}>
                  <StepButton
                    a11y={t('timeInput.minuteIncreaseA11y', { prefix })}
                    label="+"
                    ink={ink}
                    fill={unselectedFill}
                    shadowColor={shadowInk}
                    disabled={disabled}
                    onPress={() => applyMinute(1)}
                  />
                  <StepButton
                    a11y={t('timeInput.minuteDecreaseA11y', { prefix })}
                    label="−"
                    ink={ink}
                    fill={unselectedFill}
                    shadowColor={shadowInk}
                    disabled={disabled}
                    onPress={() => applyMinute(-1)}
                  />
                </View>
                <ThemedText style={[styles.digitText, { color: resolvedDigit }, cityPopFont('800')]}>
                  {display.min}
                </ThemedText>
              </View>
            </View>
          </View>
        </SolidShadowFace>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  shadowShell: {
    position: 'relative',
  },
  shadowBlock: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RETRO_RADIUS,
  },
  shadowFaceBase: {
    borderRadius: RETRO_RADIUS,
    borderWidth: 0,
    zIndex: 1,
  },
  panelShell: {
    alignSelf: 'stretch',
    width: '100%',
  },
  panelFace: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    gap: 6,
  },
  unitBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  /** + / − 를 숫자 왼쪽에 세로로 */
  stepStack: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  stepPress: {
    alignItems: 'center',
  },
  stepFace: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  stepText: {
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
  },
  fieldCaption: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  digitText: {
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    letterSpacing: -0.5,
    minWidth: 44,
  },
  colon: {
    fontSize: 28,
    lineHeight: 32,
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
});
