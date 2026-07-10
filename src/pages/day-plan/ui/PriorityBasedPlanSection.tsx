// @ts-nocheck — RN Web에서 StyleSheet.create 타입이 TextStyle|ViewStyle로 합쳐져 Reanimated·제스처와 충돌함
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Reanimated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  blockMatchesPriorityHhmmWindow,
  buildSpineTimelineModel,
  clampSpineBlockToPriorityWindow,
  filterBagTimelineFlowBlocks,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  getFlowCompletionCategoryKeysForBlock,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  localDateToDateKey,
  parseHHmmToMinutes,
  parseLocalDateKeyToDate,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  resolveSpinePriorityWindow,
  sortDayPlanBlocks,
  buildPrioritySectionCompletionKey,
  parsePrioritySectionCompletionKey,
  resolveCategoryImportance,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
  useDayPlanStore
} from '@entities/day-plan';
import { appendPriorityCategoryKeysIfMissing, useFixedFlowSetsStore } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendRoutineCatalogSelectionKeys,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
  loadRoutineCatalogSelectionKeys,
  removeRoutineCatalogSelectionKey,
  saveRoutineCatalogSelectionKeys,
  type CategoryMealSlotOverride,
  type DayMealSlot,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { COMPLETION_TOGGLE_ANIM_MS } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { PriorityOrderRow } from '@widgets/day-plan-priority-order';
import { SpineBlockEditSheet, type SpineBlockEditDraft } from './SpineBlockEditSheet';
import { SpineTimelineView } from '@widgets/day-plan-spine-timeline';
import { MealSlotScheduleEditButton, MealSlotTimelineView } from '@widgets/day-plan-meal-slot-timeline';
import { buildAddablePriorityCatalogSections } from '../lib/priorityCatalog';
import {
  formatDateKeyCompactKo,
  formatDateKeyDisplayKo,
  formatEndHhmmFrom12hParts,
  formatMinutesToHHmm,
  getPickerCategoryItem,
  getPickerCategoryLabel,
  isOvernightHhmmRange,
  PICKER_CATEGORIES,
  planDayIntroFromRange,
  PRIMARY,
  priorityClockCaptionDateKeyEnd,
  priorityClockCaptionDateKeyStart,
  sortedPlanDateRange,
  toggleEndMeridiemHhmm,
} from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { buildCategoryMealSlotOverrides, clampMealSlotSectionsToWindow, flattenPriorityMealSlotSectionEntries, hasExplicitMealSlotAssignments, reorderFlatKeys, reorderMealSlotSectionEntries, resolvePriorityMealSlot, splitPriorityMealSlotSections } from '../lib/priorityMealSlotSections';
import { DAY_MEAL_SLOT_LABEL } from '../lib/priorityMealSlotSections';
import { useDayMealSlotSchedule } from '../lib/useDayMealSlotSchedule';
import { DayMealSlotScheduleSheet } from './DayMealSlotScheduleSheet';
import { PriorityMealSlotAddRoutineRow } from './PriorityMealSlotAddRoutineRow';
import { PriorityMealSlotSectionHeader } from './PriorityMealSlotSectionHeader';
import {
  PriorityRoutinePickerSheet,
  type RoutinePickerConfirmItem,
} from './PriorityRoutinePickerSheet';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';

/** 우선순위 행 완료 제거 시: 페이드 아웃 + 아래 행이 부드럽게 올라오는 레이아웃 전환 */
const PRIORITY_ROW_EXITING = FadeOut.duration(280).easing(Easing.out(Easing.cubic));
const PRIORITY_ROW_LAYOUT = LinearTransition.duration(320).easing(Easing.out(Easing.cubic));

function partitionDisplayWithDeferredBottom<T>(
  items: T[],
  resolveKey: (item: T) => string,
  isDone: (item: T) => boolean,
  deferredKeys: ReadonlySet<string>,
): T[] {
  const active: T[] = [];
  const done: T[] = [];
  for (const item of items) {
    const key = resolveKey(item);
    if (!isDone(item) || deferredKeys.has(key)) {
      active.push(item);
    } else {
      done.push(item);
    }
  }
  return [...active, ...done];
}

import type { CustomCatalogGroup, CustomFlowCatalogEntry } from '@shared/lib/storage';
import { useDayPlanDraftStore } from '@entities/day-plan';
import { DAY_PLAN_TAB_BAR_ROW_HEIGHT } from './DayPlanCustomTabBar';

/** 타임라인 내부 스크롤 하단 — 리스트와 카드 둥근 하단 사이 최소만 */
const TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM = 8;

type FlipClockPalette = {
  cardBg: string;
  border: string;
  text: string;
  ampm: string;
  hinge: string;
};

function flipClockPalette(isDark: boolean): FlipClockPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    cardBg: '#09090b',
    border: c.border,
    text: '#a1a1aa',
    ampm: 'rgba(161, 161, 170, 0.8)',
    hinge: '#000000',
  };
}

/** TextInput이 밑줄·테두리로 ‘가운데 선’처럼 보이지 않게 */
const digitInputNoArtifact = {
  borderWidth: 0,
  backgroundColor: 'transparent',
  underlineColorAndroid: 'transparent',
  ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
};

/** 24h(0–23) → 12h 표시용 (오전/오후) */
function h24To12(h24: number): { ap: '오전' | '오후'; h12: number } {
  const ap: '오전' | '오후' = h24 >= 12 ? '오후' : '오전';
  const mod = h24 % 12;
  const h12 = mod === 0 ? 12 : mod;
  return { ap, h12 };
}

function from12hPartsToTotal(h12: number, min: number, ap: '오전' | '오후'): number {
  const m = Math.max(0, Math.min(59, min));
  let h24: number;
  if (h12 === 12) {
    h24 = ap === '오전' ? 0 : 12;
  } else {
    h24 = ap === '오후' ? h12 + 12 : h12;
  }
  return h24 * 60 + m;
}

function toMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAY_SHORT_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function weekdayShortKoFromDateKey(dk: string): string {
  const d = parseLocalDateKeyToDate(dk);
  if (!d) return '';
  return WEEKDAY_SHORT_KO[d.getDay()];
}

const WEEKDAY_LONG_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const;

/** 카드 헤더 — 모의안 `Monday, 5th April` 대응: `월요일, 4월 18일` */
function formatTimelineHeaderDateKo(dateKey: string): string {
  const d = parseLocalDateKeyToDate(dateKey);
  if (!d) return formatDateKeyDisplayKo(dateKey);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  const mo = m ? parseInt(m[2], 10) : d.getMonth() + 1;
  const day = m ? parseInt(m[3], 10) : d.getDate();
  return `${WEEKDAY_LONG_KO[d.getDay()]}, ${mo}월 ${day}일`;
}

/** 우선 순위 집중 구간 한 줄 (시계 모달과 동일 기준) */
function formatPriorityWindowLine(start: string, end: string): string {
  const overnight = isOvernightHhmmRange(start, end);
  const ps = parseHHmmToMinutes(start.trim());
  const pe = parseHHmmToMinutes(end.trim());
  if (ps === null || pe === null) return '';
  const eStr = pe === 24 * 60 ? '24:00(자정)' : formatMinuteOfDayKo(pe);
  if (overnight) {
    return `${formatMinuteOfDayKo(ps)} — 다음날 ${eStr}`;
  }
  return `${formatMinuteOfDayKo(ps)} — ${eStr}`;
}

/** 자정 넘김 ‘종료일’ 열 — 이날 새벽에 끝나는 시각만 강조(다음날 문구 없이) */
function formatOvernightTailEndHeadline(end: string): string {
  const pe = parseHHmmToMinutes(end.trim());
  if (pe === null) return '';
  if (pe === 24 * 60) {
    return '자정(24:00)';
  }
  return formatMinuteOfDayKo(pe);
}

/** 타임라인 헤더 — 집중 구간 시각(탭 시 모달) */
function PriorityWindowTimeChip({
  line,
  ink,
  muted,
  chipBg,
  chipBgPressed,
  onPress,
}: {
  line: string;
  ink: string;
  muted: string;
  chipBg: string;
  chipBgPressed: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`집중 구간 시간 설정, 현재 ${line}`}
      accessibilityHint="탭하면 집중 구간 시간을 변경할 수 있어요"
      style={({ pressed }) => [
        styles.priorityTimelineTimeChip,
        { backgroundColor: pressed ? chipBgPressed : chipBg },
      ]}>
      <IconSymbol name="clock" size={11} color={muted} />
      <ThemedText
        style={[styles.priorityTimelineSub, styles.priorityTimelineTimeTap, { color: ink }]}
        lightColor={ink}
        darkColor={ink}
        numberOfLines={2}>
        {line}
      </ThemedText>
    </Pressable>
  );
}

function buildCalendarDays(monthStart: Date): Date[] {
  const firstWeekdayMondayZero = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekdayMondayZero);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function normalizeToDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsedFromKey = parseLocalDateKeyToDate(value);
    if (parsedFromKey) return parsedFromKey;
    const parsedNative = new Date(value);
    if (Number.isFinite(parsedNative.getTime())) return parsedNative;
  }
  if (typeof value === 'number') {
    const parsedNative = new Date(value);
    if (Number.isFinite(parsedNative.getTime())) return parsedNative;
  }
  return fallback;
}

/** 합쳐진 시계 면 가운데 — 사각 점 두 개(콜론) + 느린 깜빡임 */
const COLON_BLINK_MS = 1100;

function BlinkingTimeColon({ dotColor }: { dotColor: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.12,
          duration: COLON_BLINK_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: COLON_BLINK_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[flipStyles.colonStrip, { opacity }]} pointerEvents="none">
      <View style={flipStyles.colonDotsColumn}>
        <View style={[flipStyles.colonDotSquare, { backgroundColor: dotColor }]} />
        <View style={[flipStyles.colonDotSquare, { backgroundColor: dotColor }]} />
      </View>
    </Animated.View>
  );
}

function flipClockInitialDrafts(v: string): { hour: string; min: string } {
  const p = parseHHmmToMinutes(v.trim());
  const tm = p !== null ? p : 9 * 60;
  if (tm === 24 * 60) return { hour: '24', min: '00' };
  const h24v = Math.floor(tm / 60);
  const mv = tm % 60;
  const { h12: h12v } = h24To12(h24v);
  return { hour: String(h12v).padStart(2, '0'), min: String(mv).padStart(2, '0') };
}

