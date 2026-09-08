import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { addDaysToLocalDateKey, parseHHmmToMinutes } from '@entities/day-plan';
import {
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { DigitalHhmmInput, type DigitalHhmmInputHandle } from '@shared/ui/digital-hhmm-input';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { DailyRhythmStyleAlarmRow, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import {
  formatDateKeyCompact,
  formatHhmmClock,
  splitDateKeyCompact,
  useTranslation,
} from '@shared/lib/i18n';
import { dailyRhythmOnboardingAssets } from '../lib/dailyRhythmOnboardingAssets';
import { isOvernightHhmmRange } from '../lib/dayPlanEditorShared';
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

function SolidShadowFace({
  borderColor: _borderColor,
  shadowColor,
  backgroundColor,
  style,
  shellStyle,
  children,
  shadowSize = SOLID_SHADOW_OFFSET,
}: {
  /** @deprecated 외곽선 없음 — API 호환용 */
  borderColor?: string;
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
        pointerEvents="none"
        style={[
          styles.shadowBlock,
          {
            backgroundColor: shadowColor,
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      <View style={[styles.shadowFace, { backgroundColor }, style]}>{children}</View>
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
  const { t, locale } = useTranslation();
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
          <Image
            source={thumb}
            style={styles.thumbImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
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
              {formatHhmmClock(valueHhmm, locale)}
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
            accessibilityLabel={t('dayPlan.timeConfirmA11y', { label })}
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
  endDateChoiceTodayLabel,
  endDateChoiceNextDayLabel,
  priorityPlanRangeLo,
  priorityPlanRangeHi,
  footerSlot,
}: DailyRhythmTimeEditorBodyProps) {
  const { t, locale } = useTranslation();
  const resolvedEndDateTodayLabel = endDateChoiceTodayLabel ?? t('dayRhythm.today');
  const resolvedEndDateNextDayLabel = endDateChoiceNextDayLabel ?? t('dayRhythm.nextDay');
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
      Alert.alert(t('alert.timeCheck.title'), t('alert.timeCheck.pickStartEnd'));
      return;
    }
    if (endDateTarget === 'today' && pe <= ps) {
      Alert.alert(
        t('alert.timeRange.title'),
        t('alert.timeRange.sameDayEndAfterStart'),
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

  const startDateParts = startDateKey ? splitDateKeyCompact(startDateKey, locale) : null;
  const endDateParts = endDateKey ? splitDateKeyCompact(endDateKey, locale) : null;

  const endDateTodayInvalid =
    endDateTarget === 'today' &&
    parseHHmmToMinutes(endHhmm) !== null &&
    parseHHmmToMinutes(startHhmm) !== null &&
    Number(parseHHmmToMinutes(endHhmm)) <= Number(parseHHmmToMinutes(startHhmm));

  const rangeSummaryParts = useMemo(() => {
    const startLabel = formatHhmmClock(startHhmm, locale);
    const endLabel = formatHhmmClock(endHhmm, locale);
    if (!priorityPlanRangeLo) {
      return {
        left: startLabel,
        right: endDateTarget === 'nextDay' ? `${endLabel}${t('dayRhythm.nextDaySuffix')}` : endLabel,
      };
    }
    const startDate = formatDateKeyCompact(priorityPlanRangeLo, locale);
    const endDate =
      endDateTarget === 'nextDay'
        ? formatDateKeyCompact(addDaysToLocalDateKey(priorityPlanRangeLo, 1), locale)
        : startDate;
    if (endDate === startDate) {
      return { left: `${startDate} ${startLabel}`, right: endLabel };
    }
    return { left: `${startDate} ${startLabel}`, right: `${endDate} ${endLabel}` };
  }, [endDateTarget, endHhmm, locale, priorityPlanRangeLo, startHhmm, t]);

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
    <CityPopCardShell
      isDark={isDark}
      faceColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
      contentStyle={styles.settingsCard}>
      <SnappedTimePickerField
        label={t('dayRhythm.dayStart')}
        hint={t('dayRhythm.dayStartHint')}
        valueHhmm={startHhmm}
        onChangeHhmm={setStartHhmmWithSync}
        expanded={pickerTarget === 'start'}
        onToggleExpand={() => setPickerTarget((t) => (t === 'start' ? null : 'start'))}
        isDark={isDark}
        palette={timePickerPalette}
        snapStepMinutes={1}
        dateCaption={startDateKey ? formatDateKeyCompact(startDateKey, locale) : undefined}
      />
      <View style={[styles.divider, { backgroundColor: c.border }]} />
      <SnappedTimePickerField
        label={t('dayRhythm.dayEnd')}
        hint={t('dayRhythm.dayEndHint')}
        valueHhmm={endHhmm}
        onChangeHhmm={setEndHhmmWithChoiceCheck}
        expanded={pickerTarget === 'end'}
        onToggleExpand={() => setPickerTarget((t) => (t === 'end' ? null : 'end'))}
        isDark={isDark}
        palette={timePickerPalette}
        snapStepMinutes={1}
        mapMidnightToEndOfDay
        dateCaption={endDateKey ? formatDateKeyCompact(endDateKey, locale) : undefined}
      />
      {onEndDateChoice ? (
        <View style={styles.endDateChoiceInline}>
          <ThemedText
            style={[styles.endDateChoiceQuestion, { color: c.onVariant }]}
            lightColor={c.onVariant}
            darkColor={c.onVariant}>
            {t('dayRhythm.endDateQuestion')}
          </ThemedText>
          <View style={styles.endDateChoiceBtnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dayRhythm.setTodayA11y')}
              onPress={() => {
                applyEndDateTarget('today', startHhmm, endHhmm, true);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.dayChoicePress,
                pressed && { opacity: 0.92 },
              ]}>
              <SolidShadowFace
                shadowColor={shadowInk}
                backgroundColor={
                  endDateTarget === 'today' ? ink.bgMint : isDark ? ink.surfaceAlt : '#FFFFFF'
                }
                shadowSize={endDateTarget === 'today' ? 4 : 2}
                shellStyle={styles.dayChoiceShell}
                style={styles.dayChoiceFace}>
                <ThemedText
                  style={[
                    styles.endDateChoiceBtnText,
                    {
                      color:
                        endDateTarget === 'today'
                          ? isDark
                            ? ink.text
                            : ink.tertiary
                          : c.onVariant,
                    },
                  ]}>
                  {resolvedEndDateTodayLabel}
                </ThemedText>
              </SolidShadowFace>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dayRhythm.setNextDayA11y')}
              onPress={() => {
                applyEndDateTarget('nextDay', startHhmm, endHhmm, true);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.dayChoicePress,
                pressed && { opacity: 0.92 },
              ]}>
              <SolidShadowFace
                shadowColor={shadowInk}
                backgroundColor={
                  endDateTarget === 'nextDay' ? ink.bgMint : isDark ? ink.surfaceAlt : '#FFFFFF'
                }
                shadowSize={endDateTarget === 'nextDay' ? 4 : 2}
                shellStyle={styles.dayChoiceShell}
                style={styles.dayChoiceFace}>
                <ThemedText
                  style={[
                    styles.endDateChoiceBtnText,
                    {
                      color:
                        endDateTarget === 'nextDay'
                          ? isDark
                            ? ink.text
                            : ink.tertiary
                          : c.onVariant,
                    },
                  ]}>
                  {resolvedEndDateNextDayLabel}
                </ThemedText>
              </SolidShadowFace>
            </Pressable>
          </View>
        </View>
      ) : null}
    </CityPopCardShell>
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
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
              accessibilityLabel={t('dayRhythm.morningIllustrationA11y')}
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
                  {([t('dayRhythm.heroWord1'), t('dayRhythm.heroWord2'), t('dayRhythm.heroWord3')] as const).map((word) => (
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
                  {t('dayRhythm.onboardTitle')}
                </ThemedText>
                <ThemedText
                  style={[styles.onboardSubtitle, { color: c.onVariant }, cityPopFont('500')]}
                  lightColor={c.onVariant}
                  darkColor={c.onVariant}>
                  {t('dayRhythm.onboardSubtitle')}
                </ThemedText>
              </View>
            </View>
          </SolidShadowFace>
        ) : (
          <View style={styles.settingsHero}>
            <ThemedText style={[styles.settingsKicker, { color: c.onVariant }]}>{t('dayRhythm.settingsKicker')}</ThemedText>
            <ThemedText style={[styles.settingsSubtitle, { color: c.onVariant }]}>
              {t('dayRhythm.settingsSubtitle')}
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
              label={t('dayRhythm.dayStart')}
              hint={t('dayRhythm.dayStartHint')}
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
              label={t('dayRhythm.dayEnd')}
              hint={t('dayRhythm.dayEndHint')}
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
                  {t('dayRhythm.endDateQuestion')}
                </ThemedText>
                <View style={styles.endDateChoiceBtnRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('dayRhythm.setTodayA11y')}
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
                        {resolvedEndDateTodayLabel}
                      </ThemedText>
                    </SolidShadowFace>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('dayRhythm.setNextDayA11y')}
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
                        {resolvedEndDateNextDayLabel}
                      </ThemedText>
                    </SolidShadowFace>
                  </Pressable>
                </View>
                {endDateTodayInvalid ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {t('dayRhythm.endDateInvalidHint', {
                      end: formatHhmmClock(endHhmm, locale),
                      start: formatHhmmClock(startHhmm, locale),
                    })}
                  </ThemedText>
                ) : isOvernightHhmmRange(startHhmm, endHhmm) && endDateTarget === 'nextDay' ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {t('dayRhythm.overnightHint')}
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
                  {t('dayRhythm.myDaySummary')}
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
          <CityPopCardShell
            isDark={isDark}
            faceColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
            contentStyle={styles.settingsCard}>
            <DailyRhythmStyleAlarmRow
              title={t('dayRhythm.dayStartAlarmTitle')}
              hint={t('dayRhythm.dayStartAlarmHint')}
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
                  title={t('dayRhythm.dayEndAlarmTitle')}
                  hint={t('dayRhythm.dayEndAlarmHint')}
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
                      },
                    ]}>
                    <SnappedTimePickerField
                      label={t('dayRhythm.reminderTimeLabel')}
                      hint={t('dayRhythm.reminderTimeHint')}
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
          </CityPopCardShell>
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
            <BrutalConfirmButton
              label={primaryLabel}
              accessibilityLabel={primaryLabel}
              onPress={validateAndPrimary}
              align="stretch"
            />

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
    borderWidth: 0,
  },
  shadowFace: {
    borderWidth: 0,
    overflow: 'hidden',
    zIndex: 1,
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
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    position: 'relative',
  },
  summaryBadge: {
    position: 'absolute',
    top: -11,
    left: 14,
    borderWidth: 0,
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
    borderWidth: 0,
    padding: 12,
    gap: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  endAlarmTimeCard: {
    borderWidth: 0,
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
  textBtn: { paddingVertical: 6, alignItems: 'center' },
  textBtnLabel: { fontSize: 14, fontWeight: '600' },
});
