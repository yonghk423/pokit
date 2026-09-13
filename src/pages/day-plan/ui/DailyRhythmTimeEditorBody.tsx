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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { addDaysToLocalDateKey, parseHHmmToMinutes } from '@entities/day-plan';
import {
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { DigitalHhmmInput, type DigitalHhmmInputHandle } from '@shared/ui/digital-hhmm-input';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { SmoothSegmentedControl } from '@shared/ui/smooth-segmented-control';
import { ScrapTapeLabel } from '@shared/ui/scrap-tape-label';
import { RoutineMarginSlideshow } from '@shared/ui/routine-atmosphere';
import { ThemedText } from '@shared/ui/themed-text';
import { DayCycleDial, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import {
  formatDateKeyCompact,
  formatHhmmClock,
  splitDateKeyCompact,
  useTranslation,
} from '@shared/lib/i18n';
import { useMeasuredAccordion } from '@shared/lib/hooks';
import { dailyRhythmOnboardingAssets } from '../lib/dailyRhythmOnboardingAssets';
import { isOvernightHhmmRange, isInvalidSameDayEnd, endsOnNextCalendarDay } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

type PickerTarget = 'start' | 'end' | null;

const HERO_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const HERO_RISE_PX = 10;
const HERO_FADE_MS = 560;
const BREATHE_MS = 2600;

/** opacity + 살짝 상승 — entering layout 애니보다 부드럽게 */
function SmoothFadeRise({
  delayMs,
  style,
  children,
}: {
  delayMs: number;
  style?: object;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: HERO_FADE_MS, easing: HERO_EASE }),
    );
  }, [delayMs, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * HERO_RISE_PX }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

