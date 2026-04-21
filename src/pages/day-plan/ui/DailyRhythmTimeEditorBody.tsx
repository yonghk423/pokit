import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  formatMinutesToHHmm,
  isOvernightHhmmRange,
  PRIMARY,
  snapMinutes,
  TIME_SNAP_MINUTES,
} from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';

type PickerTarget = 'start' | 'end' | null;

function rhythmPresetLabel(start: string, end: string): string {
  return `${formatHhmmClockKo(start)} – ${formatHhmmClockKo(end)}`;
}

const PRESETS: ReadonlyArray<{ label: string; hint: string; start: string; end: string }> = [
  {
    label: rhythmPresetLabel('06:00', '23:00'),
    hint: '이른 시작 → 밤까지',
    start: '06:00',
    end: '23:00',
  },
  {
    label: rhythmPresetLabel('07:00', '23:00'),
    hint: '가장 흔한 패턴',
    start: '07:00',
    end: '23:00',
  },
  {
    label: rhythmPresetLabel('08:00', '22:00'),
    hint: '조금 일찍 마무리',
    start: '08:00',
    end: '22:00',
  },
  {
    label: rhythmPresetLabel('08:00', '24:00'),
    hint: '당일 자정(24:00)까지',
    start: '08:00',
    end: '24:00',
  },
];

export type DailyRhythmTimeEditorVariant = 'onboarding' | 'settings';

export type DailyRhythmTimeEditorBodyProps = {
  c: DayPlanPalette;
  isDark: boolean;
  seedStart: string;
  seedEnd: string;
  /** 값이 바뀔 때마다 시드 시각으로 폼을 맞춤 */
  seedKey: number;
  variant: DailyRhythmTimeEditorVariant;
  primaryLabel: string;
  onPrimaryPress: (startHhmm: string, endHhmm: string) => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /** 설정 화면 전용: 하루 시작 시각에 맞춰 매일 알림 */
  dayStartAlarmOn?: boolean;
  onDayStartAlarmChange?: (value: boolean) => void;
};

