import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { addDaysToLocalDateKey, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import {
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { DigitalHhmmInput, type DigitalHhmmInputHandle } from '@shared/ui/digital-hhmm-input';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { ThemedText } from '@shared/ui/themed-text';
import { DailyRhythmStyleAlarmRow, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { dailyRhythmOnboardingAssets } from '../lib/dailyRhythmOnboardingAssets';
import { formatDateKeyCompactKo, isOvernightHhmmRange } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { DayCycleEmojiMark } from './DayCycleEmojiMark';

type PickerTarget = 'start' | 'end' | null;

function initialEndDateTargetFromRange(rangeLo?: string, rangeHi?: string): 'today' | 'nextDay' {
  if (rangeLo && rangeHi && rangeHi > rangeLo) return 'nextDay';
  return 'today';
}

function suggestEndDateTarget(start: string, end: string): 'today' | 'nextDay' {
  if (isOvernightHhmmRange(start, end)) return 'nextDay';
  return 'today';
}

function splitDateKeyCompactKo(dateKey: string): { month: string; day: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  return { month: `${parseInt(m[2], 10)}월`, day: `${parseInt(m[3], 10)}일` };
}

function SolidShadowFace({
  borderColor,
  shadowColor,
  backgroundColor,
  style,
  shellStyle,
  children,
  shadowSize = SOLID_SHADOW_OFFSET,
}: {
  borderColor: string;
  shadowColor: string;
  backgroundColor: string;
  style?: object;
  shellStyle?: object;
  children: ReactNode;
  shadowSize?: number;
}) {
  return (
    <View
      style={[
        styles.shadowShell,
        { marginRight: shadowSize, marginBottom: shadowSize },
        shellStyle,
      ]}>
      <View
        style={[
          styles.shadowBlock,
          {
            backgroundColor: shadowColor,
            borderColor,
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      <View style={[styles.shadowFace, { backgroundColor, borderColor }, style]}>{children}</View>
    </View>
  );
}

function OnboardingTimeRow({
  label,
  hint,
  valueHhmm,
  onChangeHhmm,
  expanded,
  onToggleExpand,
  isDark,
  c,
  thumb,
  dateParts,
  mapMidnightToEndOfDay,
}: {
  label: string;
  hint: string;
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isDark: boolean;
  c: DayPlanPalette;
  thumb: ImageSourcePropType;
  dateParts: { month: string; day: string } | null;
  mapMidnightToEndOfDay?: boolean;
}) {
  const digitalRef = useRef<DigitalHhmmInputHandle>(null);
  const ink = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const selectedFg = isDark ? '#09090b' : '#FAFAFA';

  return (
    <View style={styles.onboardTimeBlock}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [styles.onboardTimeRow, pressed && { opacity: 0.92 }]}>
        <SolidShadowFace
          borderColor={c.border}
          shadowColor={isDark ? ink.solidShadow : '#000000'}
          backgroundColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
          shadowSize={3}
          style={styles.thumbFace}>
          <Image source={thumb} style={styles.thumbImage} resizeMode="cover" />
        </SolidShadowFace>

        <View style={styles.onboardTimeCopy}>
          <ThemedText
            style={[styles.onboardTimeLabel, { color: c.onSurface }, cityPopFont('800')]}
            lightColor={c.onSurface}
            darkColor={c.onSurface}>
            {label}
          </ThemedText>
          <ThemedText
            style={[styles.onboardTimeHint, { color: c.onVariant }, cityPopFont('700')]}
            lightColor={c.onVariant}
            darkColor={c.onVariant}
            numberOfLines={2}>
            {hint}
          </ThemedText>
        </View>

        <View style={styles.onboardTimeRight}>
          {dateParts ? (
            <View style={styles.dateStack}>
              <ThemedText
                style={[styles.dateStackLine, { color: c.onVariant }, cityPopFont('700')]}
                lightColor={c.onVariant}
                darkColor={c.onVariant}>
                {dateParts.month}
              </ThemedText>
              <ThemedText
                style={[styles.dateStackLine, { color: c.onVariant }, cityPopFont('700')]}
                lightColor={c.onVariant}
                darkColor={c.onVariant}>
                {dateParts.day}
              </ThemedText>
            </View>
          ) : null}
          <SolidShadowFace
            borderColor={c.border}
            shadowColor={isDark ? ink.solidShadow : '#000000'}
            backgroundColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
            shadowSize={expanded ? 0 : 2}
            style={styles.timePillFace}>
            <ThemedText
              style={[styles.timePillText, { color: c.onSurface }, cityPopFont('800')]}
              lightColor={c.onSurface}
              darkColor={c.onSurface}>
              {formatHhmmClockKo(valueHhmm)}
            </ThemedText>
          </SolidShadowFace>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.inputBlock}>
          <DigitalHhmmInput
            ref={digitalRef}
            valueHhmm={valueHhmm}
            onChangeHhmm={onChangeHhmm}
            ink={c.onSurface}
            muted={c.onVariant}
            line={c.border}
            surface={isDark ? ink.surfaceAlt : '#FFFFFF'}
            selectedForeground={selectedFg}
            snapStepMinutes={1}
            mapMidnightToEndOfDay={mapMidnightToEndOfDay}
            accessibilityLabelPrefix={label}
          />
          <BrutalConfirmButton
            accessibilityLabel={`${label} 시간 선택 확인`}
            fill={c.onSurface}
            labelColor={selectedFg}
            border={c.border}
            shadowColor={isDark ? ink.solidShadow : '#000000'}
            onPress={() => {
              const flushed = digitalRef.current?.flush();
              if (flushed) onChangeHhmm(flushed);
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

export type DailyRhythmTimeEditorVariant = 'onboarding' | 'settings';

export type DailyRhythmTimeEditorBodyProps = {
  c: DayPlanPalette;
  isDark: boolean;
  seedStart: string;
  seedEnd: string;
  seedKey: number;
  variant: DailyRhythmTimeEditorVariant;
  primaryLabel: string;
  onPrimaryPress: (startHhmm: string, endHhmm: string) => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  dayStartAlarmOn?: boolean;
  onDayStartAlarmChange?: (value: boolean) => void;
  dayEndAlarmOn?: boolean;
  dayEndAlarmHhmm?: string;
  onDayEndAlarmChange?: (value: boolean) => void;
  onDayEndAlarmHhmmChange?: (hhmm: string) => void;
  currentSpansMultiDay?: boolean;
  onEndDateChoice?: (startHhmm: string, endHhmm: string, target: 'today' | 'nextDay') => void;
  endDateChoiceTodayLabel?: string;
  endDateChoiceNextDayLabel?: string;
  priorityPlanRangeLo?: string;
  priorityPlanRangeHi?: string;
  footerSlot?: ReactNode;
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
  dayEndAlarmOn,
  dayEndAlarmHhmm,
  onDayEndAlarmChange,
  onDayEndAlarmHhmmChange,
  currentSpansMultiDay: _currentSpansMultiDay = false,
  onEndDateChoice,
  endDateChoiceTodayLabel = '당일',
  endDateChoiceNextDayLabel = '다음 날',
  priorityPlanRangeLo,
  priorityPlanRangeHi,
  footerSlot,
}: DailyRhythmTimeEditorBodyProps) {
  const [startHhmm, setStartHhmm] = useState(seedStart);
  const [endHhmm, setEndHhmm] = useState(seedEnd);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [dayEndAlarmTimeExpanded, setDayEndAlarmTimeExpanded] = useState(false);
  const [endDateTarget, setEndDateTarget] = useState<'today' | 'nextDay'>(() =>
    initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi),
  );
  const endDatePinnedRef = useRef(false);
  const endDateTargetRef = useRef<'today' | 'nextDay'>(
    initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi),
  );

  const ink = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const pill = useMemo(() => tabPillColors(isDark), [isDark]);
  const isOnboarding = variant === 'onboarding';
  const shadowInk = isDark ? ink.solidShadow : '#000000';

  useEffect(() => {
    endDateTargetRef.current = endDateTarget;
  }, [endDateTarget]);

  useEffect(() => {
    setStartHhmm(seedStart);
    setEndHhmm(seedEnd);
    setPickerTarget(null);
    endDatePinnedRef.current = false;
    const initial = initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi);
    const suggested =
      initial === 'today' && isOvernightHhmmRange(seedStart, seedEnd) ? 'nextDay' : initial;
    endDateTargetRef.current = suggested;
    setEndDateTarget(suggested);
  }, [seedKey, seedStart, seedEnd, priorityPlanRangeLo, priorityPlanRangeHi]);

  const applyEndDateTarget = useCallback(
    (target: 'today' | 'nextDay', start: string, end: string, fromUser = false) => {
      if (fromUser) endDatePinnedRef.current = true;
      endDateTargetRef.current = target;
      setEndDateTarget(target);
      onEndDateChoice?.(start, end, target);
    },
    [onEndDateChoice],
  );

  const syncEndDateForTimes = useCallback(
    (start: string, end: string) => {
      const target = endDatePinnedRef.current
        ? endDateTargetRef.current
        : suggestEndDateTarget(start, end);
      if (!endDatePinnedRef.current) {
        endDateTargetRef.current = target;
        setEndDateTarget(target);
      }
      onEndDateChoice?.(start, end, target);
    },
    [onEndDateChoice],
  );

  const setStartHhmmWithSync = useCallback(
    (nextStart: string) => {
      setStartHhmm(nextStart);
      syncEndDateForTimes(nextStart, endHhmm);
    },
    [endHhmm, syncEndDateForTimes],
  );

  const setEndHhmmWithChoiceCheck = useCallback(
    (nextEnd: string) => {
      setEndHhmm(nextEnd);
      syncEndDateForTimes(startHhmm, nextEnd);
    },
    [startHhmm, syncEndDateForTimes],
  );

  const validateAndPrimary = useCallback(() => {
    const ps = parseHHmmToMinutes(startHhmm);
    const pe = parseHHmmToMinutes(endHhmm);
    if (ps === null || pe === null) {
      Alert.alert('시각 확인', '시작·마무리 시각을 다시 선택해 주세요.');
      return;
    }
    if (endDateTarget === 'today' && pe <= ps) {
      Alert.alert(
        '시간 구간',
        '당일 마무리를 쓰려면 마무리 시각이 시작 시각보다 늦어야 해요.',
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEndDateChoice?.(startHhmm, endHhmm, endDateTarget);
    onPrimaryPress(startHhmm, endHhmm);
  }, [endDateTarget, endHhmm, onEndDateChoice, onPrimaryPress, startHhmm]);

  const startDateKey = priorityPlanRangeLo;
  const endDateKey = useMemo(() => {
    if (!priorityPlanRangeLo) return undefined;
    if (onEndDateChoice) {
      return endDateTarget === 'nextDay'
        ? addDaysToLocalDateKey(priorityPlanRangeLo, 1)
        : priorityPlanRangeLo;
    }
    const hi = priorityPlanRangeHi ?? priorityPlanRangeLo;
    if (hi > priorityPlanRangeLo) return hi;
    if (isOvernightHhmmRange(startHhmm, endHhmm)) {
      return addDaysToLocalDateKey(priorityPlanRangeLo, 1);
    }
    return priorityPlanRangeLo;
  }, [
    endDateTarget,
    endHhmm,
    onEndDateChoice,
    priorityPlanRangeHi,
    priorityPlanRangeLo,
    startHhmm,
  ]);

  const startDateParts = startDateKey ? splitDateKeyCompactKo(startDateKey) : null;
  const endDateParts = endDateKey ? splitDateKeyCompactKo(endDateKey) : null;

  const endDateTodayInvalid =
    endDateTarget === 'today' &&
    parseHHmmToMinutes(endHhmm) !== null &&
    parseHHmmToMinutes(startHhmm) !== null &&
    Number(parseHHmmToMinutes(endHhmm)) <= Number(parseHHmmToMinutes(startHhmm));

  const rangeSummaryParts = useMemo(() => {
    const startLabel = formatHhmmClockKo(startHhmm);
    const endLabel = formatHhmmClockKo(endHhmm);
    if (!priorityPlanRangeLo) {
      return {
        left: startLabel,
        right: endDateTarget === 'nextDay' ? `${endLabel} · 다음 날` : endLabel,
      };
    }
    const startDate = formatDateKeyCompactKo(priorityPlanRangeLo);
    const endDate =
      endDateTarget === 'nextDay'
        ? formatDateKeyCompactKo(addDaysToLocalDateKey(priorityPlanRangeLo, 1))
        : startDate;
    if (endDate === startDate) {
      return { left: `${startDate} ${startLabel}`, right: endLabel };
    }
    return { left: `${startDate} ${startLabel}`, right: `${endDate} ${endLabel}` };
  }, [endDateTarget, endHhmm, priorityPlanRangeLo, startHhmm]);

  const timePickerPalette = useMemo(
    () => ({
      onSurface: c.onSurface,
      onVariant: c.onVariant,
      border: c.border,
      containerLowest: isDark ? ink.surfaceAlt : '#FFFFFF',
    }),
    [c, ink.surfaceAlt, isDark],
  );

  const settingsTimeCard = (
    <View
      style={[
        styles.settingsCard,
        { backgroundColor: isDark ? ink.surfaceAlt : '#FFFFFF', borderColor: c.border },
      ]}>
      <SnappedTimePickerField
        label="하루 시작"
        hint="첫 집중·루틴을 켜기 좋은 시각"
        valueHhmm={startHhmm}
        onChangeHhmm={setStartHhmmWithSync}
        expanded={pickerTarget === 'start'}
        onToggleExpand={() => setPickerTarget((t) => (t === 'start' ? null : 'start'))}
        isDark={isDark}
        palette={timePickerPalette}
        snapStepMinutes={1}
        dateCaption={startDateKey ? formatDateKeyCompactKo(startDateKey) : undefined}
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
        mapMidnightToEndOfDay
        dateCaption={endDateKey ? formatDateKeyCompactKo(endDateKey) : undefined}
      />
      {onEndDateChoice ? (
        <View style={styles.endDateChoiceInline}>
          <ThemedText
            style={[styles.endDateChoiceQuestion, { color: c.onVariant }]}
            lightColor={c.onVariant}
            darkColor={c.onVariant}>
            마무리 시각은 당일인가요, 다음 날인가요?
          </ThemedText>
          <View style={styles.endDateChoiceBtnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="당일로 설정"
              onPress={() => {
                applyEndDateTarget('today', startHhmm, endHhmm, true);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.endDateChoiceBtn,
                {
                  backgroundColor: endDateTarget === 'today' ? pill.activeBg : pill.inactiveBg,
                  borderColor: endDateTarget === 'today' ? pill.activeBorder : pill.inactiveBorder,
                },
                pressed && { opacity: 0.9 },
              ]}>
              <ThemedText
                style={[
                  styles.endDateChoiceBtnText,
                  { color: endDateTarget === 'today' ? pill.activeIcon : pill.inactiveIcon },
                ]}>
                {endDateChoiceTodayLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 날로 설정"
              onPress={() => {
                applyEndDateTarget('nextDay', startHhmm, endHhmm, true);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.endDateChoiceBtn,
                {
                  backgroundColor: endDateTarget === 'nextDay' ? pill.activeBg : pill.inactiveBg,
                  borderColor:
                    endDateTarget === 'nextDay' ? pill.activeBorder : pill.inactiveBorder,
                },
                pressed && { opacity: 0.9 },
              ]}>
              <ThemedText
                style={[
                  styles.endDateChoiceBtnText,
                  { color: endDateTarget === 'nextDay' ? pill.activeIcon : pill.inactiveIcon },
                ]}>
                {endDateChoiceNextDayLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        isOnboarding && styles.scrollContentOnboarding,
        variant === 'settings' && styles.scrollContentSettings,
      ]}
      showsVerticalScrollIndicator={false}
      bounces={isOnboarding}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      scrollEnabled>
      <View style={[styles.topBlock, isOnboarding && styles.topBlockOnboarding]}>
        {isOnboarding ? (
          <SolidShadowFace
            borderColor={c.border}
            shadowColor={shadowInk}
            backgroundColor={isDark ? ink.surfaceAlt : '#F6F3EB'}
            shellStyle={styles.heroBannerShell}
            style={styles.heroBannerFace}>
            <Image
              source={dailyRhythmOnboardingAssets.hero}
              style={styles.heroBannerImage}
              resizeMode="contain"
              accessibilityLabel="아침 루틴 일러스트"
            />
            <View
              pointerEvents="none"
              style={[
                styles.heroBannerScrim,
                {
                  backgroundColor: isDark
                    ? 'rgba(45, 47, 68, 0.55)'
                    : 'rgba(246, 243, 235, 0.72)',
                },
              ]}
            />
            <View style={styles.heroBannerContent}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.kickerRow}>
                  {(['하루', '일과', '시간'] as const).map((word) => (
                    <ThemedText
                      key={word}
                      style={[styles.kickerWord, { color: c.onVariant }, cityPopFont('700')]}
                      lightColor={c.onVariant}
                      darkColor={c.onVariant}>
                      {word}
                    </ThemedText>
                  ))}
                </View>
                <SolidShadowFace
                  borderColor={c.border}
                  shadowColor={shadowInk}
                  backgroundColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
                  style={styles.sunFace}>
                  <DayCycleEmojiMark size={22} color={c.border} />
                </SolidShadowFace>
              </View>

              <View style={styles.heroBannerCopy}>
                <ThemedText
                  style={[styles.onboardTitle, { color: c.onSurface }, cityPopFont('800')]}
                  lightColor={c.onSurface}
                  darkColor={c.onSurface}>
                  내 하루 일과 정하기
                </ThemedText>
                <ThemedText
                  style={[styles.onboardSubtitle, { color: c.onVariant }, cityPopFont('500')]}
                  lightColor={c.onVariant}
                  darkColor={c.onVariant}>
                  시작·마무리만 잡으면 데이플랜이 그 구간에 맞춰져요. 자정을 넘겨도 괜찮아요.
                  나중에 설정에서 바꿀 수 있어요.
                </ThemedText>
              </View>
            </View>
          </SolidShadowFace>
        ) : (
          <View style={styles.settingsHero}>
            <ThemedText style={[styles.settingsKicker, { color: c.onVariant }]}>데이플랜</ThemedText>
            <ThemedText style={[styles.settingsSubtitle, { color: c.onVariant }]}>
              우선순위 데이플랜의 하루 시작·마무리 시각입니다. 저장하면 바로 반영돼요.
            </ThemedText>
          </View>
        )}

        {isOnboarding ? (
          <SolidShadowFace
            borderColor={c.border}
            shadowColor={shadowInk}
            backgroundColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
            style={styles.mainCardFace}>
            <OnboardingTimeRow
              label="하루 시작"
              hint="첫 집중·루틴을 켜기 좋은 시각"
              valueHhmm={startHhmm}
              onChangeHhmm={setStartHhmmWithSync}
              expanded={pickerTarget === 'start'}
              onToggleExpand={() => setPickerTarget((t) => (t === 'start' ? null : 'start'))}
              isDark={isDark}
              c={c}
              thumb={dailyRhythmOnboardingAssets.startThumb}
              dateParts={startDateParts}
            />

            <View style={[styles.cardRule, { borderTopColor: c.border }]} />

            <OnboardingTimeRow
              label="하루 마무리"
              hint="오늘 목표 구간이 끝나는 시각"
              valueHhmm={endHhmm}
              onChangeHhmm={setEndHhmmWithChoiceCheck}
              expanded={pickerTarget === 'end'}
              onToggleExpand={() => setPickerTarget((t) => (t === 'end' ? null : 'end'))}
              isDark={isDark}
              c={c}
              thumb={dailyRhythmOnboardingAssets.endThumb}
              dateParts={endDateParts}
              mapMidnightToEndOfDay
            />

            {onEndDateChoice ? (
              <View style={styles.endDateChoiceOnboard}>
                <ThemedText
                  style={[styles.endDateChoiceQuestionOnboard, { color: c.onVariant }, cityPopFont('800')]}
                  lightColor={c.onVariant}
                  darkColor={c.onVariant}>
                  마무리 시각은 당일인가요, 다음 날인가요?
                </ThemedText>
                <View style={styles.endDateChoiceBtnRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="당일로 설정"
                    onPress={() => {
                      applyEndDateTarget('today', startHhmm, endHhmm, true);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                      styles.dayChoicePress,
                      pressed && { opacity: 0.92 },
                    ]}>
                    <SolidShadowFace
                      borderColor={c.border}
                      shadowColor={shadowInk}
                      backgroundColor={
                        endDateTarget === 'today' ? ink.bgMint : isDark ? ink.surfaceAlt : '#FFFFFF'
                      }
                      shadowSize={endDateTarget === 'today' ? 4 : 2}
                      shellStyle={styles.dayChoiceShell}
                      style={styles.dayChoiceFace}>
                      <ThemedText
                        style={[
                          styles.dayChoiceText,
                          {
                            color:
                              endDateTarget === 'today'
                                ? isDark
                                  ? ink.text
                                  : ink.tertiary
                                : c.onVariant,
                          },
                          cityPopFont('800'),
                        ]}>
                        {endDateChoiceTodayLabel}
                      </ThemedText>
                    </SolidShadowFace>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="다음 날로 설정"
                    onPress={() => {
                      applyEndDateTarget('nextDay', startHhmm, endHhmm, true);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                      styles.dayChoicePress,
                      pressed && { opacity: 0.92 },
                    ]}>
                    <SolidShadowFace
                      borderColor={c.border}
                      shadowColor={shadowInk}
                      backgroundColor={
                        endDateTarget === 'nextDay'
                          ? ink.bgMint
                          : isDark
                            ? ink.surfaceAlt
                            : '#FFFFFF'
                      }
                      shadowSize={endDateTarget === 'nextDay' ? 4 : 2}
                      shellStyle={styles.dayChoiceShell}
                      style={styles.dayChoiceFace}>
                      <ThemedText
                        style={[
                          styles.dayChoiceText,
                          {
                            color:
                              endDateTarget === 'nextDay'
                                ? isDark
                                  ? ink.text
                                  : ink.tertiary
                                : c.onVariant,
                          },
                          cityPopFont('800'),
                        ]}>
                        {endDateChoiceNextDayLabel}
                      </ThemedText>
                    </SolidShadowFace>
                  </Pressable>
                </View>
                {endDateTodayInvalid ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {`마무리(${formatHhmmClockKo(endHhmm)})가 시작(${formatHhmmClockKo(startHhmm)})보다 이릅니다. 저장하려면 마무리를 시작 이후로 맞춰 주세요.`}
                  </ThemedText>
                ) : isOvernightHhmmRange(startHhmm, endHhmm) && endDateTarget === 'nextDay' ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    마무리 시각이 시작보다 이르면 다음 날로 이어지는 하루 구간이에요.
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.summaryBox,
                {
                  borderColor: c.border,
                  backgroundColor: isDark ? 'rgba(48, 97, 99, 0.35)' : 'rgba(246, 243, 235, 0.7)',
                },
              ]}>
              <View
                style={[
                  styles.summaryBadge,
                  {
                    borderColor: c.border,
                    backgroundColor: isDark ? ink.surfaceAlt : '#FFFFFF',
                  },
                ]}>
                <ThemedText
                  style={[styles.summaryBadgeText, { color: c.onSurface }, cityPopFont('800')]}>
                  내 일과
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText
                  style={[styles.summaryValue, { color: c.onSurface }, cityPopFont('800')]}
                  numberOfLines={2}>
                  {rangeSummaryParts.left}
                </ThemedText>
                <ThemedText style={[styles.summaryArrow, { color: c.onSurface }]}>→</ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: c.onSurface }, cityPopFont('800')]}
                  numberOfLines={2}>
                  {rangeSummaryParts.right}
                </ThemedText>
              </View>
            </View>
          </SolidShadowFace>
        ) : (
          settingsTimeCard
        )}

        {variant === 'settings' &&
        typeof dayStartAlarmOn === 'boolean' &&
        onDayStartAlarmChange ? (
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: isDark ? ink.surfaceAlt : '#FFFFFF', borderColor: c.border },
            ]}>
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
            {typeof dayEndAlarmOn === 'boolean' && onDayEndAlarmChange ? (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <DailyRhythmStyleAlarmRow
                  title="오늘 돌아보기 알림"
                  hint="정해진 시각에 오늘 진행 상황을 돌아보라고 알려 드려요."
                  value={dayEndAlarmOn}
                  onValueChange={onDayEndAlarmChange}
                  palette={{
                    onSurface: c.onSurface,
                    onVariant: c.onVariant,
                    trackOff: c.trackOff,
                  }}
                />
                {dayEndAlarmOn && dayEndAlarmHhmm && onDayEndAlarmHhmmChange ? (
                  <View
                    style={[
                      styles.endAlarmTimeCard,
                      {
                        backgroundColor: isDark ? ink.surfaceAlt : '#F6F3EB',
                        borderColor: c.border,
                      },
                    ]}>
                    <SnappedTimePickerField
                      label="알림 시각"
                      hint="이 시각에 매일 알림이 울려요."
                      valueHhmm={dayEndAlarmHhmm}
                      onChangeHhmm={onDayEndAlarmHhmmChange}
                      expanded={dayEndAlarmTimeExpanded}
                      onToggleExpand={() => setDayEndAlarmTimeExpanded((v) => !v)}
                      isDark={isDark}
                      palette={timePickerPalette}
                      snapStepMinutes={1}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {footerSlot}
      </View>

      <View style={[styles.footer, isOnboarding && styles.footerOnboarding]}>
        {isOnboarding ? (
          <Pressable
            onPress={validateAndPrimary}
            style={({ pressed }) => [
              styles.primaryPress,
              pressed && { opacity: 0.94 },
            ]}>
            <SolidShadowFace
              borderColor={c.border}
              shadowColor={shadowInk}
              backgroundColor={ink.bgMint}
              shellStyle={styles.primaryShell}
              style={styles.primaryFace}>
              <ThemedText
                style={[
                  styles.primaryBtnTextOnboard,
                  { color: isDark ? ink.text : ink.tertiary },
                  cityPopFont('800'),
                ]}>
                {primaryLabel}
              </ThemedText>
            </SolidShadowFace>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={validateAndPrimary}
              style={({ pressed }) => [pressed && { opacity: 0.94 }]}>
              <View
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: pill.activeBg,
                    borderColor: pill.activeBorder,
                    borderWidth: 2,
                  },
                ]}>
                <ThemedText style={[styles.primaryBtnText, { color: pill.activeIcon }]}>
                  {primaryLabel}
                </ThemedText>
              </View>
            </Pressable>

            {secondaryLabel && onSecondaryPress ? (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSecondaryPress();
                }}
                style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.7 }]}>
                <ThemedText
                  style={[styles.textBtnLabel, { color: c.onVariant }, cityPopFont('700')]}
                  lightColor={c.onVariant}
                  darkColor={c.onVariant}>
                  {secondaryLabel}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
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
  scrollContentOnboarding: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollContentSettings: {
    paddingTop: 0,
    paddingBottom: 4,
  },
  topBlock: { gap: 16, paddingBottom: 4 },
  topBlockOnboarding: { gap: 22 },

  shadowShell: { position: 'relative' },
  shadowBlock: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  shadowFace: {
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
  },

  onboardHero: { gap: 16 },
  heroBannerShell: {
    alignSelf: 'stretch',
    width: '100%',
  },
  heroBannerFace: {
    minHeight: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroBannerScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBannerContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 28,
    minHeight: 280,
    justifyContent: 'space-between',
  },
  heroBannerCopy: {
    gap: 10,
    maxWidth: '88%',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kickerRow: { flexDirection: 'row', gap: 18, paddingTop: 4 },
  kickerWord: {
    fontSize: 13,
    letterSpacing: 2.4,
  },
  sunFace: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardTitle: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  onboardSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },

  mainCardFace: {
    padding: 22,
    gap: 18,
  },
  cardRule: {
    borderTopWidth: 2,
    opacity: 0.12,
  },

  onboardTimeBlock: { gap: 8 },
  onboardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbFace: {
    width: 48,
    height: 48,
    borderRadius: 2,
  },
  thumbImage: { width: '100%', height: '100%' },
  onboardTimeCopy: { flex: 1, minWidth: 0, gap: 2 },
  onboardTimeLabel: { fontSize: 15, lineHeight: 20, letterSpacing: -0.25 },
  onboardTimeHint: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  onboardTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  dateStack: { alignItems: 'flex-end' },
  dateStackLine: { fontSize: 11, lineHeight: 14, textAlign: 'right' },
  timePillFace: {
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillText: { fontSize: 15, letterSpacing: -0.2 },
  inputBlock: { paddingTop: 4, gap: 8 },

  endDateChoiceOnboard: { gap: 12, paddingTop: 4 },
  endDateChoiceQuestionOnboard: {
    fontSize: 11,
    letterSpacing: 1.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  endDateChoiceInline: { marginTop: 12, gap: 10 },
  endDateChoiceQuestion: { fontSize: 13, fontWeight: '600' },
  endDateChoiceBtnRow: { flexDirection: 'row', gap: 12 },
  dayChoicePress: { flex: 1 },
  dayChoiceShell: { alignSelf: 'stretch', width: '100%' },
  endDateChoiceBtn: {
    flex: 1,
    minHeight: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  endDateChoiceBtnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  endDateChoiceHint: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  dayChoiceFace: {
    minHeight: 52,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  dayChoiceText: { fontSize: 12, textAlign: 'center' },

  summaryBox: {
    marginTop: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    position: 'relative',
  },
  summaryBadge: {
    position: 'absolute',
    top: -11,
    left: 14,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  summaryBadgeText: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryValue: { fontSize: 13, letterSpacing: -0.2, textAlign: 'center', lineHeight: 18 },
  summaryArrow: { fontSize: 13, fontWeight: '800' },

  settingsHero: { gap: 6 },
  settingsKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.2,
  },
  settingsSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  settingsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  endAlarmTimeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },

  footer: { flexShrink: 0, gap: 4, paddingTop: 14 },
  footerOnboarding: {
    gap: 0,
    paddingTop: 18,
    alignItems: 'center',
  },
  primaryPress: {
    alignSelf: 'center',
    width: '78%',
    maxWidth: 280,
  },
  primaryShell: { alignSelf: 'stretch', width: '100%' },
  primaryFace: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 2,
  },
  primaryBtnTextOnboard: { fontSize: 15, letterSpacing: -0.2 },
  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800' },
  textBtn: { paddingVertical: 6, alignItems: 'center' },
  textBtnLabel: { fontSize: 14, fontWeight: '600' },
});