/** 등장 후 계속 — 아주 약한 opacity·상하 호흡 (스케일 바운스 없음) */
function SoftBreathe({
  delayMs = 0,
  amplitudePx = 2.5,
  opacityMin = 0.82,
  style,
  children,
}: {
  delayMs?: number;
  amplitudePx?: number;
  opacityMin?: number;
  style?: object;
  children: ReactNode;
}) {
  const wave = useSharedValue(0);

  useEffect(() => {
    wave.value = 0;
    wave.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: BREATHE_MS, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delayMs, wave]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacityMin + wave.value * (1 - opacityMin),
    transform: [{ translateY: -wave.value * amplitudePx }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

/** 편집을 마친 순간 요약을 도장처럼 짧게 강조해 최종 확인을 유도한다. */
function FinalReviewCue({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    scale.value = 0.96;
    lift.value = 8;
    tilt.value = -1.2;
    scale.value = withSequence(
      withTiming(1.035, { duration: 180, easing: HERO_EASE }),
      withTiming(0.99, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
    );
    lift.value = withTiming(0, { duration: 220, easing: HERO_EASE });
    tilt.value = withSequence(
      withTiming(0.8, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 190, easing: Easing.out(Easing.quad) }),
    );
  }, [active, lift, scale, tilt]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value },
      { scale: scale.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

/** 온보딩 히어로 카피 — 킥커 → 제목 단어 → 서브 등장 후, 제목·서브는 부드럽게 루프 */
function OnboardingHeroCopy({
  kickerWords,
  title,
  subtitle,
  titleColor,
  mutedColor,
}: {
  kickerWords: readonly string[];
  title: string;
  subtitle: string;
  titleColor: string;
  mutedColor: string;
}) {
  const titleParts = useMemo(() => {
    const tokens = title.trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 ? tokens : [title];
  }, [title]);

  const kickerStart = 40;
  const kickerStep = 70;
  const titleStart = kickerStart + kickerWords.length * kickerStep + 40;
  const titleStep = 85;
  const subtitleDelay = titleStart + titleParts.length * titleStep + 80;
  const titleBreatheDelay = titleStart + Math.max(0, titleParts.length - 1) * titleStep + HERO_FADE_MS;
  const subtitleBreatheDelay = subtitleDelay + HERO_FADE_MS;

  return (
    <View style={styles.onboardHeroCopy}>
      <View style={styles.kickerRow}>
        {kickerWords.map((word, i) => (
          <SmoothFadeRise key={`${word}-${i}`} delayMs={kickerStart + i * kickerStep}>
            <ThemedText
              style={[styles.kickerWord, { color: mutedColor }, cityPopFont('700')]}
              lightColor={mutedColor}
              darkColor={mutedColor}>
              {word}
            </ThemedText>
          </SmoothFadeRise>
        ))}
      </View>

      <SoftBreathe delayMs={titleBreatheDelay} amplitudePx={2.5} opacityMin={0.84}>
        <View
          style={styles.onboardTitleWrap}
          accessible
          accessibilityRole="header"
          accessibilityLabel={title}>
          <View style={styles.onboardTitleRow} accessibilityElementsHidden>
            {titleParts.map((part, i) => (
              <SmoothFadeRise key={`${part}-${i}`} delayMs={titleStart + i * titleStep}>
                <ThemedText
                  style={[styles.onboardTitle, { color: titleColor }, cityPopFont('800')]}
                  lightColor={titleColor}
                  darkColor={titleColor}>
                  {part}
                  {i < titleParts.length - 1 ? ' ' : ''}
                </ThemedText>
              </SmoothFadeRise>
            ))}
          </View>
        </View>
      </SoftBreathe>

      <SoftBreathe delayMs={subtitleBreatheDelay} amplitudePx={2} opacityMin={0.8}>
        <SmoothFadeRise delayMs={subtitleDelay}>
          <ThemedText
            style={[styles.onboardSubtitle, { color: titleColor }, cityPopFont('800')]}
            lightColor={titleColor}
            darkColor={titleColor}>
            {subtitle}
          </ThemedText>
        </SmoothFadeRise>
      </SoftBreathe>
    </View>
  );
}

function initialEndDateTargetFromRange(rangeLo?: string, rangeHi?: string): 'today' | 'nextDay' {
  if (rangeLo && rangeHi && rangeHi > rangeLo) return 'nextDay';
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
  const dateCaption =
    dateParts != null ? `${dateParts.month} ${dateParts.day}`.replace(/\s+/g, ' ').trim() : null;
  const accordion = useMeasuredAccordion(expanded);
  const pillBg = isDark ? ink.surfaceAlt : ink.bg;
  const pillFg = c.onSurface;

  return (
    <View style={styles.onboardTimeBlock}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [
          styles.onboardTimeRow,
          pressed && { transform: [{ translateY: 1 }] },
        ]}>
        <SolidShadowFace
          borderColor={c.border}
          shadowColor={isDark ? ink.solidShadow : '#000000'}
          backgroundColor={isDark ? ink.surfaceAlt : '#FFFFFF'}
          shadowSize={2}
          style={styles.thumbFace}
          shellStyle={styles.thumbShell}>
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
          {dateCaption ? (
            <ThemedText
              style={[styles.dateInline, { color: c.onVariant }, cityPopFont('700')]}
              lightColor={c.onVariant}
              darkColor={c.onVariant}
              numberOfLines={1}>
              {dateCaption}
            </ThemedText>
          ) : null}
          <SolidShadowFace
            borderColor={c.border}
            shadowColor={isDark ? ink.solidShadow : '#000000'}
            backgroundColor={pillBg}
            shadowSize={expanded ? 0 : 2}
            style={styles.timePillFace}>
            <ThemedText
              style={[styles.timePillText, { color: pillFg }, cityPopFont('800')]}
              lightColor={pillFg}
              darkColor={pillFg}>
              {formatHhmmClock(valueHhmm, locale)}
            </ThemedText>
          </SolidShadowFace>
        </View>
      </Pressable>

      {accordion.mounted ? (
        <Animated.View style={[styles.inputBlockPanel, accordion.panelStyle]}>
          <View
            style={styles.inputBlock}
            onLayout={(e) => accordion.onContentLayout(e.nativeEvent.layout.height)}>
            <DigitalHhmmInput
              ref={digitalRef}
              valueHhmm={valueHhmm}
              onChangeHhmm={onChangeHhmm}
              ink={c.onSurface}
              muted={c.onVariant}
              line={c.border}
              surface={isDark ? ink.surfaceAlt : ink.bg}
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
        </Animated.View>
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
  /** 온보딩 히어로·슬라이드쇼 숨김 — 다이얼+시간 행만 (오늘 탭 시간 시트 등) */
  hideOnboardingHero?: boolean;
  primaryLabel: string;
  onPrimaryPress: (startHhmm: string, endHhmm: string) => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
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
  hideOnboardingHero = false,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
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
  const [endDateTarget, setEndDateTarget] = useState<'today' | 'nextDay'>(() =>
    initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi),
  );
  const endDateTargetRef = useRef<'today' | 'nextDay'>(
    initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi),
  );

  const ink = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const isOnboarding = variant === 'onboarding';
  const showOnboardingHero = isOnboarding && !hideOnboardingHero;
  const shadowInk = isDark ? ink.solidShadow : '#000000';

  useEffect(() => {
    endDateTargetRef.current = endDateTarget;
  }, [endDateTarget]);

  useEffect(() => {
    setStartHhmm(seedStart);
    setEndHhmm(seedEnd);
    setPickerTarget(null);
    // 당일/다음 날은 사용자가 직접 고른 값만 쓴다. 시각으로 자동 추론하지 않음.
    const initial = initialEndDateTargetFromRange(priorityPlanRangeLo, priorityPlanRangeHi);
    endDateTargetRef.current = initial;
    setEndDateTarget(initial);
  }, [seedKey, seedStart, seedEnd, priorityPlanRangeLo, priorityPlanRangeHi]);

  const applyEndDateTarget = useCallback(
    (target: 'today' | 'nextDay', start: string, end: string) => {
      endDateTargetRef.current = target;
      setEndDateTarget(target);
      onEndDateChoice?.(start, end, target);
    },
    [onEndDateChoice],
  );

  /** 시각만 갱신 — 당일/다음 날 선택은 그대로 유지 */
  const syncTimesKeepingEndDate = useCallback(
    (start: string, end: string) => {
      onEndDateChoice?.(start, end, endDateTargetRef.current);
    },
    [onEndDateChoice],
  );

  const setStartHhmmWithSync = useCallback(
    (nextStart: string) => {
      setStartHhmm(nextStart);
      syncTimesKeepingEndDate(nextStart, endHhmm);
    },
    [endHhmm, syncTimesKeepingEndDate],
  );

  const setEndHhmmWithChoiceCheck = useCallback(
    (nextEnd: string) => {
      setEndHhmm(nextEnd);
      syncTimesKeepingEndDate(startHhmm, nextEnd);
    },
    [startHhmm, syncTimesKeepingEndDate],
  );

  /** 다이얼 onChange — 인라인 람다는 드래그 중 제스처 재생성·크래시 유발 가능 */
  const onDialChange = useCallback(
    (nextStart: string, nextEnd: string, endNextDay: boolean) => {
      setStartHhmm(nextStart);
      setEndHhmm(nextEnd);
      applyEndDateTarget(endNextDay ? 'nextDay' : 'today', nextStart, nextEnd);
    },
    [applyEndDateTarget],
  );

  const [dialDragging, setDialDragging] = useState(false);
  const onDialInteractionChange = useCallback((active: boolean) => {
    setDialDragging(active);
  }, []);

  const validateAndPrimary = useCallback(() => {
    const ps = parseHHmmToMinutes(startHhmm);
    const pe = parseHHmmToMinutes(endHhmm);
    if (ps === null || pe === null) {
      Alert.alert(t('alert.timeCheck.title'), t('alert.timeCheck.pickStartEnd'));
      return;
    }
    // 당일 + 자정(24:00/00:00) 또는 시작 이후가 아니면 통과 금지
    // (이전에는 24:00이 수치상 통과한 뒤 표시만 다음 날로 바뀌어 혼란을 줌)
    if (endDateTarget === 'today' && isInvalidSameDayEnd(startHhmm, endHhmm)) {
      Alert.alert(
        t('alert.timeRange.title'),
        pe === 24 * 60 || pe === 0
          ? t('alert.timeRange.sameDayMidnightNeedsNextDay')
          : t('alert.timeRange.sameDayEndAfterStart'),
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEndDateChoice?.(startHhmm, endHhmm, endDateTarget);
    onPrimaryPress(startHhmm, endHhmm);
  }, [endDateTarget, endHhmm, onEndDateChoice, onPrimaryPress, startHhmm, t]);

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
    if (endsOnNextCalendarDay(startHhmm, endHhmm)) {
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
    endDateTarget === 'today' && isInvalidSameDayEnd(startHhmm, endHhmm);

  const endDateSegmentControl = (
    <SmoothSegmentedControl
      options={[
        {
          value: 'today',
          label: resolvedEndDateTodayLabel,
          accessibilityLabel: t('dayRhythm.setTodayA11y'),
        },
        {
          value: 'nextDay',
          label: resolvedEndDateNextDayLabel,
          accessibilityLabel: t('dayRhythm.setNextDayA11y'),
        },
      ]}
      value={endDateTarget}
      onChange={(next) => applyEndDateTarget(next, startHhmm, endHhmm)}
      selectedFill={ink.bgMint}
      trackFill={isDark ? ink.surfaceAlt : '#FFFFFF'}
      selectedInk={isDark ? ink.text : ink.tertiary}
      unselectedInk={c.onVariant}
      shadowColor={shadowInk}
      minHeight={36}
    />
  );

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
      return { left: `${startDate}\n${startLabel}`, right: endLabel };
    }
    return { left: `${startDate}\n${startLabel}`, right: `${endDate}\n${endLabel}` };
  }, [endDateTarget, endHhmm, locale, priorityPlanRangeLo, startHhmm, t]);

  const timePickerPalette = useMemo(
    () => ({
      onSurface: c.onSurface,
      onVariant: c.onVariant,
      border: c.border,
      containerLowest: isDark ? ink.surfaceAlt : ink.bg,
    }),
    [c, ink.bg, ink.surfaceAlt, isDark],
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
          <View style={styles.endDateChoiceBtnRow}>{endDateSegmentControl}</View>
          {endDateTodayInvalid ? (
            <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
              {parseHHmmToMinutes(endHhmm) === 24 * 60 || parseHHmmToMinutes(endHhmm) === 0
                ? t('dayRhythm.endDateMidnightHint')
                : t('dayRhythm.endDateInvalidHint', {
                    end: formatHhmmClock(endHhmm, locale),
                    start: formatHhmmClock(startHhmm, locale),
                  })}
            </ThemedText>
          ) : isOvernightHhmmRange(startHhmm, endHhmm) && endDateTarget === 'nextDay' ? (
            <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
              {t('dayRhythm.overnightHint')}
            </ThemedText>
          ) : endsOnNextCalendarDay(startHhmm, endHhmm) && endDateTarget === 'nextDay' ? (
            <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
              {t('dayRhythm.midnightNextDayHint')}
            </ThemedText>
          ) : null}
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
      scrollEnabled={!dialDragging}>
      <View style={[styles.topBlock, isOnboarding && styles.topBlockOnboarding]}>
        {showOnboardingHero ? (
          <View style={styles.onboardHeroCompact}>
            <View style={styles.onboardHeroTopRow}>
              <RoutineMarginSlideshow
                isDark={isDark}
                blendColor={ink.bg}
                width={120}
                height={128}
                style={styles.onboardHeroArt}
              />
              <View style={styles.onboardHeroCopyCol}>
                <OnboardingHeroCopy
                  kickerWords={[
                    t('dayRhythm.heroWord1'),
                    t('dayRhythm.heroWord2'),
                    t('dayRhythm.heroWord3'),
                  ]}
                  title={t('dayRhythm.onboardTitle')}
                  subtitle={t('dayRhythm.onboardSubtitle')}
                  titleColor={c.onSurface}
                  mutedColor={c.onVariant}
                />
              </View>
            </View>

            <View style={styles.onboardDialEnter}>
              <DayCycleDial
                startHhmm={startHhmm}
                endHhmm={endHhmm}
                endNextDay={endDateTarget === 'nextDay'}
                baseDateKey={priorityPlanRangeLo}
                isDark={isDark}
                onChange={onDialChange}
                onInteractionChange={onDialInteractionChange}
              />
            </View>
          </View>
        ) : isOnboarding ? (
          <View style={styles.onboardDialEnter}>
            <DayCycleDial
              startHhmm={startHhmm}
              endHhmm={endHhmm}
              endNextDay={endDateTarget === 'nextDay'}
              baseDateKey={priorityPlanRangeLo}
              isDark={isDark}
              onChange={onDialChange}
              onInteractionChange={onDialInteractionChange}
            />
          </View>
        ) : (
          <View style={styles.settingsHero}>
            <ThemedText style={[styles.settingsKicker, { color: c.onVariant }]}>{t('dayRhythm.settingsKicker')}</ThemedText>
            <ThemedText style={[styles.settingsSubtitle, { color: c.onVariant }]}>
              {t('dayRhythm.settingsSubtitle')}
            </ThemedText>
          </View>
        )}

        {isOnboarding ? (
          <View style={styles.onboardCardStack}>
            <View pointerEvents="none" style={styles.onboardEditTapeRow}>
              <ScrapTapeLabel
                text={t('dayRhythm.editTapTape')}
                isDark={isDark}
                rotateDeg={0}
                style={styles.onboardEditTape}
              />
            </View>
            <SolidShadowFace
              borderColor={c.border}
              shadowColor={shadowInk}
              backgroundColor={isDark ? ink.surfaceAlt : ink.bg}
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
                <View style={styles.endDateChoiceBtnRow}>{endDateSegmentControl}</View>
                {endDateTodayInvalid ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {parseHHmmToMinutes(endHhmm) === 24 * 60 ||
                    parseHHmmToMinutes(endHhmm) === 0
                      ? t('dayRhythm.endDateMidnightHint')
                      : t('dayRhythm.endDateInvalidHint', {
                          end: formatHhmmClock(endHhmm, locale),
                          start: formatHhmmClock(startHhmm, locale),
                        })}
                  </ThemedText>
                ) : isOvernightHhmmRange(startHhmm, endHhmm) && endDateTarget === 'nextDay' ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {t('dayRhythm.overnightHint')}
                  </ThemedText>
                ) : endsOnNextCalendarDay(startHhmm, endHhmm) &&
                  endDateTarget === 'nextDay' ? (
                  <ThemedText style={[styles.endDateChoiceHint, { color: c.onVariant }]}>
                    {t('dayRhythm.midnightNextDayHint')}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            <FinalReviewCue active={pickerTarget === null && !dialDragging}>
              <View style={styles.summaryBox}>
                <View
                  style={[
                    styles.summaryBadge,
                    {
                      backgroundColor: isDark ? 'rgba(255, 236, 179, 0.92)' : '#FFE8A8',
                      borderColor: '#111111',
                    },
                  ]}>
                  <ThemedText
                    style={[styles.summaryBadgeText, { color: '#111111' }, cityPopFont('800')]}>
                    {t('dayRhythm.myDaySummary')}
                  </ThemedText>
                </View>
                <View style={styles.summarySplit}>
                  <View
                    style={[
                      styles.summaryHalf,
                      { backgroundColor: isDark ? ink.surfaceAlt : ink.bg },
                    ]}>
                    <ThemedText
                      style={[styles.summaryValue, { color: c.onSurface }, cityPopFont('800')]}
                      numberOfLines={2}>
                      {rangeSummaryParts.left}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[styles.summaryWave, { color: c.onVariant }, cityPopFont('800')]}
                    lightColor={c.onVariant}
                    darkColor={c.onVariant}>
                    ~
                  </ThemedText>
                  <View
                    style={[
                      styles.summaryHalf,
                      { backgroundColor: isDark ? ink.surfaceAlt : ink.bg },
                    ]}>
                    <ThemedText
                      style={[styles.summaryValue, { color: c.onSurface }, cityPopFont('800')]}
                      numberOfLines={2}>
                      {rangeSummaryParts.right}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </FinalReviewCue>
          </SolidShadowFace>
          </View>
        ) : (
          settingsTimeCard
        )}

        {footerSlot}
      </View>

      <View style={[styles.footer, isOnboarding && styles.footerOnboarding]}>
        {isOnboarding ? (
          <>
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
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 20,
  },
  scrollContentSettings: {
    paddingTop: 0,
    paddingBottom: 4,
  },
  topBlock: { gap: 16, paddingBottom: 4 },
  topBlockOnboarding: { gap: 10 },
  onboardHeroCompact: { gap: 4 },
  onboardHeroTopRow: {
    position: 'relative',
    minHeight: 96,
  },
  onboardHeroCopyCol: {
    zIndex: 2,
    paddingRight: 72,
  },
  onboardHeroArt: {
    position: 'absolute',
    right: -10,
    top: -4,
    zIndex: 0,
  },
  onboardHeroCopy: { gap: 6 },
  onboardDialEnter: { width: '100%', marginTop: 0 },
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
  kickerRow: { flexDirection: 'row', gap: 18, paddingTop: 0 },
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
  onboardTitleWrap: {
    alignSelf: 'flex-start',
  },
  onboardTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  onboardTitle: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  onboardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  mainCardFace: {
    padding: 22,
    gap: 18,
  },
  onboardCardStack: {
    width: '100%',
    overflow: 'visible',
  },
  onboardEditTapeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 4,
    marginBottom: -10,
    zIndex: 8,
  },
  onboardEditTape: {
    maxWidth: 200,
    alignSelf: 'flex-end',
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
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -6,
  },
  thumbShell: {
    flexShrink: 0,
  },
  thumbFace: {
    width: 48,
    height: 48,
    borderRadius: 2,
    flexShrink: 0,
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
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dateStack: { alignItems: 'flex-end' },
  dateStackLine: { fontSize: 11, lineHeight: 14, textAlign: 'right' },
  dateInline: { fontSize: 11, lineHeight: 14, textAlign: 'right', marginBottom: 2 },
  timePillFace: {
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillText: { fontSize: 15, letterSpacing: -0.2 },
  inputBlockPanel: {
    overflow: 'hidden',
  },
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
  endDateChoiceBtnRow: { alignSelf: 'stretch' },
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
    marginTop: 10,
    position: 'relative',
  },
  summaryBadge: {
    position: 'absolute',
    top: -16,
    right: 14,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1.5,
  },
  summaryBadgeText: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  summarySplit: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    overflow: 'hidden',
  },
  summaryWave: {
    fontSize: 18,
    lineHeight: 20,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  summaryHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 22,
    paddingBottom: 6,
  },
  summaryValue: { fontSize: 16, letterSpacing: -0.2, textAlign: 'center', lineHeight: 24 },

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