function hhmmToPickerDate(hhmm: string): Date {
  const m = parseHHmmToMinutes(hhmm);
  const d = new Date();
  if (m === null) {
    d.setHours(8, 0, 0, 0);
    return d;
  }
  if (m >= 24 * 60) {
    d.setHours(23, 55, 0, 0);
    return d;
  }
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

function pickerDateToSnappedHhmm(d: Date): string {
  const raw = d.getHours() * 60 + d.getMinutes();
  const snapped = snapMinutes(raw, TIME_SNAP_MINUTES);
  const max = 23 * 60 + 55;
  return formatMinutesToHHmm(Math.min(Math.max(0, snapped), max));
}

export function DailyRhythmTimeEditorBody({
  c,
  isDark,
  seedStart,
  seedEnd,
  seedKey,
  variant,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  dayStartAlarmOn,
  onDayStartAlarmChange,
}: DailyRhythmTimeEditorBodyProps) {
  const [startHhmm, setStartHhmm] = useState(seedStart);
  const [endHhmm, setEndHhmm] = useState(seedEnd);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  useEffect(() => {
    setStartHhmm(seedStart);
    setEndHhmm(seedEnd);
    setPickerTarget(null);
  }, [seedKey, seedStart, seedEnd]);

  const startDate = useMemo(() => hhmmToPickerDate(startHhmm), [startHhmm]);
  const endDate = useMemo(() => hhmmToPickerDate(endHhmm), [endHhmm]);

  const applyPreset = useCallback((start: string, end: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartHhmm(start);
    setEndHhmm(end);
    setPickerTarget(null);
  }, []);

  const validateAndPrimary = useCallback(() => {
    const ps = parseHHmmToMinutes(startHhmm);
    const pe = parseHHmmToMinutes(endHhmm);
    const overnight = isOvernightHhmmRange(startHhmm, endHhmm);
    if (ps === null || pe === null) {
      Alert.alert('시각 확인', '시작·마무리 시각을 다시 선택해 주세요.');
      return;
    }
    if (!overnight && pe <= ps) {
      Alert.alert(
        '시간 구간',
        '마무리 시각은 시작 시각보다 늦어야 해요. 자정을 넘기면 다음 날로 이어집니다.',
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrimaryPress(startHhmm, endHhmm);
  }, [endHhmm, onPrimaryPress, startHhmm]);

  const onIosTimeChange = useCallback(
    (_: unknown, date?: Date) => {
      if (!date || !pickerTarget) return;
      if (pickerTarget === 'start') {
        setStartHhmm(pickerDateToSnappedHhmm(date));
      } else {
        setEndHhmm(pickerDateToSnappedHhmm(date));
      }
    },
    [pickerTarget],
  );

  const onAndroidTimeChange = useCallback(
    (event: { type?: string }, date?: Date) => {
      if (event.type === 'dismissed') {
        setPickerTarget(null);
        return;
      }
      if (!date || !pickerTarget) return;
      if (pickerTarget === 'start') {
        setStartHhmm(pickerDateToSnappedHhmm(date));
      } else {
        setEndHhmm(pickerDateToSnappedHhmm(date));
      }
      setPickerTarget(null);
    },
    [pickerTarget],
  );

  const title =
    variant === 'onboarding'
      ? '하루 일과에 맞춰 정하기'
      : '시작·마무리 시간';
  const subtitle =
    variant === 'onboarding'
      ? '하루가 돌아가는 시작·마무리만 잡아도 데이플랜이 맞춰져요. 나중에 설정에서 바꿀 수 있어요.'
      : '우선순위 데이플랜의 하루 시작·마무리 시각입니다. 저장하면 바로 반영돼요.';

  const heroKicker = variant === 'onboarding' ? '하루 일과 시간' : '데이플랜';
  const presetRuleColor = isDark ? 'rgba(250, 250, 250, 0.92)' : PRIMARY;
  const pill = useMemo(() => tabPillColors(isDark), [isDark]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        variant === 'onboarding' && styles.scrollContentOnboarding,
        variant === 'settings' && styles.scrollContentSettings,
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={variant === 'settings' || pickerTarget !== null}>
      <View style={[styles.topBlock, variant === 'onboarding' && styles.topBlockOnboarding]}>
        <View style={[styles.hero, variant === 'onboarding' && styles.heroOnboarding]}>
          <View style={styles.heroHeaderRow}>
            <ThemedText
              style={[styles.heroKicker, { color: c.onVariant }]}
              lightColor={c.onVariant}
              darkColor={c.onVariant}>
              {heroKicker}
            </ThemedText>
            <View style={[styles.heroMark, { borderColor: c.border }]}>
              <IconSymbol name="sun.horizon.fill" size={18} color={PRIMARY} />
            </View>
          </View>
          <ThemedText
            style={[
              styles.title,
              { color: c.onSurface },
              variant === 'onboarding' && styles.titleOnboarding,
            ]}
            lightColor={c.onSurface}
            darkColor={c.onSurface}
            numberOfLines={variant === 'onboarding' ? 2 : 3}>
            {title}
          </ThemedText>
          <ThemedText
            style={[
              styles.subtitle,
              { color: c.onVariant },
              variant === 'onboarding' && styles.subtitleOnboarding,
            ]}
            lightColor={c.onVariant}
            darkColor={c.onVariant}
            numberOfLines={variant === 'onboarding' ? 3 : 6}>
            {subtitle}
          </ThemedText>
        </View>

        <View style={styles.presetSection}>
          <ThemedText
            style={[styles.presetKicker, { color: c.onVariant }]}
            lightColor={c.onVariant}
            darkColor={c.onVariant}>
            자주 쓰는 패턴
          </ThemedText>
          <View style={[styles.presetRule, { borderTopColor: presetRuleColor }]} />
          <View style={styles.presetPillList}>
            {PRESETS.map((p) => {
              const selected = p.start === startHhmm && p.end === endHhmm;
              const bg = selected ? pill.activeBg : pill.inactiveBg;
              const borderCol = selected ? pill.activeBorder : pill.inactiveBorder;
              const titleCol = selected ? pill.activeIcon : c.onSurface;
              const hintCol = selected ? pill.inactiveIcon : c.onVariant;
              return (
                <Pressable
                  key={`${p.start}-${p.end}`}
                  onPress={() => applyPreset(p.start, p.end)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label}. ${p.hint}`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.presetPill,
                    { backgroundColor: bg, borderColor: borderCol },
                    pressed && { opacity: 0.88 },
                  ]}>
                  <View style={styles.presetRowTextCol}>
                    <ThemedText
                      style={[styles.presetRowTitle, { color: titleCol }]}
                      lightColor={titleCol}
                      darkColor={titleCol}>
                      {p.label}
                    </ThemedText>
                    <ThemedText
                      style={[styles.presetRowHint, { color: hintCol }]}
                      lightColor={hintCol}
                      darkColor={hintCol}>
                      {p.hint}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.containerLow, borderColor: c.border }]}>
          <TimeRow
            label="하루 시작"
            hint="첫 집중·플로우를 켜기 좋은 시각"
            value={formatHhmmClockKo(startHhmm)}
            active={pickerTarget === 'start'}
            c={c}
            onPress={() => {
              void Haptics.selectionAsync();
              setPickerTarget((t) => (t === 'start' ? null : 'start'));
            }}
          />
          {Platform.OS === 'ios' && pickerTarget === 'start' ? (
            <DateTimePicker
              value={startDate}
              mode="time"
              display="spinner"
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={onIosTimeChange}
            />
          ) : null}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <TimeRow
            label="하루 마무리"
            hint="오늘 목표 구간이 끝나는 시각"
            value={formatHhmmClockKo(endHhmm)}
            active={pickerTarget === 'end'}
            c={c}
            onPress={() => {
              void Haptics.selectionAsync();
              setPickerTarget((t) => (t === 'end' ? null : 'end'));
            }}
          />
          {Platform.OS === 'ios' && pickerTarget === 'end' ? (
            <DateTimePicker
              value={endDate}
              mode="time"
              display="spinner"
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={onIosTimeChange}
            />
          ) : null}
        </View>

        {Platform.OS === 'android' && pickerTarget ? (
          <DateTimePicker
            value={pickerTarget === 'start' ? startDate : endDate}
            mode="time"
            display="default"
            onChange={onAndroidTimeChange}
          />
        ) : null}

        {variant === 'settings' &&
        typeof dayStartAlarmOn === 'boolean' &&
        onDayStartAlarmChange ? (
          <View style={[styles.card, { backgroundColor: c.containerLow, borderColor: c.border }]}>
            <View style={styles.alarmRow}>
              <View style={styles.alarmTextCol}>
                <ThemedText
                  style={[styles.alarmTitle, { color: c.onSurface }]}
                  lightColor={c.onSurface}
                  darkColor={c.onSurface}>
                  하루 시작 알림
                </ThemedText>
                <ThemedText
                  style={[styles.alarmHint, { color: c.onVariant }]}
                  lightColor={c.onVariant}
                  darkColor={c.onVariant}>
                  위에서 정한「하루 시작」시각에 매일 알려 드려요.
                </ThemedText>
              </View>
              <Switch
                trackColor={{ true: PRIMARY, false: c.trackOff }}
                thumbColor="#fff"
                value={dayStartAlarmOn}
                onValueChange={onDayStartAlarmChange}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={validateAndPrimary}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: pill.activeBg,
              borderColor: pill.activeBorder,
              borderWidth: 1,
            },
            pressed && { opacity: 0.92 },
          ]}>
          <ThemedText
            style={[styles.primaryBtnText, { color: pill.activeIcon }]}
            lightColor={pill.activeIcon}
            darkColor={pill.activeIcon}>
            {primaryLabel}
          </ThemedText>
        </Pressable>

        {secondaryLabel && onSecondaryPress ? (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSecondaryPress();
            }}
            style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.7 }]}>
            <ThemedText
              style={[styles.textBtnLabel, { color: c.onVariant }]}
              lightColor={c.onVariant}
              darkColor={c.onVariant}>
              {secondaryLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function TimeRow({
  label,
  hint,
  value,
  active,
  c,
  onPress,
}: {
  label: string;
  hint: string;
  value: string;
  active: boolean;
  c: DayPlanPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.timeRow, pressed && { opacity: 0.9 }]}>
      <View style={styles.timeRowLeft}>
        <ThemedText
          style={[styles.timeRowLabel, { color: c.onSurface }]}
          lightColor={c.onSurface}
          darkColor={c.onSurface}>
          {label}
        </ThemedText>
        <ThemedText
          style={[styles.timeRowHint, { color: c.onVariant }]}
          lightColor={c.onVariant}
          darkColor={c.onVariant}>
          {hint}
        </ThemedText>
      </View>
      <View
        style={[
          styles.timePill,
          { backgroundColor: c.containerLowest, borderColor: active ? PRIMARY : c.border },
        ]}>
        <ThemedText
          style={[styles.timePillText, { color: c.onSurface }]}
          lightColor={c.onSurface}
          darkColor={c.onSurface}>
          {value}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  /** 온보딩: 한 화면에 맞추기 위해 상단 여백 최소화 */
  scrollContentOnboarding: {
    paddingTop: 4,
  },
  /** 설정: 헤더 아래 스크롤 허용 */
  scrollContentSettings: {
    paddingTop: 4,
  },
  topBlock: { gap: 18, paddingBottom: 4 },
  topBlockOnboarding: { gap: 12 },
  footer: {
    flexShrink: 0,
    gap: 2,
    paddingTop: 10,
  },
  hero: { gap: 10, marginBottom: 0, alignSelf: 'stretch' },
  /** 온보딩: 히어로 세로 밀도 */
  heroOnboarding: {
    paddingTop: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.2,
    includeFontPadding: false,
  },
  heroMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.75,
    flexShrink: 1,
    alignSelf: 'stretch',
    lineHeight: 34,
    includeFontPadding: false,
  },
  titleOnboarding: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.55,
    fontWeight: '700',
  },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '500', letterSpacing: -0.15 },
  subtitleOnboarding: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.05,
  },
  presetSection: {
    alignSelf: 'stretch',
    gap: 0,
  },
  presetKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.8,
    marginBottom: 6,
    includeFontPadding: false,
  },
  presetRule: {
    borderTopWidth: 1,
    marginBottom: 0,
  },
  presetPillList: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 8,
  },
  presetPill: {
    alignSelf: 'stretch',
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  presetRowTextCol: {
    gap: 2,
    alignSelf: 'stretch',
  },
  presetRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
    lineHeight: 18,
    includeFontPadding: false,
  },
  presetRowHint: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    letterSpacing: 0,
    includeFontPadding: false,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeRowLeft: { flex: 1, gap: 2 },
  timeRowLabel: { fontSize: 14, fontWeight: '700' },
  timeRowHint: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  timePill: {
    minWidth: 128,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  timePillText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  alarmTextCol: { flex: 1, minWidth: 0, gap: 6 },
  alarmTitle: { fontSize: 15, fontWeight: '800' },
  alarmHint: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  textBtn: { paddingVertical: 12, alignItems: 'center' },
  textBtnLabel: { fontSize: 14, fontWeight: '600' },
});