/** 플립 시계형 시·분 카드 (저장은 `HH:mm` 24h) — 민트 면 + 밝은 전경 */
function FlipClockTimePair({
  value,
  onChange,
  nextDayHint,
  dateCaption,
  clockRole = 'start',
  partnerStartHhmm,
  palette,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  /** 자정 넘김만(달력 다중일 아님) — 우측 상단 「다음날」 */
  nextDayHint?: boolean;
  /** 달력으로 기간을 나눈 경우에만 — 박스 하단에 `M월 D일` */
  dateCaption?: string;
  clockRole?: 'start' | 'end';
  /** 종료 시계 — 시작 시각과 함께 오전 12:xx·다음날 해석 */
  partnerStartHhmm?: string;
  palette: FlipClockPalette;
}) {
  const totalMin = useMemo(() => {
    const p = parseHHmmToMinutes(value.trim());
    return p !== null ? p : 9 * 60;
  }, [value]);

  const is2400 = totalMin === 24 * 60;

  const h24 = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const { ap, h12 } = h24To12(h24);

  /** 완전 제어 value만 쓰면 한 글자 지울 때·선행 0 입력 시 onChange 미호출로 입력이 튕김 → 편집 중 문자열 분리 */
  const [hourDraft, setHourDraft] = useState(() => flipClockInitialDrafts(value).hour);
  const [minDraft, setMinDraft] = useState(() => flipClockInitialDrafts(value).min);

  useEffect(() => {
    const p = parseHHmmToMinutes(value.trim());
    const tm = p !== null ? p : 9 * 60;
    if (tm === 24 * 60) {
      setHourDraft('24');
      setMinDraft('00');
      return;
    }
    const h24v = Math.floor(tm / 60);
    const mv = tm % 60;
    const { h12: h12v } = h24To12(h24v);
    setHourDraft(String(h12v).padStart(2, '0'));
    setMinDraft(String(mv).padStart(2, '0'));
  }, [value]);

  const commit = useCallback(
    (next: { ap?: '오전' | '오후'; h12?: number; min?: number }) => {
      const na = next.ap ?? ap;
      const nh = next.h12 ?? h12;
      const nm = next.min ?? min;
      if (clockRole === 'end' && partnerStartHhmm?.trim()) {
        onChange(formatEndHhmmFrom12hParts(nh, nm, na, partnerStartHhmm));
        return;
      }
      onChange(formatMinutesToHHmm(from12hPartsToTotal(nh, nm, na)));
    },
    [ap, clockRole, h12, min, onChange, partnerStartHhmm],
  );

  const onHourText = (t: string) => {
    const atMidnight = parseHHmmToMinutes(value.trim()) === 24 * 60;
    const d = t.replace(/\D/g, '').slice(0, 2);
    setHourDraft(d);
    if (d === '') return;
    if (d === '0') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;

    if (atMidnight) {
      const mv = parseInt(minDraft.replace(/\D/g, ''), 10);
      const mm = Number.isFinite(mv) ? Math.min(59, Math.max(0, mv)) : 0;
      if (d.length === 1) {
        if (n >= 1 && n <= 9) {
          onChange(formatMinutesToHHmm(n * 60 + mm));
        }
        return;
      }
      if (n === 24) {
        onChange('24:00');
        setMinDraft('00');
        return;
      }
      if (n <= 23) {
        onChange(formatMinutesToHHmm(n * 60 + mm));
      }
      return;
    }

    if (d.length === 1) {
      if (n >= 1 && n <= 9) {
        commit({ h12: n });
      }
      return;
    }
    const nh = Math.min(12, Math.max(1, n));
    commit({ h12: nh });
  };

  const onHourBlur = () => {
    const atMidnight = parseHHmmToMinutes(value.trim()) === 24 * 60;
    const d = hourDraft.replace(/\D/g, '').slice(0, 2);
    if (atMidnight) {
      if (d === '' || d === '0') {
        setHourDraft('24');
        return;
      }
      const n = parseInt(d, 10);
      if (!Number.isFinite(n)) {
        setHourDraft('24');
        return;
      }
      if (n === 24) {
        onChange('24:00');
        setHourDraft('24');
        setMinDraft('00');
        return;
      }
      if (n <= 23) {
        const mv = parseInt(minDraft.replace(/\D/g, ''), 10);
        const mm = Number.isFinite(mv) ? Math.min(59, Math.max(0, mv)) : 0;
        onChange(formatMinutesToHHmm(n * 60 + mm));
        setHourDraft(String(n).padStart(2, '0'));
        return;
      }
      setHourDraft('24');
      return;
    }

    if (d === '' || d === '0') {
      setHourDraft(String(h12).padStart(2, '0'));
      return;
    }
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) {
      setHourDraft(String(h12).padStart(2, '0'));
      return;
    }
    const nh = Math.min(12, Math.max(1, n));
    commit({ h12: nh });
    setHourDraft(String(nh).padStart(2, '0'));
  };

  const onMinuteText = (t: string) => {
    const atMidnight = parseHHmmToMinutes(value.trim()) === 24 * 60;
    const d = t.replace(/\D/g, '').slice(0, 2);
    setMinDraft(d);
    if (d === '') return;
    if (d === '0') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;

    if (atMidnight) {
      if (d.length === 1) {
        if (n > 0) {
          onChange(formatMinutesToHHmm(23 * 60 + n));
        }
        return;
      }
      const nm = Math.min(59, Math.max(0, n));
      if (nm === 0) {
        onChange('24:00');
        setMinDraft('00');
      } else {
        onChange(formatMinutesToHHmm(23 * 60 + nm));
      }
      return;
    }

    if (d.length === 1) {
      if (n >= 0 && n <= 9) {
        commit({ min: n });
      }
      return;
    }
    const nm = Math.min(59, Math.max(0, n));
    commit({ min: nm });
  };

  const onMinuteBlur = () => {
    const atMidnight = parseHHmmToMinutes(value.trim()) === 24 * 60;
    const d = minDraft.replace(/\D/g, '').slice(0, 2);
    if (atMidnight) {
      if (d === '' || d === '0') {
        setMinDraft('00');
        return;
      }
      const n = parseInt(d, 10);
      if (!Number.isFinite(n)) {
        setMinDraft('00');
        return;
      }
      const nm = Math.min(59, Math.max(0, n));
      if (nm === 0) {
        onChange('24:00');
        setMinDraft('00');
      } else {
        onChange(formatMinutesToHHmm(23 * 60 + nm));
        setMinDraft(String(nm).padStart(2, '0'));
      }
      return;
    }

    if (d === '' || d === '0') {
      setMinDraft(String(min).padStart(2, '0'));
      return;
    }
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) {
      setMinDraft(String(min).padStart(2, '0'));
      return;
    }
    const nm = Math.min(59, Math.max(0, n));
    commit({ min: nm });
    setMinDraft(String(nm).padStart(2, '0'));
  };

  const toggleAp = () => {
    if (is2400) return;
    void Haptics.selectionAsync();
    if (clockRole === 'end' && partnerStartHhmm?.trim()) {
      onChange(toggleEndMeridiemHhmm(partnerStartHhmm, h12, min, ap));
      return;
    }
    commit({ ap: ap === '오전' ? '오후' : '오전' });
  };

  return (
    <View style={flipStyles.pairRow}>
      <View style={flipStyles.mergedOuter}>
        <View
          style={[
            flipStyles.mergedFace,
            { backgroundColor: palette.cardBg, borderColor: palette.border, borderWidth: 2 },
          ]}>
          {nextDayHint ? (
            <View pointerEvents="none" style={flipStyles.nextDayBadge}>
              <ThemedText style={[flipStyles.nextDayText, { color: palette.ampm }]}>다음날</ThemedText>
            </View>
          ) : null}
          {dateCaption ? (
            <View pointerEvents="none" style={flipStyles.dateCaptionFooter}>
              <ThemedText style={[flipStyles.dateCaptionText, { color: palette.ampm }]}>
                {dateCaption}
              </ThemedText>
            </View>
          ) : null}
          <View style={flipStyles.halfCell}>
            {is2400 ? (
              <View
                pointerEvents="none"
                style={flipStyles.ampmBadge}
                accessibilityRole="text"
                accessibilityLabel="자정, 하루의 끝(24시)">
                <ThemedText style={[flipStyles.ampmText, { color: palette.ampm }]}>자정</ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={toggleAp}
                hitSlop={8}
                style={flipStyles.ampmBadge}
                accessibilityRole="button"
                accessibilityLabel={ap === '오전' ? '오전, 탭하면 오후로 전환' : '오후, 탭하면 오전으로 전환'}>
                <ThemedText style={[flipStyles.ampmText, { color: palette.ampm }]}>{ap}</ThemedText>
              </Pressable>
            )}
            <TextInput
              value={hourDraft}
              onChangeText={onHourText}
              onBlur={onHourBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[flipStyles.digitInput, digitInputNoArtifact, { color: palette.text }]}
            />
            <View pointerEvents="none" style={[flipStyles.flipHinge, { backgroundColor: palette.hinge }]} />
          </View>
          <View style={flipStyles.colonGutter}>
            <BlinkingTimeColon dotColor={palette.text} />
          </View>
          <View style={flipStyles.halfCell}>
            <TextInput
              value={minDraft}
              onChangeText={onMinuteText}
              onBlur={onMinuteBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[flipStyles.digitInput, digitInputNoArtifact, { color: palette.text }]}
            />
            <View pointerEvents="none" style={[flipStyles.flipHinge, { backgroundColor: palette.hinge }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const flipStyles = StyleSheet.create({
  /** 시·분 한 면으로 합침 — 바깥은 그림자만 */
  pairRow: {
    alignSelf: 'stretch',
    width: '100%',
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  mergedOuter: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** 단일 다크 면: 시 | : | 분, 사이 여백 없음 */
  mergedFace: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    aspectRatio: 1.72,
    borderRadius: 0,
    overflow: 'hidden',
  },
  halfCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  colonGutter: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 12,
    flexShrink: 0,
  },
  colonStrip: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  colonDotsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  /** 타이포 콜론 대신 디지털 시계식 사각 점 */
  colonDotSquare: {
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  /** (레거시) 개별 카드 */
  card: {
    flex: 1,
    minWidth: 0,
    maxWidth: 200,
    aspectRatio: 1 / 1.2,
    borderRadius: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** 플립 힌지: 숫자 가운데보다 살짝 아래(기계식 플립 시각 보정) */
  flipHinge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '54%',
    height: 2,
    marginTop: -1,
    zIndex: 10,
  },
  /** ampm: 숫자 영역과 시각 중심을 맞추기 위해 x축을 약간 오른쪽으로 이동 */
  ampmBadge: {
    position: 'absolute',
    top: '8%',
    left: '12%',
    zIndex: 12,
  },
  /** ampm-label — 밝은 전경 + 약한 투명 */
  ampmText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nextDayBadge: {
    position: 'absolute',
    top: '7%',
    right: '7%',
    zIndex: 13,
  },
  nextDayText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dateCaptionFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '7%',
    zIndex: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCaptionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  /** clock-digit — lineHeight 없으면 세로 클리핑으로 ‘가운데 잘린 선’처럼 보일 수 있음 */
  digitInput: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    padding: 0,
    margin: 0,
    textAlign: 'center',
    minWidth: 0,
    width: '100%',
    zIndex: 0,
  },
});

/** 다이어리 북 — 배경은 `dayPlanPalette` zinc 회색 컨테이너 톤(검정 단색 고정 없음) */
function bookColors(c: DayPlanPalette, isDark: boolean) {
  if (isDark) {
    return {
      cover: c.containerLow,
      crease: c.catBorderIdle,
      ink: c.onSurface,
      inkMuted: c.onVariant,
      ribbon: c.containerLow,
      ribbonMuted: c.onVariant,
    };
  }
  return {
    cover: c.containerLow,
    crease: c.catBorderIdle,
    ink: c.onSurface,
    inkMuted: c.onVariant,
    ribbon: c.containerLow,
    ribbonMuted: c.onVariant,
  };
}

type Props = {
  c: DayPlanPalette;
  isFocusStarted: boolean;
  /** 우선 순위 일정 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  onChangePriorityPlanDateKey: (v: string) => void;
  /** 우선 순위 일정 적용 기간 종료일 (YYYY-MM-DD) */
  priorityPlanDateKeyEnd: string;
  onChangePriorityPlanDateKeyEnd: (v: string) => void;
  /** 달력에서 기간 적용 시(명시 다중일·자동 플래그 포함) */
  applyPriorityPlanCalendarRange: (lo: string, hi: string) => void;
  /** 달력에서 서로 다른 날짜로 구간을 잡은 경우 — 시계 박스에만 짧은 날짜 표시 */
  priorityPlanExplicitMultiDay: boolean;
  priorityStart: string;
  priorityEnd: string;
  onChangePriorityStart: (v: string) => void;
  onChangePriorityEnd: (v: string) => void;
  priorityCategoryOrder: string[];
  onSelectCategory: (key: string) => void;
  /** 목록 행에서 상세 설정 열기 — categoryKey를 전달 */
  onOpenCategorySettings?: (categoryKey: string) => void;
  /** 시작 후 목록 행에서 몰입 상세 열기 */
  onOpenFocusDetail?: (categoryKey: string) => void;
  /** 구간 미설정 안내 → 오늘의 루틴 탭 */
  onOpenFixedRoutine?: () => void;
  layoutMode: DayPlanLayoutMode;
  onSelectLayoutMode: (mode: DayPlanLayoutMode) => void;
  visibleLayoutModes?: readonly DayPlanLayoutMode[];
};

/* ─── 메인 ─── */

export function PriorityBasedPlanSection({
  c,
  isFocusStarted,
  priorityPlanDateKey,
  onChangePriorityPlanDateKey,
  priorityPlanDateKeyEnd,
  onChangePriorityPlanDateKeyEnd,
  applyPriorityPlanCalendarRange,
  priorityPlanExplicitMultiDay,
  priorityStart,
  priorityEnd,
  onChangePriorityStart,
  onChangePriorityEnd,
  priorityCategoryOrder,
  onSelectCategory,
  onOpenCategorySettings,
  onOpenFocusDetail,
  onOpenFixedRoutine,
  layoutMode,
  onSelectLayoutMode,
  visibleLayoutModes,
}: Props) {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);
  const flipClockColors = useMemo(() => flipClockPalette(isDark), [isDark]);
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const bc = bookColors(c, isDark);

  const todayKey = getLocalDateKey();

  const [iosDateModalOpen, setIosDateModalOpen] = useState(false);
  const [priorityTimeModalOpen, setPriorityTimeModalOpen] = useState(false);
  const [draftPriorityStart, setDraftPriorityStart] = useState(priorityStart);
  const [draftPriorityEnd, setDraftPriorityEnd] = useState(priorityEnd);
  const [draftEndNextDay, setDraftEndNextDay] = useState<boolean>(() =>
    isOvernightHhmmRange(priorityStart, priorityEnd),
  );
  const draftEndNextDayPinnedRef = useRef(false);
  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()));
  const [draftRangeStart, setDraftRangeStart] = useState(priorityPlanDateKey);
  const [draftRangeEnd, setDraftRangeEnd] = useState(priorityPlanDateKeyEnd);
  /** null이 아니면 첫 번째로 택한 날(스토어 미반영) — 다음 탭이 범위의 다른 끝 */
  const [calendarRangeAnchor, setCalendarRangeAnchor] = useState<string | null>(null);
  const [spineEditDraft, setSpineEditDraft] = useState<SpineBlockEditDraft | null>(null);
  const [spineDragActive, setSpineDragActive] = useState(false);

  const monthFallbackDate = useMemo(() => {
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    return parseLocalDateKeyToDate(lo) ?? new Date();
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd]);

  const safeMonthCursor = useMemo(
    () => toMonthStart(normalizeToDate(monthCursor, monthFallbackDate)),
    [monthCursor, monthFallbackDate],
  );

  const modalClockFaceHints = useMemo(() => {
    const explicit = priorityPlanExplicitMultiDay;
    const { lo, hi } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
    const startKey = priorityClockCaptionDateKeyStart(lo);
    const endKey = priorityClockCaptionDateKeyEnd(hi, draftPriorityStart, draftPriorityEnd);
    return {
      startDateCaption: explicit ? formatDateKeyCompactKo(startKey) : undefined,
      endDateCaption: explicit ? formatDateKeyCompactKo(endKey) : undefined,
      endNextDayOnlyBadge: draftEndNextDay && !explicit,
    };
  }, [
    draftEndNextDay,
    draftPriorityEnd,
    draftPriorityStart,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay,
  ]);

  const openPlanDatePicker = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    const hi =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
    setDraftRangeStart(lo);
    setDraftRangeEnd(hi);
    /** 하루만 잡혀 있으면 열자마자 「시작」 단계로 두어, 바로 시작 UI가 보이게 함 */
    setCalendarRangeAnchor(lo === hi ? lo : null);
    setMonthCursor(toMonthStart(parseLocalDateKeyToDate(lo) ?? new Date()));
    setIosDateModalOpen(true);
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd]);

  const onDraftDayPress = useCallback(
    (dateKey: string) => {
      void Haptics.selectionAsync();
      if (calendarRangeAnchor === null) {
        setDraftRangeStart(dateKey);
        setDraftRangeEnd(dateKey);
        setCalendarRangeAnchor(dateKey);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      const lo = dateKey < calendarRangeAnchor ? dateKey : calendarRangeAnchor;
      const hi = dateKey < calendarRangeAnchor ? calendarRangeAnchor : dateKey;
      setDraftRangeStart(lo);
      setDraftRangeEnd(hi);
      setCalendarRangeAnchor(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [calendarRangeAnchor],
  );

  const onConfirmCalendarRange = useCallback(() => {
    const lo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
    const hi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
    applyPriorityPlanCalendarRange(lo, hi);
    setCalendarRangeAnchor(null);
    setIosDateModalOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftRangeStart, draftRangeEnd, applyPriorityPlanCalendarRange]);

  const jumpToTodayInCalendar = useCallback(() => {
    const now = new Date();
    setMonthCursor(toMonthStart(now));
    void Haptics.selectionAsync();
    onDraftDayPress(getLocalDateKey(now));
  }, [onDraftDayPress]);

  /** 모달 안 선택만 오늘 하루·시작 단계로 되돌림 (스토어 반영은 설정 완료 시) */
  const resetCalendarDraftToToday = useCallback(() => {
    const now = new Date();
    const tk = getLocalDateKey(now);
    setMonthCursor(toMonthStart(now));
    setDraftRangeStart(tk);
    setDraftRangeEnd(tk);
    setCalendarRangeAnchor(tk);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const modalDraftRange = useMemo(() => {
    const lo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
    const hi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
    return {
      lo,
      hi,
      loCompact: formatDateKeyCompactKo(lo),
      hiCompact: formatDateKeyCompactKo(hi),
      isSingle: lo === hi,
    };
  }, [draftRangeStart, draftRangeEnd]);

  useEffect(() => {
    if (iosDateModalOpen) return;
    const lo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
    const hi =
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
    setDraftRangeStart(lo);
    setDraftRangeEnd(hi);
    setCalendarRangeAnchor(null);
  }, [priorityPlanDateKey, priorityPlanDateKeyEnd, iosDateModalOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(safeMonthCursor), [safeMonthCursor]);
  const monthTitle = `${safeMonthCursor.getFullYear()}년 ${safeMonthCursor.getMonth() + 1}월`;
  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  /** 목표 상세·커스텀 라벨 갱신 — 설정 화면에서 돌아올 때 */
  const [categoryHintTick, setCategoryHintTick] = useState(0);
  /** 구간별 `isCurrent` — 시간대가 바뀔 때 갱신 */
  const [mealSlotNowTick, setMealSlotNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMealSlotNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  useFocusEffect(
    useCallback(() => {
      registerOtherCategoryResolverFromStorage();
      setCategoryHintTick((n) => n + 1);
    }, []),
  );

  const selectedItems = useMemo(
    () =>
      priorityCategoryOrder
        .map((key) => {
          const base = getPickerCategoryItem(key);
          if (!base) return null;
          return { ...base, label: getPickerCategoryLabel(key) };
        })
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [priorityCategoryOrder, categoryHintTick, categoryLabelEpoch],
  );

  const bagCount = selectedItems.length;

  const {
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
    addFocusCategoryCompleted,
    toggleFocusCategoryCompleted,
    filterCompletedFocusKeysToPriorityOrder,
    addPlanCompletionDismissedKey,
    clearPlanCompletionDismissedKeys,
    setPriorityCategoryOrder,
    priorityMealSlotLayoutEnabled,
    setPriorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled,
    setPrioritySpineLayoutEnabled,
    priorityMealSlotOverrides,
    setPriorityMealSlotOverride,
    prioritySectionsMealSlots,
    mergePrioritySectionsMealSlots,
    addPrioritySectionMealSlot,
    setPrioritySectionsMealSlots,
    migrateSectionCompletionOnSlotMove,
    finishPriorityCategoryForToday,
    priorityCategoryImportance,
    cyclePriorityCategoryImportance,
    prioritySectionsCategoryOrder,
    appendPrioritySectionsCategoryKeys,
    setPrioritySectionsCategoryOrder,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
      addFocusCategoryCompleted: s.addFocusCategoryCompleted,
      toggleFocusCategoryCompleted: s.toggleFocusCategoryCompleted,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
      addPlanCompletionDismissedKey: s.addPlanCompletionDismissedKey,
      clearPlanCompletionDismissedKeys: s.clearPlanCompletionDismissedKeys,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
      setPriorityMealSlotLayoutEnabled: s.setPriorityMealSlotLayoutEnabled,
      prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
      setPrioritySpineLayoutEnabled: s.setPrioritySpineLayoutEnabled,
      priorityMealSlotOverrides: s.priorityMealSlotOverrides,
      setPriorityMealSlotOverride: s.setPriorityMealSlotOverride,
      prioritySectionsMealSlots: s.prioritySectionsMealSlots,
      mergePrioritySectionsMealSlots: s.mergePrioritySectionsMealSlots,
      addPrioritySectionMealSlot: s.addPrioritySectionMealSlot,
      setPrioritySectionsMealSlots: s.setPrioritySectionsMealSlots,
      migrateSectionCompletionOnSlotMove: s.migrateSectionCompletionOnSlotMove,
      finishPriorityCategoryForToday: s.finishPriorityCategoryForToday,
      priorityCategoryImportance: s.priorityCategoryImportance,
      cyclePriorityCategoryImportance: s.cyclePriorityCategoryImportance,
      prioritySectionsCategoryOrder: s.prioritySectionsCategoryOrder,
      appendPrioritySectionsCategoryKeys: s.appendPrioritySectionsCategoryKeys,
      setPrioritySectionsCategoryOrder: s.setPrioritySectionsCategoryOrder,
    })),
  );
  const [lastAddedCategoryKey, setLastAddedCategoryKey] = useState<string | null>(null);
  /** 순서 드래그 직후에만 Reanimated layout 전환 — 드래그 중 state 변경 시 제스처가 끊김 */
  const [priorityRowLayoutAnim, setPriorityRowLayoutAnim] = useState(false);
  const [deferredBottomReorderKeys, setDeferredBottomReorderKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const deferredReorderTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const priorityTimelineScrollRef = useRef<ScrollView>(null);
  const priorityReorderDragActiveRef = useRef(false);
  const [mealSlotScheduleSheetOpen, setMealSlotScheduleSheetOpen] = useState(false);
  const [mealSlotScheduleFocusSlot, setMealSlotScheduleFocusSlot] = useState<DayMealSlot | null>(
    null,
  );
  const [addRoutineSheetOpen, setAddRoutineSheetOpen] = useState(false);
  const [addRoutineTargetSlot, setAddRoutineTargetSlot] = useState<DayMealSlot | null>(null);
  const [spinePendingGapBounds, setSpinePendingGapBounds] = useState<{
    fromMinutes: number;
    toMinutes: number;
  } | null>(null);
  const [catalogTick, setCatalogTick] = useState(0);
  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
  const {
    schedule: mealSlotSchedule,
    persistSchedule: persistMealSlotSchedule,
    revision: mealSlotScheduleRevision,
  } = useDayMealSlotSchedule();
  const priorityBagRowHeightRef = useRef(52);

  const setPriorityTimelineScrollEnabled = useCallback((enabled: boolean) => {
    priorityTimelineScrollRef.current?.setNativeProps?.({ scrollEnabled: enabled });
  }, []);

  const lockPriorityTimelineScroll = useCallback(() => {
    priorityReorderDragActiveRef.current = true;
    setPriorityTimelineScrollEnabled(false);
  }, [setPriorityTimelineScrollEnabled]);

  const unlockPriorityTimelineScroll = useCallback(() => {
    priorityReorderDragActiveRef.current = false;
    if (!spineDragActive) {
      setPriorityTimelineScrollEnabled(true);
    }
  }, [setPriorityTimelineScrollEnabled, spineDragActive]);

  const planBlocks = useDayPlanStore((s) => s.blocks);

  const fixedFlowSets = useFixedFlowSetsStore((s) => s.sets);
  const fixedFlowActiveSetIds = useFixedFlowSetsStore((s) => s.activeSetIds);
  const activeMealSlotsBySetId = useFixedFlowSetsStore((s) => s.activeMealSlotsBySetId);
  const todayAppliedCategoryKeys = useFixedFlowSetsStore((s) => s.todayAppliedCategoryKeys);
  const dayPlanDateKey = useDayPlanStore((s) => s.dateKey);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);
  const addPlanBlock = useDayPlanStore((s) => s.addBlock);
  const updatePlanBlock = useDayPlanStore((s) => s.updateBlock);
  const removePlanBlock = useDayPlanStore((s) => s.removeBlock);
  const reorderSpineBlocks = useDayPlanStore((s) => s.reorderSpineTimelineBlocks);
  const completePlanBlock = useDayPlanStore((s) => s.completeBlock);
  const uncompletePlanBlock = useDayPlanStore((s) => s.uncompleteBlock);

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(planBlocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key = resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [planBlocks, completedBlockIds, skippedBlockIds]);

  /** 집중 종료 시 플랜 완료 무시 목록 초기화 — 다음 세션에서 다시 일정 완료 반영 */
  useEffect(() => {
    if (!isFocusStarted) {
      clearPlanCompletionDismissedKeys();
    }
  }, [isFocusStarted, clearPlanCompletionDismissedKeys]);

  useEffect(() => {
    filterCompletedFocusKeysToPriorityOrder(priorityCategoryOrder);
  }, [priorityCategoryOrder, filterCompletedFocusKeysToPriorityOrder]);

  useEffect(() => {
    if (!lastAddedCategoryKey) return;
    const timer = setTimeout(() => setLastAddedCategoryKey(null), 450);
    return () => clearTimeout(timer);
  }, [lastAddedCategoryKey]);

  useEffect(() => {
    setPriorityRowLayoutAnim(false);
  }, [layoutMode]);

  useEffect(() => {
    const timers = deferredReorderTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const scheduleDeferredMoveToBottom = useCallback((itemKey: string) => {
    const existing = deferredReorderTimersRef.current.get(itemKey);
    if (existing) clearTimeout(existing);

    setDeferredBottomReorderKeys((prev) => {
      const next = new Set(prev);
      next.add(itemKey);
      return next;
    });

    const timer = setTimeout(() => {
      deferredReorderTimersRef.current.delete(itemKey);
      setDeferredBottomReorderKeys((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
      setPriorityRowLayoutAnim(true);
    }, COMPLETION_TOGGLE_ANIM_MS);

    deferredReorderTimersRef.current.set(itemKey, timer);
  }, []);

  const releaseDeferredMoveToBottom = useCallback((itemKey: string) => {
    const existing = deferredReorderTimersRef.current.get(itemKey);
    if (existing) {
      clearTimeout(existing);
      deferredReorderTimersRef.current.delete(itemKey);
    }
    setDeferredBottomReorderKeys((prev) => {
      if (!prev.has(itemKey)) return prev;
      const next = new Set(prev);
      next.delete(itemKey);
      return next;
    });
    setPriorityRowLayoutAnim(true);
  }, []);

  useEffect(() => {
    if (spineDragActive) {
      setPriorityTimelineScrollEnabled(false);
      return;
    }
    if (!priorityReorderDragActiveRef.current) {
      setPriorityTimelineScrollEnabled(true);
    }
  }, [spineDragActive, setPriorityTimelineScrollEnabled]);

  const isPriorityRowCompleted = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(categoryKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedFocusCategoryKeys,
      completedCategoryKeysFromPlan,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  const isPrioritySectionItemCompleted = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const completionKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (completedFocusCategoryKeys.includes(completionKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(completionKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedFocusCategoryKeys,
      completedCategoryKeysFromPlan,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  /**
   * 미완료는 위쪽·원래 담기 순서 유지, 완료(취소선)는 맨 아래로 모음.
   */
  const orderedSelectedItemsForDisplay = useMemo(() => {
    return partitionDisplayWithDeferredBottom(
      selectedItems,
      (cat) => cat.key,
      (cat) => isPriorityRowCompleted(cat.key),
      deferredBottomReorderKeys,
    );
  }, [deferredBottomReorderKeys, selectedItems, isPriorityRowCompleted]);

  const sectionsCatalogItems = useMemo(
    () =>
      prioritySectionsCategoryOrder
        .map((key) => {
          const base = getPickerCategoryItem(key);
          if (!base) return null;
          return { ...base, label: getPickerCategoryLabel(key) };
        })
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [prioritySectionsCategoryOrder, categoryHintTick, categoryLabelEpoch],
  );

  const sectionsCount = sectionsCatalogItems.length;

  const sectionsLayoutItems = useMemo(
    () =>
      partitionDisplayWithDeferredBottom(
        sectionsCatalogItems,
        (cat) => cat.key,
        (cat) => isPriorityRowCompleted(cat.key),
        deferredBottomReorderKeys,
      ),
    [deferredBottomReorderKeys, sectionsCatalogItems, isPriorityRowCompleted],
  );

  const priorityOrderIndexByKey = useMemo(() => {
    const source = priorityMealSlotLayoutEnabled ? sectionsLayoutItems : selectedItems;
    return new Map(source.map((item, index) => [item.key, index]));
  }, [priorityMealSlotLayoutEnabled, sectionsLayoutItems, selectedItems]);

  const sectionsMealSlotMap = useMemo(
    () => new Map<string, DayMealSlot[]>(Object.entries(prioritySectionsMealSlots)),
    [prioritySectionsMealSlots],
  );

  const mealSlotOverrides = useMemo(() => {
    const map = buildCategoryMealSlotOverrides({
      sets: fixedFlowSets,
      activeSetIds: fixedFlowActiveSetIds,
      activeMealSlotsBySetId,
      todayAppliedCategoryKeys,
    });
    for (const [key, slot] of Object.entries(priorityMealSlotOverrides)) {
      map.set(key, slot);
    }
    return map as Map<string, CategoryMealSlotOverride>;
  }, [fixedFlowSets, fixedFlowActiveSetIds, activeMealSlotsBySetId, priorityMealSlotOverrides, todayAppliedCategoryKeys]);

  const hasExplicitMealSlots = useMemo(
    () => hasExplicitMealSlotAssignments(orderedSelectedItemsForDisplay, mealSlotOverrides),
    [orderedSelectedItemsForDisplay, mealSlotOverrides],
  );

  const layoutMealSlotOverrides = priorityMealSlotLayoutEnabled
    ? (sectionsMealSlotMap as Map<string, CategoryMealSlotOverride>)
    : mealSlotOverrides;

  const priorityMealSlotLayout = useMemo(() => {
    const layoutItems = priorityMealSlotLayoutEnabled
      ? sectionsLayoutItems
      : orderedSelectedItemsForDisplay;
    return splitPriorityMealSlotSections(layoutItems, {
      nowMin: getLocalMinutesOfDayNow(),
      mealSlotOverrides: layoutMealSlotOverrides,
      schedule: mealSlotSchedule,
      orderIndexByKey: priorityOrderIndexByKey,
      explicitSlotsOnly: priorityMealSlotLayoutEnabled ? true : hasExplicitMealSlots,
      includeEmptySections: priorityMealSlotLayoutEnabled,
    });
  }, [
    orderedSelectedItemsForDisplay,
    sectionsLayoutItems,
    priorityOrderIndexByKey,
    categoryHintTick,
    mealSlotNowTick,
    layoutMealSlotOverrides,
    mealSlotSchedule,
    mealSlotScheduleRevision,
    hasExplicitMealSlots,
    priorityMealSlotLayoutEnabled,
  ]);

  const priorityMealSlotSections = priorityMealSlotLayout.sections;
  const slottedPriorityEntries = useMemo(
    () => flattenPriorityMealSlotSectionEntries(priorityMealSlotSections),
    [priorityMealSlotSections],
  );
  const fullBagCount = orderedSelectedItemsForDisplay.length;

  const openMealSlotScheduleEditor = useCallback((slot?: DayMealSlot | null) => {
    setMealSlotScheduleFocusSlot(slot ?? null);
    setMealSlotScheduleSheetOpen(true);
  }, []);

  const alertSpineBlockSaveError = useCallback(
    (action: 'add' | 'update', reason: string) => {
      const title = action === 'add' ? '일정 추가' : '일정 수정';
      if (reason === 'empty_title') {
        Alert.alert(title, '제목을 입력해 주세요.');
        return;
      }
      if (reason === 'in_the_past') {
        Alert.alert(title, '종료 시각이 현재보다 이후인 일정만 저장할 수 있어요.');
        return;
      }
      if (reason === 'overlap') {
        Alert.alert(title, '겹치는 일정이 있어요. 다른 시간을 선택해 주세요.');
        return;
      }
      if (reason === 'invalid_range') {
        Alert.alert(title, '종료 시각은 시작 시각보다 뒤여야 해요.');
        return;
      }
      if (reason === 'outside_window') {
        Alert.alert(
          title,
          '일정은 하루 시작~하루 마무리 시간 안에서만 둘 수 있어요. 시간을 다시 확인해 주세요.',
        );
        return;
      }
      Alert.alert(title, '일정을 저장하지 못했어요.');
    },
    [],
  );

  const reloadRoutineCatalog = useCallback(() => {
    setCustomFlowEntries(listAllCustomFlowCatalogEntries());
    setCustomGroups(listCustomCatalogGroups());
    setCatalogTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!addRoutineSheetOpen) return;
    reloadRoutineCatalog();
  }, [addRoutineSheetOpen, reloadRoutineCatalog]);

  const addableRoutineSections = useMemo(() => {
    void catalogTick;
    const excludedKeys = spinePendingGapBounds
      ? new Set<string>()
      : new Set(
          addRoutineTargetSlot ? prioritySectionsCategoryOrder : priorityCategoryOrder,
        );
    return buildAddablePriorityCatalogSections({
      excludedKeys,
      customFlowEntries,
      customGroups,
    });
  }, [
    addRoutineTargetSlot,
    catalogTick,
    customFlowEntries,
    customGroups,
    priorityCategoryOrder,
    prioritySectionsCategoryOrder,
    spinePendingGapBounds,
  ]);

  const openAddRoutineForSlot = useCallback((slot: DayMealSlot) => {
    setSpinePendingGapBounds(null);
    setAddRoutineTargetSlot(slot);
    setAddRoutineSheetOpen(true);
  }, []);

  const openAddRoutineForBag = useCallback(() => {
    setSpinePendingGapBounds(null);
    setAddRoutineTargetSlot(null);
    setAddRoutineSheetOpen(true);
  }, []);

  const handleConfirmAddRoutinesToSlot = useCallback(
    (items: RoutinePickerConfirmItem[]) => {
      if (items.length === 0) return;

      if (spinePendingGapBounds) {
        const addedKeys: string[] = [];

        for (const item of items) {
          const schedule = item.schedule;
          if (!schedule) break;

          const label = getPickerCategoryLabel(item.key);
          const result = addPlanBlock({
            title: label,
            category: label,
            categoryKey: item.key,
            startMinutes: schedule.startMinutes,
            endMinutes: schedule.endMinutes,
            endsNextCalendarDay: Boolean(schedule.endsNextCalendarDay),
            blockOrigin: 'spineTimeline',
            planDateKey: getLocalDateKey(),
          });
          if (!result.ok) {
            if (addedKeys.length === 0) {
              alertSpineBlockSaveError('add', result.reason);
            }
            break;
          }
          addedKeys.push(item.key);
        }

        if (addedKeys.length > 0) {
          setLastAddedCategoryKey(addedKeys[addedKeys.length - 1] ?? null);
        }
        setSpinePendingGapBounds(null);
        return;
      }

      const keys = items.map((item) => item.key);

      if (addRoutineTargetSlot) {
        const slot = addRoutineTargetSlot;
        appendPrioritySectionsCategoryKeys(keys);
        keys.forEach((key) => {
          addPrioritySectionMealSlot(key, slot);
        });
        appendRoutineCatalogSelectionKeys(keys);
      } else {
        appendPriorityCategoryKeysIfMissing(keys);
        appendRoutineCatalogSelectionKeys(keys);
      }
      setLastAddedCategoryKey(keys[keys.length - 1] ?? null);
    },
    [
      addPlanBlock,
      addRoutineTargetSlot,
      addPrioritySectionMealSlot,
      alertSpineBlockSaveError,
      appendPriorityCategoryKeysIfMissing,
      appendPrioritySectionsCategoryKeys,
      spinePendingGapBounds,
    ],
  );

  const addRoutineSheetTitle = useMemo(
    () =>
      addRoutineTargetSlot
        ? `${DAY_MEAL_SLOT_LABEL[addRoutineTargetSlot]} 루틴 연결`
        : '루틴 추가',
    [addRoutineTargetSlot],
  );

  const addRoutineSheetConfirmLabel = addRoutineTargetSlot ? '연결' : '추가';

  const spineGapAddConfig = useMemo(() => {
    if (!spinePendingGapBounds) return null;
    return {
      fromMinutes: spinePendingGapBounds.fromMinutes,
      toMinutes: spinePendingGapBounds.toMinutes,
      priorityStart,
      priorityEnd,
      planBlocks,
      nowMinutes: getLocalMinutesOfDayNow(),
    };
  }, [planBlocks, priorityEnd, priorityStart, spinePendingGapBounds]);

  const showSectionsView = priorityMealSlotLayoutEnabled;

  const isPriorityCategoryDoneForOrdering = useCallback(
    (categoryKey: string) => {
      if (!showSectionsView) return isPriorityRowCompleted(categoryKey);
      const slots = sectionsMealSlotMap.get(categoryKey);
      if (slots && slots.length > 0) {
        return slots.every((slot) => isPrioritySectionItemCompleted(categoryKey, slot));
      }
      return isPriorityRowCompleted(categoryKey);
    },
    [isPriorityRowCompleted, isPrioritySectionItemCompleted, sectionsMealSlotMap, showSectionsView],
  );

  const mealSlotSectionsForDisplay = useMemo(() => {
    if (!showSectionsView) return [];
    const mapped = priorityMealSlotSections.map((section) => ({
      ...section,
      items: partitionDisplayWithDeferredBottom(
        section.items,
        (cat) => buildPrioritySectionCompletionKey(cat.key, section.slot),
        (cat) => isPrioritySectionItemCompleted(cat.key, section.slot),
        deferredBottomReorderKeys,
      ),
    }));
    const spansNextDay =
      priorityPlanExplicitMultiDay || isOvernightHhmmRange(priorityStart, priorityEnd);
    return clampMealSlotSectionsToWindow(mapped, priorityStart, priorityEnd, spansNextDay);
  }, [
    deferredBottomReorderKeys,
    isPrioritySectionItemCompleted,
    priorityMealSlotSections,
    priorityStart,
    priorityEnd,
    priorityPlanExplicitMultiDay,
    showSectionsView,
  ]);

  const dragReorderDelta = useCallback((translationY: number, rowHeight: number): number => {
    const threshold = rowHeight * 0.75;
    const absY = Math.abs(translationY);
    if (absY < threshold) return 0;
    const beyond = absY - threshold;
    const steps = 1 + Math.trunc(beyond / rowHeight);
    return translationY < 0 ? -steps : steps;
  }, []);

  const movePriorityCategoryToSectionSlot = useCallback(
    (categoryKey: string, fromSlot: DayMealSlot, toSlot: DayMealSlot) => {
      if (fromSlot === toSlot) return;
      const currentSlots = sectionsMealSlotMap.get(categoryKey) ?? [fromSlot];
      const nextSlots = [
        ...new Set([...currentSlots.filter((slot) => slot !== fromSlot), toSlot]),
      ];
      if (nextSlots.length === 0) return;
      const changedInSet = useFixedFlowSetsStore
        .getState()
        .setCategoryMealSlotInAnySet(categoryKey, toSlot);
      setPrioritySectionsMealSlots(categoryKey, nextSlots);
      if (!changedInSet) {
        setPriorityMealSlotOverride(categoryKey, toSlot);
      }
      migrateSectionCompletionOnSlotMove(categoryKey, fromSlot, toSlot);
    },
    [
      migrateSectionCompletionOnSlotMove,
      sectionsMealSlotMap,
      setPriorityMealSlotOverride,
      setPrioritySectionsMealSlots,
    ],
  );

  const commitPriorityDisplayReorderFromDrag = useCallback(
    (categoryKey: string, translationY: number, fromSlot?: DayMealSlot, targetSlot?: DayMealSlot) => {
      const parsed = parsePrioritySectionCompletionKey(categoryKey);
      const actualCategoryKey = parsed.categoryKey;
      const resolvedFromSlot = fromSlot ?? parsed.slot;
      if (showSectionsView && resolvedFromSlot) {
        const resolvedTarget = targetSlot ?? resolvedFromSlot;

        if (resolvedTarget !== resolvedFromSlot) {
          setPriorityRowLayoutAnim(true);
          movePriorityCategoryToSectionSlot(actualCategoryKey, resolvedFromSlot, resolvedTarget);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }

        const entriesInSlot = slottedPriorityEntries.filter((entry) => entry.slot === resolvedFromSlot);
        if (entriesInSlot.length < 2) return;
        const from = entriesInSlot.findIndex((entry) => entry.key === actualCategoryKey);
        if (from < 0) return;
        const h = Math.max(36, priorityBagRowHeightRef.current);
        const delta = dragReorderDelta(translationY, h);
        const to = Math.max(0, Math.min(entriesInSlot.length - 1, from + delta));
        if (to === from) return;
        const reorderedInSlot = reorderMealSlotSectionEntries(entriesInSlot, from, to);
        const slotKeySet = new Set(entriesInSlot.map((entry) => entry.key));
        const firstSlotIndex = prioritySectionsCategoryOrder.findIndex((key) => slotKeySet.has(key));
        if (firstSlotIndex < 0) return;
        const before = prioritySectionsCategoryOrder.slice(0, firstSlotIndex);
        const after = prioritySectionsCategoryOrder.slice(firstSlotIndex + entriesInSlot.length);
        const nextOrder = [
          ...before,
          ...reorderedInSlot.map((entry) => entry.key),
          ...after,
        ];
        const active = nextOrder.filter((k) => !isPriorityCategoryDoneForOrdering(k));
        const done = nextOrder.filter((k) => isPriorityCategoryDoneForOrdering(k));
        setPriorityRowLayoutAnim(true);
        setPrioritySectionsCategoryOrder([...active, ...done]);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (showSectionsView) {
        return;
      }

      const keyOrder = orderedSelectedItemsForDisplay.map((c) => c.key);
      const len = keyOrder.length;
      if (len < 2) return;
      const from = keyOrder.indexOf(actualCategoryKey);
      if (from < 0) return;
      const h = Math.max(36, priorityBagRowHeightRef.current);
      const delta = dragReorderDelta(translationY, h);
      const to = Math.max(0, Math.min(len - 1, from + delta));
      if (to === from) return;
      const moved = reorderFlatKeys(keyOrder, from, to);

      const active = moved.filter((k) => !isPriorityRowCompleted(k));
      const done = moved.filter((k) => isPriorityRowCompleted(k));
      setPriorityRowLayoutAnim(true);
      setPriorityCategoryOrder([...active, ...done]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [
      dragReorderDelta,
      isPriorityCategoryDoneForOrdering,
      isPriorityRowCompleted,
      movePriorityCategoryToSectionSlot,
      orderedSelectedItemsForDisplay,
      prioritySectionsCategoryOrder,
      sectionsMealSlotMap,
      setPriorityCategoryOrder,
      setPrioritySectionsCategoryOrder,
      showSectionsView,
      slottedPriorityEntries,
    ],
  );

  const undoPriorityRowCompletion = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) {
        toggleFocusCategoryCompleted(categoryKey);
        return;
      }
      if (completedCategoryKeysFromPlan.includes(categoryKey)) {
        addPlanCompletionDismissedKey(categoryKey);
      }
    },
    [
      addPlanCompletionDismissedKey,
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      toggleFocusCategoryCompleted,
    ],
  );

  const undoPrioritySectionItemCompletion = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const completionKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (completedFocusCategoryKeys.includes(completionKey)) {
        toggleFocusCategoryCompleted(completionKey);
        return;
      }
      if (completedCategoryKeysFromPlan.includes(categoryKey)) {
        addPlanCompletionDismissedKey(completionKey);
      }
    },
    [
      addPlanCompletionDismissedKey,
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      toggleFocusCategoryCompleted,
    ],
  );

  const handleTogglePriorityRowComplete = useCallback(
    (categoryKey: string) => {
      if (isPriorityRowCompleted(categoryKey)) {
        releaseDeferredMoveToBottom(categoryKey);
        undoPriorityRowCompletion(categoryKey);
        return;
      }
      scheduleDeferredMoveToBottom(categoryKey);
      addFocusCategoryCompleted(categoryKey);
    },
    [
      addFocusCategoryCompleted,
      isPriorityRowCompleted,
      releaseDeferredMoveToBottom,
      scheduleDeferredMoveToBottom,
      undoPriorityRowCompletion,
    ],
  );

  const handleTogglePrioritySectionItemComplete = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      const itemKey = buildPrioritySectionCompletionKey(categoryKey, slot);
      if (isPrioritySectionItemCompleted(categoryKey, slot)) {
        releaseDeferredMoveToBottom(itemKey);
        undoPrioritySectionItemCompletion(categoryKey, slot);
        return;
      }
      scheduleDeferredMoveToBottom(itemKey);
      addFocusCategoryCompleted(itemKey);
    },
    [
      addFocusCategoryCompleted,
      isPrioritySectionItemCompleted,
      releaseDeferredMoveToBottom,
      scheduleDeferredMoveToBottom,
      undoPrioritySectionItemCompletion,
    ],
  );

  const handleFinishPriorityCategoryForToday = useCallback(
    (categoryKey: string, label: string) => {
      Alert.alert(
        '오늘 일정 종료',
        `「${label}」을 오늘 목록에서 내릴까요?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '종료',
            style: 'destructive',
            onPress: () => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPriorityRowLayoutAnim(true);
              finishPriorityCategoryForToday(categoryKey);
              saveRoutineCatalogSelectionKeys(
                useDayPlanDraftStore.getState().priorityCategoryOrder,
              );
            },
          },
        ],
      );
    },
    [finishPriorityCategoryForToday],
  );

  const resolveTimelineItemCompleted = useCallback(
    (itemKey: string) => {
      const { categoryKey, slot } = parsePrioritySectionCompletionKey(itemKey);
      if (slot) return isPrioritySectionItemCompleted(categoryKey, slot);
      return isPriorityRowCompleted(categoryKey);
    },
    [isPriorityRowCompleted, isPrioritySectionItemCompleted],
  );

  const resolveTimelineCompletionToggle = useCallback(
    (itemKey: string) => {
      const { categoryKey, slot } = parsePrioritySectionCompletionKey(itemKey);
      if (slot) {
        handleTogglePrioritySectionItemComplete(categoryKey, slot);
        return;
      }
      handleTogglePriorityRowComplete(categoryKey);
    },
    [handleTogglePriorityRowComplete, handleTogglePrioritySectionItemComplete],
  );

  const resolveTimelineCategorySettings = useCallback(
    (itemKey: string) => {
      const { categoryKey } = parsePrioritySectionCompletionKey(itemKey);
      onOpenCategorySettings?.(categoryKey);
    },
    [onOpenCategorySettings],
  );

  const handleTimelineReorderDragActiveChange = useCallback(
    (_key: string, active: boolean) => {
      if (active) {
        lockPriorityTimelineScroll();
        return;
      }
      unlockPriorityTimelineScroll();
    },
    [lockPriorityTimelineScroll, unlockPriorityTimelineScroll],
  );

  const handleTimelineReorderItemDragEnd = useCallback(
    (key: string, translationY: number, fromSlot: DayMealSlot, targetSlot: DayMealSlot) => {
      commitPriorityDisplayReorderFromDrag(key, translationY, fromSlot, targetSlot);
    },
    [commitPriorityDisplayReorderFromDrag],
  );

  const handleBagReorderDragActiveChange = useCallback(
    (_categoryKey: string, active: boolean) => {
      if (active) {
        lockPriorityTimelineScroll();
        return;
      }
      unlockPriorityTimelineScroll();
    },
    [lockPriorityTimelineScroll, unlockPriorityTimelineScroll],
  );

  /** 라이트: 대표 톤은 `dayPlanPalette` 그레이(containerLow)·진한 글자(onSurface) — 순백·채도 높은 다크 면 아님 */
  const editorial = useMemo(() => {
    if (isDark) {
      return {
        surface: bc.cover,
        ink: bc.ink,
        muted: bc.inkMuted,
        line: 'rgba(255,255,255,0.2)',
      };
    }
    return {
      surface: bc.cover,
      ink: bc.ink,
      muted: bc.inkMuted,
      line: c.catBorderIdle,
    };
  }, [isDark, bc.cover, bc.ink, bc.inkMuted, c.catBorderIdle]);

  const priorityTimeChipColors = useMemo(
    () =>
      isDark
        ? { bg: 'rgba(255,255,255,0.08)', pressed: 'rgba(255,255,255,0.13)' }
        : { bg: c.containerHigh, pressed: '#DDD8CE' },
    [c.containerHigh, isDark],
  );

  /** 당일(오늘) · 다음날 — 전날 열은 제외하고, 자정 넘김 종료일만 연장 카드로 표시 */
  const timelineThreeDayKeys = useMemo(
    () => [
      todayKey,
      addDaysToLocalDateKey(todayKey, 1),
    ],
    [todayKey],
  );

  const sortedTimelineFlowBlocks = useMemo(
    () => sortDayPlanBlocks(filterBagTimelineFlowBlocks(planBlocks)),
    [planBlocks],
  );

  useEffect(() => {
    const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
    if (!window) return;

    for (const block of planBlocks) {
      if (block.blockOrigin !== 'spineTimeline') continue;
      const clamped = clampSpineBlockToPriorityWindow(
        block.startMinutes,
        block.endMinutes,
        window,
      );
      if (!clamped) continue;
      if (
        clamped.startMinutes === block.startMinutes &&
        clamped.endMinutes === block.endMinutes
      ) {
        continue;
      }
      updatePlanBlock(block.id, {
        startMinutes: clamped.startMinutes,
        endMinutes: clamped.endMinutes,
      });
    }
  }, [planBlocks, priorityEnd, priorityStart, updatePlanBlock]);

  const spineNowMinutes = useMemo(() => {
    void mealSlotNowTick;
    return getLocalMinutesOfDayNow();
  }, [mealSlotNowTick]);

  const spineAnchorDateCaptions = useMemo(() => {
    const explicit = priorityPlanExplicitMultiDay;
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
    if (!explicit && !overnight) {
      return { dayStartDateCaption: undefined, dayEndDateCaption: undefined };
    }
    const { lo, hi } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
    const startKey = priorityClockCaptionDateKeyStart(lo);
    const endKey = priorityClockCaptionDateKeyEnd(hi, priorityStart, priorityEnd);
    return {
      dayStartDateCaption: formatDateKeyCompactKo(startKey),
      dayEndDateCaption: formatDateKeyCompactKo(endKey),
    };
  }, [
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay,
    priorityStart,
    priorityEnd,
  ]);

  const spineTimelineRows = useMemo(
    () =>
      buildSpineTimelineModel({
        priorityStart,
        priorityEnd,
        blocks: planBlocks,
        nowMinutes: spineNowMinutes,
        ...spineAnchorDateCaptions,
      }),
    [priorityStart, priorityEnd, planBlocks, spineNowMinutes, spineAnchorDateCaptions],
  );

  const completedBlockIdSet = useMemo(
    () => new Set(completedBlockIds),
    [completedBlockIds],
  );

  const spineTimelinePalette = useMemo(
    () => ({
      ink: editorial.ink,
      muted: editorial.muted,
      line: editorial.line,
      surface: editorial.surface,
      accent: isDark ? '#FAFAFA' : PRIMARY,
    }),
    [editorial.ink, editorial.line, editorial.muted, editorial.surface, isDark],
  );

  const mealSlotTimelineSections = useMemo(
    () =>
      mealSlotSectionsForDisplay.map((section) => ({
        slot: section.slot,
        title: section.title,
        hintTime: section.hintTime,
        isCurrent: section.isCurrent,
        ...(typeof section.progressToNext === 'number'
          ? { progressToNext: section.progressToNext }
          : {}),
        items: section.items.map((cat) => ({
          key: buildPrioritySectionCompletionKey(cat.key, section.slot),
          categoryKey: cat.key,
          label: cat.label,
          icon: cat.icon,
        })),
      })),
    [mealSlotSectionsForDisplay],
  );

  const confirmSpineBlockDelete = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      Alert.alert('일정 삭제', `「${block?.title ?? '일정'}」을 삭제할까요?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            removePlanBlock(blockId);
            setSpineEditDraft(null);
          },
        },
      ]);
    },
    [planBlocks, removePlanBlock],
  );

  const handleSpineAddBlockInGap = useCallback((fromMinutes: number, toMinutes: number) => {
    setAddRoutineTargetSlot(null);
    setSpinePendingGapBounds({ fromMinutes, toMinutes });
    setAddRoutineSheetOpen(true);
  }, []);

  const handleSpineToggleBlockComplete = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      if (completedBlockIdSet.has(blockId)) {
        uncompletePlanBlock(blockId);
        if (block) {
          for (const categoryKey of getFlowCompletionCategoryKeysForBlock(block)) {
            useDayPlanDraftStore.getState().untrackRoutineHistoryCompletion(categoryKey);
          }
        }
        return;
      }
      completePlanBlock(blockId);
      if (block) {
        for (const categoryKey of getFlowCompletionCategoryKeysForBlock(block)) {
          useDayPlanDraftStore.getState().trackRoutineHistoryCompletion(categoryKey);
        }
      }
    },
    [completePlanBlock, completedBlockIdSet, planBlocks, uncompletePlanBlock],
  );

  const handleSpinePressBlock = useCallback(
    (blockId: string) => {
      const block = planBlocks.find((b) => b.id === blockId);
      if (!block) return;
      setSpineEditDraft({
        blockId,
        title: block.title,
        categoryKey: block.categoryKey ?? null,
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        endsNextCalendarDay: Boolean(block.endsNextCalendarDay),
      });
    },
    [planBlocks],
  );

  const handleSpineDeleteBlock = useCallback(
    (blockId: string) => {
      confirmSpineBlockDelete(blockId);
    },
    [confirmSpineBlockDelete],
  );

  const handleSpineReorderBlocks = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderSpineBlocks(fromIndex, toIndex);
    },
    [reorderSpineBlocks],
  );

  const handleSpineSaveBlock = useCallback(
    (input: {
      title: string;
      categoryKey: string | null;
      startMinutes: number;
      endMinutes: number;
      endsNextCalendarDay: boolean;
      blockId?: string;
    }) => {
      const title = input.title.trim();
      if (!title) {
        alertSpineBlockSaveError('add', 'empty_title');
        return;
      }

      const planRangeLo =
        priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
      const planRangeHi =
        priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
      const rangeSpansMultiDay = planRangeLo !== planRangeHi;

      let clamped:
        | {
            startMinutes: number;
            endMinutes: number;
          }
        | null = null;

      if (rangeSpansMultiDay) {
        clamped = {
          startMinutes: Math.max(0, Math.min(Math.floor(input.startMinutes), 24 * 60 - 1)),
          endMinutes: Math.max(0, Math.min(Math.floor(input.endMinutes), 24 * 60)),
        };
      } else {
        const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
        if (!window) {
          alertSpineBlockSaveError(input.blockId ? 'update' : 'add', 'outside_window');
          return;
        }
        clamped = clampSpineBlockToPriorityWindow(
          input.startMinutes,
          input.endMinutes,
          window,
        );
        if (!clamped) {
          alertSpineBlockSaveError(input.blockId ? 'update' : 'add', 'outside_window');
          return;
        }
      }

      const linkedKey = input.categoryKey?.trim() || null;
      const categoryLabel = linkedKey ? getPickerCategoryLabel(linkedKey) : '';

      if (input.blockId) {
        const result = updatePlanBlock(input.blockId, {
          title,
          category: categoryLabel,
          categoryKey: linkedKey,
          startMinutes: clamped.startMinutes,
          endMinutes: clamped.endMinutes,
          endsNextCalendarDay: input.endsNextCalendarDay,
        });
        if (!result.ok) {
          alertSpineBlockSaveError('update', result.reason);
          return;
        }
      } else {
        const result = addPlanBlock({
          title,
          category: categoryLabel,
          ...(linkedKey ? { categoryKey: linkedKey } : {}),
          startMinutes: clamped.startMinutes,
          endMinutes: clamped.endMinutes,
          endsNextCalendarDay: input.endsNextCalendarDay,
          blockOrigin: 'spineTimeline',
          planDateKey: getLocalDateKey(),
        });
        if (!result.ok) {
          alertSpineBlockSaveError('add', result.reason);
          return;
        }
      }

      setSpineEditDraft(null);
    },
    [
      addPlanBlock,
      alertSpineBlockSaveError,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      updatePlanBlock,
    ],
  );

  const priorityWindowHhmm = useMemo(() => {
    const ps = parseHHmmToMinutes(priorityStart.trim());
    const pe = parseHHmmToMinutes(priorityEnd.trim());
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
    return { ps, pe, overnight };
  }, [priorityStart, priorityEnd]);

  const priorityWindowLine = useMemo(
    () => formatPriorityWindowLine(priorityStart, priorityEnd),
    [priorityStart, priorityEnd],
  );

  const { lo: planRangeLo, hi: planRangeHi } = useMemo(
    () => sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd),
    [priorityPlanDateKey, priorityPlanDateKeyEnd],
  );

  /**
   * 타임라인 카드 높이 = 사용 가능한 세로를 거의 꽉 채움(리스트·탭 사이 빈 면 최소화).
   * 내부 ScrollView가 긴 목록을 스크롤하고, 카드는 항상 이 높이를 씀.
   *
   * `useWindowDimensions`는 **전체 창** 높이라 탭바 실제 높이를 반영하지 않으면
   * 실기기에서 카드가 탭 터치 영역을 덮을 수 있다.
   * `useBottomTabBarHeight()`를 우선 사용하고, 초기 측정 전에는 보수적인 fallback을 쓴다.
   */
  const timelineCardHeight = useMemo(() => {
    const aboveCard =
      insets.top +
      /** DayPlan: scroll paddingTop·문의·모드 스위치·섹션 간격 */
      110;
    const tabBarReserve = Math.max(
      bottomTabBarHeight,
      DAY_PLAN_TAB_BAR_ROW_HEIGHT + insets.bottom,
    );
    /** 실기기 탭 hit area는 보존하면서, 본문 하단의 과한 빈 여백을 줄인다. */
    const belowCard = tabBarReserve + 14;
    /** `priorityTimelineOuter` 상·하 패딩 합과 동기화 */
    const outerVertical = 0;
    const availableHeight = windowHeight - aboveCard - belowCard - outerVertical;
    /** 큰 기기에서 카드가 과도하게 커져 하단이 비어 보이지 않도록 상한을 둔다. */
    const cappedHeight = Math.min(availableHeight, 410);
    return Math.max(240, cappedHeight);
  }, [windowHeight, insets.top, insets.bottom, bottomTabBarHeight]);

  const timelineDateIntro = useMemo(
    () => planDayIntroFromRange(todayKey, priorityPlanDateKey, priorityPlanDateKeyEnd),
    [todayKey, priorityPlanDateKey, priorityPlanDateKeyEnd],
  );

  const openPriorityTimeModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftPriorityStart(priorityStart);
    setDraftPriorityEnd(priorityEnd);
    const overnightNow =
      isOvernightHhmmRange(priorityStart, priorityEnd) ||
      priorityPlanDateKey !== priorityPlanDateKeyEnd;
    setDraftEndNextDay(overnightNow);
    draftEndNextDayPinnedRef.current = false;
    setPriorityTimeModalOpen(true);
  }, [priorityEnd, priorityStart, priorityPlanDateKey, priorityPlanDateKeyEnd]);

  const setDraftPriorityStartWithSync = useCallback(
    (next: string) => {
      setDraftPriorityStart(next);
      if (!draftEndNextDayPinnedRef.current) {
        setDraftEndNextDay(isOvernightHhmmRange(next, draftPriorityEnd));
      }
    },
    [draftPriorityEnd],
  );

  const setDraftPriorityEndWithSync = useCallback(
    (next: string) => {
      setDraftPriorityEnd(next);
      if (!draftEndNextDayPinnedRef.current) {
        setDraftEndNextDay(isOvernightHhmmRange(draftPriorityStart, next));
      }
    },
    [draftPriorityStart],
  );

  const toggleDraftEndNextDay = useCallback(
    (target: boolean) => {
      void Haptics.selectionAsync();
      draftEndNextDayPinnedRef.current = true;
      setDraftEndNextDay(target);
    },
    [],
  );

  const closePriorityTimeModal = useCallback(() => {
    Keyboard.dismiss();
    setPriorityTimeModalOpen(false);
  }, []);

  const confirmPriorityTimeModal = useCallback(() => {
    Keyboard.dismiss();
    const ps = parseHHmmToMinutes(draftPriorityStart);
    const pe = parseHHmmToMinutes(draftPriorityEnd);
    if (ps !== null && pe !== null && !draftEndNextDay && pe <= ps) {
      Alert.alert('시간 구간', '당일 종료를 쓰려면 종료 시각이 시작 시각보다 늦어야 해요.');
      return;
    }
    onChangePriorityStart(draftPriorityStart);
    onChangePriorityEnd(draftPriorityEnd);
    const isNaturalOvernight = isOvernightHhmmRange(draftPriorityStart, draftPriorityEnd);
    if (draftEndNextDay && !isNaturalOvernight) {
      const { lo } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
      const nextDay = addDaysToLocalDateKey(lo, 1);
      applyPriorityPlanCalendarRange(lo, nextDay);
    } else if (!draftEndNextDay && isNaturalOvernight) {
      const { lo } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
      applyPriorityPlanCalendarRange(lo, lo);
    }
    setPriorityTimeModalOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    draftPriorityEnd,
    draftPriorityStart,
    draftEndNextDay,
    onChangePriorityEnd,
    onChangePriorityStart,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    applyPriorityPlanCalendarRange,
  ]);

  /** c.containerLow 한 값을 모든 컨테이너에 직접 지정 — 중간 View 투명 영역에서 톤 차이 원천 제거 */
  const surfaceBg = c.containerLow;

  return (
    <View style={[styles.prioritySectionRoot, { backgroundColor: surfaceBg }]}>
      <Modal
        visible={iosDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIosDateModalOpen(false)}>
        <View style={styles.dateModalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.dateModalDimTouch}
            onPress={() => setIosDateModalOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          />
          <View
            style={[
              styles.dateModalSheet,
              {
                backgroundColor: c.containerLow,
                paddingBottom: Math.max(insets.bottom, 12) + 8,
                paddingHorizontal: 20,
              },
            ]}>
            <View
              style={[
                styles.dateModalGrabber,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
              ]}
              accessibilityLabel="시트"
            />
            <ThemedText style={[styles.dateModalTitle, { color: c.onSurface }]}>적용 기간 선택</ThemedText>
            <ThemedText style={[styles.dateModalRangeSummary, { color: c.onSurface }]}>
              {calendarRangeAnchor !== null
                ? `시작: ${formatDateKeyCompactKo(calendarRangeAnchor)} · 다른 날을 탭하면 그날까지 범위로 잡혀요`
                : modalDraftRange.isSingle
                  ? `${modalDraftRange.loCompact} 하루 · 설정 완료를 눌러 주세요`
                  : `현재 기간: ${modalDraftRange.loCompact} ~ ${modalDraftRange.hiCompact} · 바꾸려면 날짜를 탭하세요`}
            </ThemedText>
            <ThemedText style={[styles.dateModalHint, { color: c.onVariant }]}>
              첫 탭은 시작일, 두 번째 탭은 끝 날짜예요. 범위가 맞으면 설정 완료를 눌러 주세요. 하루만 쓰면 한 번 탭한 뒤 바로 설정 완료하면 돼요.
            </ThemedText>
            <View style={styles.dateMonthHeader}>
              <View style={styles.dateMonthHeaderSide}>
                <Pressable
                  style={[styles.dateMonthNavBtn, { borderColor: c.catBorderIdle }]}
                  onPress={() => {
                    setMonthCursor((prev) =>
                      addMonths(toMonthStart(normalizeToDate(prev, safeMonthCursor)), -1),
                    );
                  }}>
                  <ThemedText style={[styles.dateMonthNavText, { color: c.onSurface }]}>‹</ThemedText>
                </Pressable>
              </View>
              <View style={styles.dateMonthTitleWrap}>
                <ThemedText style={[styles.dateMonthTitle, { color: c.onSurface }]} numberOfLines={1}>
                  {monthTitle}
                </ThemedText>
              </View>
              <View style={styles.dateMonthHeaderSide}>
                <Pressable
                  style={[styles.dateMonthNavBtn, { borderColor: c.catBorderIdle }]}
                  onPress={() => {
                    setMonthCursor((prev) =>
                      addMonths(toMonthStart(normalizeToDate(prev, safeMonthCursor)), 1),
                    );
                  }}>
                  <ThemedText style={[styles.dateMonthNavText, { color: c.onSurface }]}>›</ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={[styles.calendarFrame, { borderColor: c.catBorderIdle }]}>
              <View style={styles.calendarTodayRow}>
                <Pressable
                  onPress={resetCalendarDraftToToday}
                  accessibilityRole="button"
                  accessibilityLabel="적용 기간 선택을 오늘 하루로 초기화"
                  style={[
                    styles.calendarTodayBtn,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <ThemedText style={[styles.calendarTodayBtnText, { color: c.onSurface }]}>초기화</ThemedText>
                </Pressable>
                <Pressable
                  onPress={jumpToTodayInCalendar}
                  accessibilityRole="button"
                  accessibilityLabel="오늘로 이동해 선택"
                  style={[
                    styles.calendarTodayBtn,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <ThemedText style={[styles.calendarTodayBtnText, { color: c.onSurface }]}>오늘</ThemedText>
                </Pressable>
              </View>
              <View style={styles.calendarWeekHeaderRow}>
                {weekdayLabels.map((label) => (
                  <ThemedText key={label} style={[styles.calendarWeekHeaderText, { color: c.onVariant }]}>
                    {label}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {(() => {
                  const rangeLo = draftRangeStart <= draftRangeEnd ? draftRangeStart : draftRangeEnd;
                  const rangeHi = draftRangeStart <= draftRangeEnd ? draftRangeEnd : draftRangeStart;
                  return calendarDays.map((d) => {
                    const dk = localDateToDateKey(d);
                    const inCurrentMonth = d.getMonth() === safeMonthCursor.getMonth();
                    const isToday = isSameDay(d, new Date());
                    const inRange = dk >= rangeLo && dk <= rangeHi;
                    const isEndpoint = inRange && (dk === rangeLo || dk === rangeHi);
                    const isMiddle = inRange && rangeLo !== rangeHi && dk !== rangeLo && dk !== rangeHi;
                    return (
                      <Pressable
                        key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                        onPress={() => onDraftDayPress(dk)}
                        style={[
                          styles.calendarDayCell,
                          isEndpoint && styles.calendarDayCellSelected,
                          isMiddle && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
                          },
                          !inCurrentMonth && styles.calendarDayCellOutMonth,
                        ]}>
                        <ThemedText
                          style={[
                            styles.calendarDayText,
                            { color: inCurrentMonth ? c.onSurface : c.onVariant },
                            isEndpoint && styles.calendarDayTextSelected,
                            isMiddle && { color: c.onSurface },
                            isToday && !isEndpoint && !isMiddle && { color: PRIMARY },
                          ]}>
                          {d.getDate()}
                        </ThemedText>
                      </Pressable>
                    );
                  });
                })()}
              </View>
            </View>
            <View style={styles.dateActionRow}>
              <Pressable
                style={[styles.dateActionBtn, styles.dateActionGhost, { borderColor: c.catBorderIdle }]}
                onPress={() => setIosDateModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="취소하고 닫기">
                <ThemedText style={[styles.dateActionText, { color: c.onSurface }]}>취소</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.dateActionBtn, styles.dateActionPrimary]}
                onPress={onConfirmCalendarRange}
                accessibilityRole="button"
                accessibilityLabel="선택한 기간 적용">
                <ThemedText style={[styles.dateActionText, { color: '#fff' }]}>설정 완료</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={priorityTimeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closePriorityTimeModal}>
        <KeyboardAvoidingView
          style={styles.timeModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 12}>
          <Pressable
            style={styles.timeModalDim}
            onPress={closePriorityTimeModal}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          />
          <View
            style={[
              styles.timeModalCard,
              {
                backgroundColor: c.containerLow,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            ]}>
            <ThemedText style={[styles.dateModalTitle, { color: c.onSurface }]}>집중 구간 시간</ThemedText>
            <ThemedText style={[styles.dateModalHint, { color: c.onVariant }]}>
              시작·종료를 맞춘 뒤 설정 완료를 눌러 주세요.
            </ThemedText>
            <View style={styles.timeModalFlipWrap}>
              <View style={[styles.timeRibbonInner, { backgroundColor: 'transparent' }]}>
                <View style={styles.timeFlipColumn}>
                  <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>시작</ThemedText>
                  <FlipClockTimePair
                    value={draftPriorityStart}
                    onChange={setDraftPriorityStartWithSync}
                    dateCaption={modalClockFaceHints.startDateCaption}
                    palette={flipClockColors}
                  />
                </View>
                <View style={styles.timeFlipColumn}>
                  <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>종료</ThemedText>
                  <FlipClockTimePair
                    value={draftPriorityEnd}
                    onChange={setDraftPriorityEndWithSync}
                    clockRole="end"
                    partnerStartHhmm={draftPriorityStart}
                    nextDayHint={modalClockFaceHints.endNextDayOnlyBadge}
                    dateCaption={modalClockFaceHints.endDateCaption}
                    palette={flipClockColors}
                  />
                </View>
              </View>
            </View>
            <View style={styles.endDateChoiceRow}>
              <Pressable
                style={[
                  styles.endDateChoiceBtn,
                  {
                    backgroundColor: !draftEndNextDay ? tabColors.activeBg : tabColors.inactiveBg,
                    borderColor: !draftEndNextDay ? tabColors.activeBorder : tabColors.inactiveBorder,
                    borderWidth: !draftEndNextDay ? 2 : 1,
                  },
                ]}
                onPress={() => toggleDraftEndNextDay(false)}>
                <ThemedText
                  style={[
                    styles.endDateChoiceText,
                    { color: !draftEndNextDay ? tabColors.activeIcon : tabColors.inactiveIcon },
                  ]}>
                  당일
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.endDateChoiceBtn,
                  {
                    backgroundColor: draftEndNextDay ? tabColors.activeBg : tabColors.inactiveBg,
                    borderColor: draftEndNextDay ? tabColors.activeBorder : tabColors.inactiveBorder,
                    borderWidth: draftEndNextDay ? 2 : 1,
                  },
                ]}
                onPress={() => toggleDraftEndNextDay(true)}>
                <ThemedText
                  style={[
                    styles.endDateChoiceText,
                    { color: draftEndNextDay ? tabColors.activeIcon : tabColors.inactiveIcon },
                  ]}>
                  다음 날
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.dateActionRow}>
              <Pressable
                style={[styles.dateActionBtn, styles.dateActionGhost, { borderColor: c.catBorderIdle }]}
                onPress={closePriorityTimeModal}
                accessibilityRole="button"
                accessibilityLabel="취소하고 닫기">
                <ThemedText style={[styles.dateActionText, { color: c.onSurface }]}>취소</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.dateActionBtn, styles.dateActionPrimary]}
                onPress={confirmPriorityTimeModal}
                accessibilityRole="button"
                accessibilityLabel="집중 구간 시간 적용">
                <ThemedText style={[styles.dateActionText, { color: '#fff' }]}>설정 완료</ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SpineBlockEditSheet
        visible={spineEditDraft != null}
        draft={spineEditDraft}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={editorial.surface}
        line={editorial.line}
        priorityStart={priorityStart}
        priorityEnd={priorityEnd}
        onClose={() => setSpineEditDraft(null)}
        onSave={handleSpineSaveBlock}
        onDelete={confirmSpineBlockDelete}
        onOpenCategorySettings={
          onOpenCategorySettings
            ? (categoryKey) => {
                setSpineEditDraft(null);
                onOpenCategorySettings(categoryKey);
              }
            : undefined
        }
        completed={spineEditDraft != null && completedBlockIdSet.has(spineEditDraft.blockId)}
        onToggleComplete={
          spineEditDraft != null
            ? () => handleSpineToggleBlockComplete(spineEditDraft.blockId)
            : undefined
        }
      />

      <View style={[styles.bookOuter, { backgroundColor: surfaceBg, flex: 1, minHeight: 0 }]}>
        {/* 기간·집중 구간 — 다일 타임라인 카드 (달력·시계는 각각 모달) */}
        <View style={styles.priorityTimelineOuter}>
          <View
            style={[
              styles.priorityTimelineCard,
              {
                backgroundColor: editorial.surface,
              },
            ]}>
            <View
              style={[
                styles.priorityTimelineHeader,
                {
                  borderBottomColor: editorial.line,
                  backgroundColor: editorial.surface,
                },
              ]}>
              <View style={styles.priorityTimelineHeaderText}>
                {layoutMode === 'sections' ? (
                  <>
                    <View style={styles.priorityTimelineTitleRow}>
                      <ThemedText
                        style={[styles.priorityTimelineTitle, { color: editorial.ink }]}
                        lightColor={editorial.ink}
                        darkColor={editorial.ink}
                        numberOfLines={2}>
                        {formatTimelineHeaderDateKo(todayKey)}
                      </ThemedText>
                      <MealSlotScheduleEditButton
                        palette={spineTimelinePalette}
                        isDark={isDark}
                        compact
                        onPress={() => openMealSlotScheduleEditor()}
                      />
                    </View>
                    <View style={styles.priorityTimelineSubRow}>
                      <ThemedText
                        style={[styles.priorityTimelineSub, { color: editorial.muted }]}
                        lightColor={editorial.muted}
                        darkColor={editorial.muted}>
                        {timelineDateIntro}
                        {' · '}
                      </ThemedText>
                      <PriorityWindowTimeChip
                        line={priorityWindowLine}
                        ink={editorial.ink}
                        muted={editorial.muted}
                        chipBg={priorityTimeChipColors.bg}
                        chipBgPressed={priorityTimeChipColors.pressed}
                        onPress={openPriorityTimeModal}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <ThemedText
                      style={[styles.priorityTimelineTitle, { color: editorial.ink }]}
                      lightColor={editorial.ink}
                      darkColor={editorial.ink}
                      numberOfLines={2}>
                      {formatTimelineHeaderDateKo(todayKey)}
                    </ThemedText>
                    <View style={styles.priorityTimelineSubRow}>
                      <ThemedText
                        style={[styles.priorityTimelineSub, { color: editorial.muted }]}
                        lightColor={editorial.muted}
                        darkColor={editorial.muted}>
                        {timelineDateIntro}
                        {' · '}
                      </ThemedText>
                      <PriorityWindowTimeChip
                        line={priorityWindowLine}
                        ink={editorial.ink}
                        muted={editorial.muted}
                        chipBg={priorityTimeChipColors.bg}
                        chipBgPressed={priorityTimeChipColors.pressed}
                        onPress={openPriorityTimeModal}
                      />
                    </View>
                  </>
                )}
              </View>
              <View style={styles.priorityTimelineHeaderActions}>
                <DayPlanLayoutModeTabs
                  mode={layoutMode}
                  onSelectMode={onSelectLayoutMode}
                  c={c}
                  isDark={isDark}
                  visibleModes={visibleLayoutModes}
                />
              </View>
            </View>
            <ScrollView
              ref={priorityTimelineScrollRef}
              nestedScrollEnabled
              scrollEnabled={!spineDragActive}
              showsVerticalScrollIndicator={false}
              style={styles.priorityTimelineScroll}
              contentContainerStyle={[
                styles.priorityTimelineScrollContent,
                { paddingBottom: TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM },
              ]}
              keyboardShouldPersistTaps="handled">
              {layoutMode === 'sections' ? (
                <MealSlotTimelineView
                  sections={mealSlotTimelineSections}
                  palette={spineTimelinePalette}
                  isDark={isDark}
                  isFocusStarted={isFocusStarted}
                  isItemCompleted={resolveTimelineItemCompleted}
                  reorderEnabled={sectionsCount >= 1}
                  onPressAddRoutine={openAddRoutineForSlot}
                  onToggleItemComplete={resolveTimelineCompletionToggle}
                  onOpenItemSettings={resolveTimelineCategorySettings}
                  onReorderDragActiveChange={handleTimelineReorderDragActiveChange}
                  onReorderItemDragEnd={handleTimelineReorderItemDragEnd}
                />
              ) : layoutMode === 'spine' ? (
                <SpineTimelineView
                  rows={spineTimelineRows}
                  completedBlockIds={completedBlockIdSet}
                  nowMinutes={spineNowMinutes}
                  isDark={isDark}
                  palette={spineTimelinePalette}
                  rowSurface={editorial.surface}
                  onAddBlockInGap={handleSpineAddBlockInGap}
                  onPressBlock={handleSpinePressBlock}
                  onDeleteBlock={handleSpineDeleteBlock}
                  onReorderBlocks={handleSpineReorderBlocks}
                  onReorderDragActiveChange={setSpineDragActive}
                />
              ) : (
              timelineThreeDayKeys.map((dk) => {
                const d = parseLocalDateKeyToDate(dk);
                const dayNum = d ? d.getDate() : '';
                const wd = weekdayShortKoFromDateKey(dk);
                const isPastDay = dk < todayKey;
                const isMainDay = dk === todayKey;
                const isStoreDay = dk === dayPlanDateKey;
                const blocks = isStoreDay ? sortedTimelineFlowBlocks : [];
                const overnightWindow = isOvernightHhmmRange(priorityStart, priorityEnd);
                const tomorrowDk = addDaysToLocalDateKey(todayKey, 1);
                const todayWithinPriorityPlan = todayKey >= planRangeLo && todayKey <= planRangeHi;
                /** 자정 넘김 종료일(다음날 새벽) — 전날과 같은 우선순위를 ‘연장’ 블록으로 표시 */
                const isOvernightTailDay =
                  overnightWindow && todayWithinPriorityPlan && dk === tomorrowDk;
                const showPriorityInMainTimeline =
                  (bagCount > 0 || priorityMealSlotLayoutEnabled) && isMainDay;
                const showOvernightPriorityContinuation = isOvernightTailDay && bagCount > 0;
                const showPriorityListBelow =
                  showPriorityInMainTimeline || showOvernightPriorityContinuation;
                /** 오늘 + 자정 넘김 종료일(꼬리) — 동일한 ‘활성’ 톤·레이아웃 */
                const isPriorityStripPrimary = isMainDay || showOvernightPriorityContinuation;
                const eventTitleColor = isPastDay
                  ? editorial.muted
                  : isPriorityStripPrimary
                    ? editorial.ink
                    : editorial.muted;
                const timeColW = isPriorityStripPrimary ? 100 : 58;
                const timeFont = isPriorityStripPrimary ? 11 : 10;
                const titleFont = isPriorityStripPrimary ? 15 : 12;
                const titleWeight: '500' | '600' | '700' = isPriorityStripPrimary ? '600' : '500';
                const dayLeftW = isPriorityStripPrimary ? 52 : 34;
                const wdFont = isPriorityStripPrimary ? 11 : 9;
                const wdLetter = isPriorityStripPrimary ? 1.4 : 0.4;
                const numSize = isPriorityStripPrimary ? undefined : 14;
                /** 다줄 합본·집중 구간과 동일 시각의 우선순위 블록은 타임라인 행에서 숨기고 아래 목록만 사용 */
                const timelineBlocksForDay = blocks.filter((b) => {
                  if (b.blockOrigin === 'prioritySession') return false;
                  if (isPriorityCompoundBlockTitle(b.title)) return false;
                  const matchesPriorityWindow =
                    isMainDay &&
                    priorityWindowHhmm.ps !== null &&
                    priorityWindowHhmm.pe !== null &&
                    blockMatchesPriorityHhmmWindow(
                      b,
                      priorityWindowHhmm.ps,
                      priorityWindowHhmm.pe,
                      priorityWindowHhmm.overnight,
                    );
                  if (!matchesPriorityWindow) return true;
                  /** 담기가 비면 showPriority가 꺼져 단일 카탈로그 줄 블록이 다시 노출되는 것을 막음 */
                  if (showPriorityInMainTimeline) return false;
                  if (isLikelyPriorityCatalogMonolineTitle(b.title)) return false;
                  return true;
                });
                return (
                  <View
                    key={dk}
                    style={[
                      styles.priorityTimelineDayColumn,
                      isPriorityStripPrimary && styles.priorityTimelineDayColumnMain,
                      isPastDay && styles.priorityTimelineDayPast,
                      !isPriorityStripPrimary && !isPastDay && styles.priorityTimelineDayFutureSide,
                    ]}>
                    <View
                      style={[
                        styles.priorityTimelineDayRow,
                        isPriorityStripPrimary
                          ? styles.priorityTimelineDayRowMain
                          : styles.priorityTimelineDayRowSide,
                      ]}>
                      <View style={[styles.priorityTimelineDayLeft, { width: dayLeftW }]}>
                        <ThemedText
                          style={[
                            styles.priorityTimelineWd,
                            {
                              color: isPriorityStripPrimary ? editorial.ink : editorial.muted,
                              fontWeight: isPriorityStripPrimary ? '800' : '600',
                              letterSpacing: wdLetter,
                              fontSize: wdFont,
                            },
                          ]}
                          lightColor={isPriorityStripPrimary ? editorial.ink : editorial.muted}
                          darkColor={isPriorityStripPrimary ? editorial.ink : editorial.muted}>
                          {wd}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.priorityTimelineDayNum,
                            numSize != null && { fontSize: numSize, fontWeight: '700', letterSpacing: -0.3 },
                            { color: editorial.ink },
                            isPriorityStripPrimary && styles.priorityTimelineDayNumToday,
                          ]}
                          lightColor={editorial.ink}
                          darkColor={editorial.ink}>
                          {dayNum}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.priorityTimelineDayRight,
                          isPriorityStripPrimary
                            ? styles.priorityTimelineDayRightMain
                            : styles.priorityTimelineDayRightSide,
                          {
                            paddingTop: isPriorityStripPrimary ? 12 : 4,
                          },
                        ]}>
                        {isMainDay && bagCount === 0 && !priorityMealSlotLayoutEnabled ? (
                          <View
                            style={[
                              styles.priorityMainEmptyHint,
                              {
                                borderColor: editorial.line,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(0,0,0,0.025)',
                              },
                            ]}>
                            <ThemedText
                              style={[styles.priorityMainEmptyHintTitle, { color: editorial.ink }]}
                              lightColor={editorial.ink}
                              darkColor={editorial.ink}>
                              담기 목록이 비어 있어요
                            </ThemedText>
                            <ThemedText
                              style={[styles.priorityMainEmptyHintBody, { color: editorial.muted }]}
                              lightColor={editorial.muted}
                              darkColor={editorial.muted}>
                              버튼을 눌러 오늘 할 루틴을 추가해 주세요.
                            </ThemedText>
                            <PriorityMealSlotAddRoutineRow
                              label="루틴 추가"
                              ink={editorial.ink}
                              line={editorial.line}
                              isDark={isDark}
                              onPress={openAddRoutineForBag}
                            />
                          </View>
                        ) : null}
                        {timelineBlocksForDay.length > 0
                          ? timelineBlocksForDay.map((block, bi) => {
                            const dotTone =
                              bi % 4 === 0
                                ? isDark
                                  ? 'rgba(255,255,255,0.95)'
                                  : 'rgba(0,0,0,0.85)'
                                : bi % 4 === 1
                                  ? isDark
                                    ? 'rgba(255,255,255,0.55)'
                                    : 'rgba(0,0,0,0.45)'
                                  : bi % 4 === 2
                                    ? isDark
                                      ? 'rgba(255,255,255,0.4)'
                                      : 'rgba(0,0,0,0.35)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.7)'
                                      : 'rgba(0,0,0,0.55)';
                            const dotTop = isPriorityStripPrimary ? 6 : 4;
                            return (
                              <View key={block.id} style={styles.priorityTimelineEventRowHoriz}>
                                <ThemedText
                                  style={[
                                    styles.priorityTimelineEventTimeCol,
                                    { color: editorial.muted, width: timeColW, fontSize: timeFont },
                                  ]}
                                  lightColor={editorial.muted}
                                  darkColor={editorial.muted}
                                  numberOfLines={3}>
                                  {formatBlockTimeRange(block)}
                                </ThemedText>
                                <View
                                  style={[styles.priorityTimelineDot, { backgroundColor: dotTone, marginTop: dotTop }]}
                                />
                                <ThemedText
                                  style={[
                                    styles.priorityTimelineEventTitleHoriz,
                                    {
                                      color: eventTitleColor,
                                      fontWeight: titleWeight,
                                      fontSize: titleFont,
                                      lineHeight: isPriorityStripPrimary ? 19 : 17,
                                    },
                                  ]}
                                  lightColor={eventTitleColor}
                                  darkColor={eventTitleColor}
                                  numberOfLines={2}>
                                  {block.title}
                                </ThemedText>
                              </View>
                            );
                          })
                          : null}

                        {showOvernightPriorityContinuation ? (
                          <View
                            style={[
                              styles.overnightContinuationBlock,
                              timelineBlocksForDay.length > 0 || showPriorityInMainTimeline
                                ? { marginTop: 12 }
                                : null,
                            ]}>
                            <View style={styles.overnightTailHeadBlock}>
                              <ThemedText
                                style={[styles.overnightTailEndTime, { color: editorial.ink }]}
                                lightColor={editorial.ink}
                                darkColor={editorial.ink}
                                numberOfLines={1}>
                                {formatOvernightTailEndHeadline(priorityEnd)}
                              </ThemedText>
                              <View
                                style={[
                                  styles.overnightTailDivider,
                                  { backgroundColor: editorial.line },
                                ]}
                              />
                            </View>
                          </View>
                        ) : null}

                      </View>
                    </View>

                    {showPriorityInMainTimeline ? (
                      <View
                        style={[
                          styles.priorityInlineListUnderDate,
                          isPriorityStripPrimary && styles.priorityInlineListUnderDateMain,
                          timelineBlocksForDay.length > 0 && styles.priorityInlineListUnderDateAfterEvents,
                        ]}>
                        {blocks.length === 0 ? (
                          <ThemedText
                            style={[styles.priorityTimelineKicker, { color: editorial.muted }]}
                            lightColor={editorial.muted}
                            darkColor={editorial.muted}
                            numberOfLines={2}>
                            {priorityWindowLine}
                          </ThemedText>
                        ) : null}
                        <View style={styles.priorityInlineList}>
                          {(() => {
                            const allowBagReorder = orderedSelectedItemsForDisplay.length >= 2;

                            const renderBagRow = (
                              cat: (typeof orderedSelectedItemsForDisplay)[number],
                              options?: { fromSlot?: DayMealSlot; rowKey?: string },
                            ) => {
                              const rowKey = options?.rowKey ?? cat.key;
                              const rowDone = options?.fromSlot
                                ? isPrioritySectionItemCompleted(cat.key, options.fromSlot)
                                : isPriorityRowCompleted(cat.key);

                              return (
                                <Reanimated.View
                                  key={rowKey}
                                  layout={priorityRowLayoutAnim ? PRIORITY_ROW_LAYOUT : undefined}
                                  exiting={priorityRowLayoutAnim ? PRIORITY_ROW_EXITING : undefined}
                                  style={styles.priorityOrderRowAnimWrap}
                                  onLayout={(e) => {
                                    const h = e.nativeEvent.layout.height;
                                    if (h > 0) {
                                      priorityBagRowHeightRef.current = h;
                                    }
                                  }}>
                                  <PriorityOrderRow
                                    categoryKey={cat.key}
                                    icon={cat.icon}
                                    label={cat.label}
                                    subtitle={null}
                                    itemPriority={resolveCategoryImportance(
                                      priorityCategoryImportance,
                                      cat.key,
                                    )}
                                    onCycleItemPriority={() =>
                                      cyclePriorityCategoryImportance(cat.key)
                                    }
                                    isFocusStarted={isFocusStarted}
                                    isCompleted={rowDone}
                                    isDark={isDark}
                                    ink={editorial.ink}
                                    inkMuted={editorial.muted}
                                    line={editorial.line}
                                    onToggleFocusComplete={() => {
                                      if (options?.fromSlot) {
                                        handleTogglePrioritySectionItemComplete(
                                          cat.key,
                                          options.fromSlot,
                                        );
                                        return;
                                      }
                                      handleTogglePriorityRowComplete(cat.key);
                                    }}
                                    onReorderDragTranslationEnd={
                                      allowBagReorder
                                        ? (ty) =>
                                            commitPriorityDisplayReorderFromDrag(
                                              cat.key,
                                              ty,
                                              options?.fromSlot,
                                            )
                                        : undefined
                                    }
                                    onReorderDragActiveChange={
                                      allowBagReorder
                                        ? (active) => handleBagReorderDragActiveChange(cat.key, active)
                                        : undefined
                                    }
                                    onSettings={
                                      onOpenCategorySettings
                                        ? () => onOpenCategorySettings(cat.key)
                                        : undefined
                                    }
                                    onFinishForToday={
                                      isFocusStarted
                                        ? () =>
                                            handleFinishPriorityCategoryForToday(cat.key, cat.label)
                                        : undefined
                                    }
                                    onFocusDetail={
                                      onOpenFocusDetail
                                        ? () => onOpenFocusDetail(cat.key)
                                        : undefined
                                    }
                                    animateOnMount={lastAddedCategoryKey === cat.key}
                                  />
                                </Reanimated.View>
                              );
                            };

                            if (!showSectionsView) {
                              return (
                                <>
                                  {orderedSelectedItemsForDisplay.map((cat) => renderBagRow(cat))}
                                  <PriorityMealSlotAddRoutineRow
                                    label="루틴 더 추가"
                                    ink={editorial.ink}
                                    line={editorial.line}
                                    isDark={isDark}
                                    onPress={openAddRoutineForBag}
                                  />
                                </>
                              );
                            }

                            return (
                              <>
                                {bagCount === 0 ? (
                                  <ThemedText
                                    style={[styles.prioritySectionsEmptyLead, { color: editorial.muted }]}
                                    lightColor={editorial.muted}
                                    darkColor={editorial.muted}>
                                    아래에서 항목을 추가하면 구간에 자동 배치돼요.
                                  </ThemedText>
                                ) : null}
                                {mealSlotSectionsForDisplay.map((section, sectionIndex) => (
                                  <View key={section.slot} style={styles.priorityMealSlotSection}>
                                    <PriorityMealSlotSectionHeader
                                      title={section.title}
                                      hintTime={formatHhmmClockKo(section.hintTime)}
                                      ink={editorial.ink}
                                      muted={editorial.muted}
                                      line={editorial.line}
                                      isDark={isDark}
                                      isCurrent={section.isCurrent}
                                      isFirst={sectionIndex === 0}
                                      onPressHintTime={() => openMealSlotScheduleEditor(section.slot)}
                                    />
                                    {section.items.length === 0 ? (
                                      <PriorityMealSlotAddRoutineRow
                                        ink={editorial.ink}
                                        line={editorial.line}
                                        isDark={isDark}
                                        onPress={() => openAddRoutineForSlot(section.slot)}
                                      />
                                    ) : (
                                      <>
                                        {section.items.map((cat) =>
                                          renderBagRow(cat, {
                                            fromSlot: section.slot,
                                            rowKey: `${section.slot}:${cat.key}`,
                                          }),
                                        )}
                                        <PriorityMealSlotAddRoutineRow
                                          label="루틴 더 연결"
                                          ink={editorial.ink}
                                          line={editorial.line}
                                          isDark={isDark}
                                          onPress={() => openAddRoutineForSlot(section.slot)}
                                        />
                                      </>
                                    )}
                                  </View>
                                ))}
                              </>
                            );
                          })()}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      <DayMealSlotScheduleSheet
        visible={mealSlotScheduleSheetOpen}
        schedule={mealSlotSchedule}
        isDark={isDark}
        initialExpandedSlot={mealSlotScheduleFocusSlot}
        onClose={() => setMealSlotScheduleSheetOpen(false)}
        onSave={persistMealSlotSchedule}
      />

      <PriorityRoutinePickerSheet
        visible={addRoutineSheetOpen}
        title={addRoutineSheetTitle}
        confirmLabel={addRoutineSheetConfirmLabel}
        sections={addableRoutineSections}
        spineGapAdd={spineGapAddConfig}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={editorial.surface}
        line={editorial.line}
        onClose={() => {
          setAddRoutineSheetOpen(false);
          setAddRoutineTargetSlot(null);
          setSpinePendingGapBounds(null);
        }}
        onConfirm={handleConfirmAddRoutinesToSlot}
        onCreateCustom={() => {
          router.push('/(tabs)/priority-catalog');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Fragment 대신 단일 루트 — 부모 ScrollView gap·자식 평탄화로 생기는 밝은 띠 방지 */
  prioritySectionRoot: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'visible',
  },
  priorityTimelineOuter: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  priorityTimelineCard: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  priorityTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 10,
  },
  priorityTimelineHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  priorityTimelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityTimelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  priorityTimelineSub: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  priorityTimelineSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  priorityTimelineTimeTap: {
    fontWeight: '600',
  },
  priorityTimelineTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 1,
  },
  priorityTimelineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 2,
    marginLeft: 4,
  },
  priorityTimelineScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  priorityTimelineScrollContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  /** 날짜 행 아래에 우선순위 리스트를 두기 위한 세로 래퍼 */
  priorityTimelineDayColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  priorityTimelineDayColumnMain: {
    gap: 10,
  },
  priorityTimelineDayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
  },
  /** 당일(오늘) — 넓은 간격·큰 터치 영역 */
  priorityTimelineDayRowMain: {
    paddingVertical: 10,
    gap: 12,
    marginBottom: 2,
  },
  /** 전날·다음날 — 압축 */
  priorityTimelineDayRowSide: {
    paddingVertical: 2,
    gap: 10,
    marginBottom: 0,
  },
  priorityTimelineDayPast: {
    opacity: 0.32,
  },
  priorityTimelineDayFutureSide: {
    opacity: 0.52,
  },
  priorityTimelineDayLeft: {
    alignItems: 'center',
    paddingTop: 2,
    gap: 2,
  },
  priorityTimelineWd: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  priorityTimelineDayNum: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  priorityTimelineDayNumToday: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  priorityTimelineDayRight: {
    flex: 1,
    minWidth: 0,
  },
  priorityTimelineDayRightMain: {
    gap: 12,
  },
  priorityTimelineDayRightSide: {
    gap: 8,
  },
  /** 모의안: 한 줄에 시간(w-20) · 점 · 제목 */
  priorityTimelineEventRowHoriz: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  priorityTimelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  priorityTimelineEventTimeCol: {
    flexShrink: 0,
    fontWeight: '500',
    paddingTop: 2,
    letterSpacing: -0.05,
  },
  priorityTimelineEventTitleHoriz: {
    flex: 1,
    minWidth: 0,
    letterSpacing: -0.15,
  },
  priorityTimelineEventTextStack: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  /** 오늘 행 안에 우선순위 OrderRow 목록 */
  priorityInlineList: {
    width: '100%',
    alignSelf: 'stretch',
  },
  priorityMealSlotSection: {
    width: '100%',
  },
  prioritySectionsEmptyLead: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 8,
  },
  priorityMealSlotEmptyHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    paddingBottom: 6,
    paddingLeft: 2,
  },
  /** Reanimated layout/exit — 드래그 중 `translateY`가 잘리지 않도록 visible */
  priorityOrderRowAnimWrap: {
    width: '100%',
    overflow: 'visible',
  },
  /** 날짜(요일·일) 열과 같은 좌측 시작선 — 리스트를 그 아래 전체 너비로 */
  priorityInlineListUnderDate: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 10,
  },
  priorityInlineListUnderDateMain: {
    paddingBottom: 2,
  },
  priorityInlineListUnderDateAfterEvents: {
    marginTop: 8,
  },
  /** 자정 넘김 꼬리 날 — 시각+선만(배경·테두리 없이 본문과 동일 톤) */
  overnightContinuationBlock: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 2,
    gap: 0,
  },
  overnightTailHeadBlock: {
    width: '100%',
    gap: 10,
    marginBottom: 4,
  },
  /** 꼬리 날 — 스케줄 참고: 시각 한 줄 + 구분선만 */
  overnightTailEndTime: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  overnightTailDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    minHeight: 1,
    alignSelf: 'stretch',
  },
  priorityTimelineKicker: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    letterSpacing: -0.05,
    marginBottom: 8,
  },
  priorityTimelinePlaceholder: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.05,
  },
  priorityMainEmptyHint: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  priorityMainEmptyHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priorityMainEmptyHintBody: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  timeModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timeModalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  timeModalCard: {
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
    elevation: 0,
  },
  timeModalFlipWrap: {
    width: '100%',
    marginTop: 2,
    paddingBottom: 4,
  },
  endDateChoiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  endDateChoiceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 0,
  },
  endDateChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeCalendarTopLeftHit: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 시작·종료 플립 시계 두 열 */
  timeRibbonInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    width: '100%',
  },
  timeFlipColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 10,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  /** 바깥 Pressable 한 겹이 자식 높이를 0으로 만드는 경우가 있어 View + 전역 덮는 Pressable로 분리 */
  dateModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dateModalDimTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  dateModalSheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  dateModalGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateModalRangeSummary: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  dateModalHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  dateMonthHeader: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthHeaderSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 0,
  },
  dateMonthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonthNavText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  dateMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  calendarFrame: {
    marginTop: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignSelf: 'stretch',
  },
  calendarTodayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  calendarTodayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 2,
  },
  calendarTodayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarWeekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDayCell: {
    width: '14.2857%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayCellSelected: {
    backgroundColor: PRIMARY,
  },
  calendarDayCellOutMonth: {
    opacity: 0.45,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dateActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  dateActionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateActionGhost: {
    borderWidth: 2,
  },
  dateActionPrimary: {
    backgroundColor: PRIMARY,
  },
  dateActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'stretch',
  },

  bookOuter: {
    borderRadius: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  bookSpread: {
    flexDirection: 'column',
    gap: 0,
    width: '100%',
  },
  pageBlock: {
    width: '100%',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  pageTop: {
    minHeight: 96,
    paddingTop: 0,
  },
  pageTopEditorial: {
    borderRadius: 0,
  },
  /** 우선 순위 목록 — 무엇을 담는 영역인지 한 줄 설명 */
  pagePriorityIntro: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  pageScrollContent: { gap: 0, paddingBottom: 4 },
});
