import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { addDaysToLocalDateKey, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { DailyRhythmStyleAlarmRow, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { formatDateKeyCompactKo, isOvernightHhmmRange, PRIMARY } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

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
  /** 편집 전 구간이 다음 날로 이어진 상태인지 */
  currentSpansMultiDay?: boolean;
  /** 종료 시각 모호성(당일/다음 날) 확정 콜백 */
  onEndDateChoice?: (startHhmm: string, endHhmm: string, target: 'today' | 'nextDay') => void;
  /** 당일 선택 라벨(예: 당일 · 5월 21일) */
  endDateChoiceTodayLabel?: string;
  /** 다음 날 선택 라벨(예: 다음 날 · 5월 22일) */
  endDateChoiceNextDayLabel?: string;
  /** 마무리 시각이 속한 달력일(범위 시작일) */
  priorityPlanRangeLo?: string;
  /** 마무리 시각이 속한 달력일(범위 종료일) */
  priorityPlanRangeHi?: string;
};

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
  currentSpansMultiDay = false,
  onEndDateChoice,
  endDateChoiceTodayLabel = '당일',
  endDateChoiceNextDayLabel = '다음 날',
  priorityPlanRangeLo,
  priorityPlanRangeHi,
}: DailyRhythmTimeEditorBodyProps) {
  const [startHhmm, setStartHhmm] = useState(seedStart);
  const [endHhmm, setEndHhmm] = useState(seedEnd);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [showEndDateChoice, setShowEndDateChoice] = useState(false);

  useEffect(() => {
    setStartHhmm(seedStart);
    setEndHhmm(seedEnd);
    setPickerTarget(null);
    setShowEndDateChoice(false);
  }, [seedKey, seedStart, seedEnd]);

  const setEndHhmmWithChoiceCheck = useCallback(
    (nextEnd: string) => {
      const startMin = parseHHmmToMinutes(startHhmm.trim());
      const nextEndMin = parseHHmmToMinutes(nextEnd.trim());
      const wasOvernight = isOvernightHhmmRange(startHhmm, endHhmm);
      const isNowNonOvernight =
        startMin !== null &&
        nextEndMin !== null &&
        !isOvernightHhmmRange(startHhmm, nextEnd) &&
        nextEndMin >= startMin;

      setEndHhmm(nextEnd);

      // "기존에는 다음 날 맥락(명시 다일 or 자정 넘김)이었는데 지금은 당일/다음 날 모두 해석 가능한" 경우 선택 노출
      if ((currentSpansMultiDay || wasOvernight) && isNowNonOvernight) {
        setShowEndDateChoice(true);
        return;
      }
      setShowEndDateChoice(false);
    },
    [currentSpansMultiDay, endHhmm, startHhmm],
  );

  const applyPreset = useCallback((start: string, end: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartHhmm(start);
    setEndHhmm(end);
    setShowEndDateChoice(false);
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

  const startPillDateCaption = useMemo(() => {
    if (!priorityPlanRangeLo) return undefined;
    return formatDateKeyCompactKo(priorityPlanRangeLo);
  }, [priorityPlanRangeLo]);

  const endPillDateCaption = useMemo(() => {
    if (!priorityPlanRangeLo) return undefined;
    const lo = priorityPlanRangeLo;
    const hi = priorityPlanRangeHi ?? lo;
    if (showEndDateChoice) return undefined;
    if (hi > lo) return formatDateKeyCompactKo(hi);
    if (isOvernightHhmmRange(startHhmm, endHhmm)) {
      return formatDateKeyCompactKo(addDaysToLocalDateKey(lo, 1));
    }
    return formatDateKeyCompactKo(lo);
  }, [endHhmm, priorityPlanRangeHi, priorityPlanRangeLo, showEndDateChoice, startHhmm]);

  const timePickerPalette = useMemo(
    () => ({
      onSurface: c.onSurface,
      onVariant: c.onVariant,
      border: c.border,
      containerLowest: c.containerLowest,
    }),
    [c],
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
          <SnappedTimePickerField
            label="하루 시작"
            hint="첫 집중·플로우를 켜기 좋은 시각"
            valueHhmm={startHhmm}
            onChangeHhmm={setStartHhmm}
            expanded={pickerTarget === 'start'}
            onToggleExpand={() => setPickerTarget((t) => (t === 'start' ? null : 'start'))}
            isDark={isDark}
            palette={timePickerPalette}
            snapStepMinutes={1}
            dateCaption={startPillDateCaption}
          />

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <SnappedTimePickerField
            label="하루 마무리"
            hint="오늘 목표 구간이 끝나는 시각"
            valueHhmm={endHhmm}
            onChangeHhmm={setEndHhmmWithChoiceCheck}
            expanded={pickerTarget === 'end'}
            onToggleExpand={() => setPickerTarget((t) => (t === 'end' ? null : 'end'))}
            isDark={isDark}
            palette={timePickerPalette}
            snapStepMinutes={1}
            dateCaption={endPillDateCaption}
          />

          {showEndDateChoice && onEndDateChoice ? (
            <View style={styles.endDateChoiceInline}>
              <ThemedText
                style={[styles.endDateChoiceQuestion, { color: c.onVariant }]}
                lightColor={c.onVariant}
                darkColor={c.onVariant}>
                당일 기준으로 끝나나요, 다음 날로 이어지나요?
              </ThemedText>
              <View style={styles.endDateChoiceBtnRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="당일로 설정"
                  onPress={() => {
                    onEndDateChoice(startHhmm, endHhmm, 'today');
                    setShowEndDateChoice(false);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.endDateChoiceBtn,
                    { backgroundColor: pill.inactiveBg, borderColor: pill.inactiveBorder },
                    pressed && { opacity: 0.9 },
                  ]}>
                  <ThemedText
                    style={[styles.endDateChoiceBtnText, { color: pill.inactiveIcon }]}
                    lightColor={pill.inactiveIcon}
                    darkColor={pill.inactiveIcon}>
                    {endDateChoiceTodayLabel}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다음 날로 설정"
                  onPress={() => {
                    onEndDateChoice(startHhmm, endHhmm, 'nextDay');
                    setShowEndDateChoice(false);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.endDateChoiceBtn,
                    { backgroundColor: pill.activeBg, borderColor: pill.activeBorder },
                    pressed && { opacity: 0.9 },
                  ]}>
                  <ThemedText
                    style={[styles.endDateChoiceBtnText, { color: pill.activeIcon }]}
                    lightColor={pill.activeIcon}
                    darkColor={pill.activeIcon}>
                    {endDateChoiceNextDayLabel}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {variant === 'settings' &&
          typeof dayStartAlarmOn === 'boolean' &&
          onDayStartAlarmChange ? (
          <View style={[styles.card, { backgroundColor: c.containerLow, borderColor: c.border }]}>
            <DailyRhythmStyleAlarmRow
              title="하루 시작 알림"
              hint="위에서 정한「하루 시작」시각에 매일 알려 드려요."
              value={dayStartAlarmOn}
              onValueChange={onDayStartAlarmChange}
              palette={{
                onSurface: c.onSurface,
                onVariant: c.onVariant,
                trackOff: c.trackOff,
              }}
            />
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
  endDateChoiceInline: {
    marginTop: 10,
    gap: 10,
  },
  endDateChoiceQuestion: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  endDateChoiceBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  endDateChoiceBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endDateChoiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
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
