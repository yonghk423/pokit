// @ts-nocheck — RN Web에서 StyleSheet.create 타입이 TextStyle|ViewStyle로 합쳐져 Reanimated·제스처와 충돌함
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  blockMatchesPriorityHhmmWindow,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  formatMinuteOfDayKo,
  getLocalDateKey,
  isCustomFlowCategoryKey,
  isLikelyPriorityCatalogMonolineTitle,
  isPriorityCompoundBlockTitle,
  localDateToDateKey,
  parseHHmmToMinutes,
  parseLocalDateKeyToDate,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  sortDayPlanBlocks,
  useDayPlanStore
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  hasGoalDetailCommittedCategory,
  loadPriorityBagRemoveConfirmSkip,
  savePriorityBagRemoveConfirmSkip,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { PriorityOrderRow } from '@widgets/day-plan-priority-order';
import {
  formatDateKeyCompactKo,
  formatDateKeyDisplayKo,
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
} from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { getPriorityCategoryGoalHint } from '../lib/priorityCategoryGoalHints';

/** 우선순위 행 완료 제거 시: 페이드 아웃 + 아래 행이 부드럽게 올라오는 레이아웃 전환 */
const PRIORITY_ROW_EXITING = FadeOut.duration(280).easing(Easing.out(Easing.cubic));
const PRIORITY_ROW_LAYOUT = LinearTransition.duration(320).easing(Easing.out(Easing.cubic));

import { useDayPlanDraftStore } from '@entities/day-plan';
import { DAY_PLAN_TAB_BAR_ROW_HEIGHT } from './DayPlanCustomTabBar';

/** 타임라인 내부 스크롤 하단 — 리스트와 카드 둥근 하단 사이 최소만 */
const TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM = 8;

/**
 * 플립 시계 레퍼런스: 카드 다크 배경 · 밝은 회색 숫자 · 숫자 가운데 검정 힌지선(flip-divider)
 */
const CLOCK_CARD_DARK = '#09090b';
const CLOCK_TEXT_GREY = '#a1a1aa';
/** ampm: text-clock-grey + opacity-80 */
const CLOCK_AMPM_GREY = 'rgba(161, 161, 170, 0.8)';
/** 기계식 플립: 숫자 세로 중앙을 가로지르는 선 (레퍼런스: solid black) */
const CLOCK_FLIP_HINGE = '#000000';
/** 카드 하단선용(선택). 구 번들/미저장 JSX가 참조해도 런타임 오류 나지 않게 유지 */
const CLOCK_FLIP_DIVIDER = 'rgba(255, 255, 255, 0.06)';

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

function BlinkingTimeColon() {
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
        <View style={[flipStyles.colonDotSquare, { backgroundColor: CLOCK_TEXT_GREY }]} />
        <View style={[flipStyles.colonDotSquare, { backgroundColor: CLOCK_TEXT_GREY }]} />
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

/** 플립 시계형 시·분 카드 (저장은 `HH:mm` 24h) — 색은 CLOCK_* 스펙 고정 */
function FlipClockTimePair({
  value,
  onChange,
  nextDayHint,
  dateCaption,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  /** 자정 넘김만(달력 다중일 아님) — 우측 상단 「다음날」 */
  nextDayHint?: boolean;
  /** 달력으로 기간을 나눈 경우에만 — 박스 하단에 `M월 D일` */
  dateCaption?: string;
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
      onChange(formatMinutesToHHmm(from12hPartsToTotal(nh, nm, na)));
    },
    [ap, h12, min, onChange],
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
    commit({ ap: ap === '오전' ? '오후' : '오전' });
  };

  return (
    <View style={flipStyles.pairRow}>
      <View style={flipStyles.mergedOuter}>
        <View style={[flipStyles.mergedFace, { backgroundColor: CLOCK_CARD_DARK }]}>
          {nextDayHint ? (
            <View pointerEvents="none" style={flipStyles.nextDayBadge}>
              <ThemedText style={[flipStyles.nextDayText, { color: CLOCK_AMPM_GREY }]}>다음날</ThemedText>
            </View>
          ) : null}
          {dateCaption ? (
            <View pointerEvents="none" style={flipStyles.dateCaptionFooter}>
              <ThemedText style={[flipStyles.dateCaptionText, { color: CLOCK_AMPM_GREY }]}>
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
                <ThemedText style={[flipStyles.ampmText, { color: CLOCK_AMPM_GREY }]}>자정</ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={toggleAp}
                hitSlop={8}
                style={flipStyles.ampmBadge}
                accessibilityRole="button"
                accessibilityLabel={ap === '오전' ? '오전, 탭하면 오후로 전환' : '오후, 탭하면 오전으로 전환'}>
                <ThemedText style={[flipStyles.ampmText, { color: CLOCK_AMPM_GREY }]}>{ap}</ThemedText>
              </Pressable>
            )}
            <TextInput
              value={hourDraft}
              onChangeText={onHourText}
              onBlur={onHourBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[flipStyles.digitInput, digitInputNoArtifact, { color: CLOCK_TEXT_GREY }]}
            />
            <View pointerEvents="none" style={[flipStyles.flipHinge, { backgroundColor: CLOCK_FLIP_HINGE }]} />
          </View>
          <View style={flipStyles.colonGutter}>
            <BlinkingTimeColon />
          </View>
          <View style={flipStyles.halfCell}>
            <TextInput
              value={minDraft}
              onChangeText={onMinuteText}
              onBlur={onMinuteBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[flipStyles.digitInput, digitInputNoArtifact, { color: CLOCK_TEXT_GREY }]}
            />
            <View pointerEvents="none" style={[flipStyles.flipHinge, { backgroundColor: CLOCK_FLIP_HINGE }]} />
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
  /** ampm-label + text-clock-grey opacity-80 → CLOCK_AMPM_GREY에 이미 0.8 */
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
};

function priorityLabelByIndex(index: number): string {
  return String(index + 1);
}

function priorityColorByIndex(index: number): { bg: string; fg: string } {
  void index;
  return { bg: '#111111', fg: '#ffffff' };
}

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
}: Props) {
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const bc = bookColors(c, isDark);

  const todayKey = getLocalDateKey();

  const [iosDateModalOpen, setIosDateModalOpen] = useState(false);
  const [priorityTimeModalOpen, setPriorityTimeModalOpen] = useState(false);
  const [draftPriorityStart, setDraftPriorityStart] = useState(priorityStart);
  const [draftPriorityEnd, setDraftPriorityEnd] = useState(priorityEnd);
  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()));
  const [draftRangeStart, setDraftRangeStart] = useState(priorityPlanDateKey);
  const [draftRangeEnd, setDraftRangeEnd] = useState(priorityPlanDateKeyEnd);
  /** null이 아니면 첫 번째로 택한 날(스토어 미반영) — 다음 탭이 범위의 다른 끝 */
  const [calendarRangeAnchor, setCalendarRangeAnchor] = useState<string | null>(null);

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
    const overnight = isOvernightHhmmRange(draftPriorityStart, draftPriorityEnd);
    const startKey = priorityClockCaptionDateKeyStart(lo);
    const endKey = priorityClockCaptionDateKeyEnd(hi, draftPriorityStart, draftPriorityEnd);
    return {
      startDateCaption: explicit ? formatDateKeyCompactKo(startKey) : undefined,
      endDateCaption: explicit ? formatDateKeyCompactKo(endKey) : undefined,
      endNextDayOnlyBadge: overnight && !explicit,
    };
  }, [
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

  /** 목표 상세 저장소 기준 부가 한 줄 — 설정 화면에서 돌아올 때 갱신 */
  const [categoryHintTick, setCategoryHintTick] = useState(0);
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
          if (key === 'other' || isCustomFlowCategoryKey(key)) {
            return { ...base, label: getPickerCategoryLabel(key) };
          }
          return base;
        })
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [priorityCategoryOrder, categoryHintTick, categoryLabelEpoch],
  );

  const categoryKeysForHints = useMemo(
    () => [...new Set([...priorityCategoryOrder, ...PICKER_CATEGORIES.map((c) => c.key)])],
    [priorityCategoryOrder],
  );

  const categoryGoalHints = useMemo(() => {
    void categoryHintTick;
    const out: Record<string, string | null> = {};
    for (const k of categoryKeysForHints) {
      out[k] = getPriorityCategoryGoalHint(k, { isFocusStarted });
    }
    return out;
  }, [categoryKeysForHints, categoryHintTick, isFocusStarted]);

  const categoryUnsetHints = useMemo<Record<string, string>>(
    () => ({
      reading: '책 선정 안 함',
      fasting: '단식 목표 미설정',
      water: '섭취 목표 설정 안 함',
      medicine: '복용 슬롯 설정 안 함',
      work: '작업 목표 미설정',
      study: '학습 체크리스트 미작성',
      planning: '정리 체크리스트 미작성',
      writing: '글쓰기 체크리스트 미작성',
      language: '언어 학습 체크리스트 미작성',
      creative: '창작 체크리스트 미작성',
      inbox: '정리 체크리스트 미작성',
      other: '체크리스트 미작성',
    }),
    [],
  );

  const categorySubtitleByKey = useCallback(
    (categoryKey: string): string | null => {
      const fallback = categoryUnsetHints[categoryKey] ?? '설정 안 함';
      if (!hasGoalDetailCommittedCategory(categoryKey)) return fallback;
      return categoryGoalHints[categoryKey] ?? fallback;
    },
    [categoryGoalHints, categoryUnsetHints],
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
    removeCompletedPriorityBagRows,
    setPriorityCategoryOrder,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
      addFocusCategoryCompleted: s.addFocusCategoryCompleted,
      toggleFocusCategoryCompleted: s.toggleFocusCategoryCompleted,
      filterCompletedFocusKeysToPriorityOrder: s.filterCompletedFocusKeysToPriorityOrder,
      addPlanCompletionDismissedKey: s.addPlanCompletionDismissedKey,
      clearPlanCompletionDismissedKeys: s.clearPlanCompletionDismissedKeys,
      removeCompletedPriorityBagRows: s.removeCompletedPriorityBagRows,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
    })),
  );
  const [lastAddedCategoryKey, setLastAddedCategoryKey] = useState<string | null>(null);
  const [skipRemovePriorityBagConfirm, setSkipRemovePriorityBagConfirm] = useState(false);
  const [removeConfirmCategoryKey, setRemoveConfirmCategoryKey] = useState<string | null>(null);
  const [removeConfirmSkipNextChecked, setRemoveConfirmSkipNextChecked] = useState(false);
  const [draggingPriorityKey, setDraggingPriorityKey] = useState<string | null>(null);
  const priorityBagRowHeightRef = useRef(52);

  useEffect(() => {
    setSkipRemovePriorityBagConfirm(loadPriorityBagRemoveConfirmSkip());
  }, []);
  const planBlocks = useDayPlanStore((s) => s.blocks);
  const dayPlanDateKey = useDayPlanStore((s) => s.dateKey);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);

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
    if (priorityCategoryOrder.includes(lastAddedCategoryKey)) return;
    setLastAddedCategoryKey(null);
  }, [lastAddedCategoryKey, priorityCategoryOrder]);

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

  /**
   * 미완료는 위쪽·원래 담기 순서 유지, 완료(취소선)는 맨 아래로 모음.
   * 완료 행에는 순위 숫자를 붙이지 않음 — `priorityLabel` 생략.
   */
  const orderedSelectedItemsForDisplay = useMemo(() => {
    const active = selectedItems.filter((cat) => !isPriorityRowCompleted(cat.key));
    const done = selectedItems.filter((cat) => isPriorityRowCompleted(cat.key));
    return [...active, ...done];
  }, [selectedItems, isPriorityRowCompleted]);

  const dragReorderDelta = useCallback((translationY: number, rowHeight: number): number => {
    const threshold = rowHeight * 0.75;
    const absY = Math.abs(translationY);
    if (absY < threshold) return 0;
    const beyond = absY - threshold;
    const steps = 1 + Math.trunc(beyond / rowHeight);
    return translationY < 0 ? -steps : steps;
  }, []);

  const commitPriorityDisplayReorderFromDrag = useCallback(
    (categoryKey: string, translationY: number) => {
      const displayKeys = orderedSelectedItemsForDisplay.map((c) => c.key);
      const len = displayKeys.length;
      if (len < 2) return;
      const from = displayKeys.indexOf(categoryKey);
      if (from < 0) return;
      const h = Math.max(36, priorityBagRowHeightRef.current);
      const delta = dragReorderDelta(translationY, h);
      const to = Math.max(0, Math.min(len - 1, from + delta));
      if (to === from) return;
      const moved = [...displayKeys];
      const [item] = moved.splice(from, 1);
      moved.splice(to, 0, item);
      const active = moved.filter((k) => !isPriorityRowCompleted(k));
      const done = moved.filter((k) => isPriorityRowCompleted(k));
      setPriorityCategoryOrder([...active, ...done]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [dragReorderDelta, isPriorityRowCompleted, orderedSelectedItemsForDisplay, setPriorityCategoryOrder],
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

  const handleTogglePriorityRowComplete = useCallback(
    (categoryKey: string) => {
      if (isPriorityRowCompleted(categoryKey)) {
        undoPriorityRowCompletion(categoryKey);
        return;
      }
      addFocusCategoryCompleted(categoryKey);
    },
    [addFocusCategoryCompleted, isPriorityRowCompleted, undoPriorityRowCompletion],
  );

  const commitRemoveOneCompletedFromPriorityBag = useCallback(
    (categoryKey: string) => {
      if (!isPriorityRowCompleted(categoryKey)) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const planDismissKeys =
        isFocusStarted && completedCategoryKeysFromPlan.includes(categoryKey) ? [categoryKey] : [];
      removeCompletedPriorityBagRows([categoryKey], planDismissKeys);
    },
    [
      completedCategoryKeysFromPlan,
      isFocusStarted,
      isPriorityRowCompleted,
      removeCompletedPriorityBagRows,
    ],
  );

  const requestRemoveOneCompletedFromPriorityBag = useCallback(
    (categoryKey: string) => {
      if (!isPriorityRowCompleted(categoryKey)) return;
      if (skipRemovePriorityBagConfirm) {
        commitRemoveOneCompletedFromPriorityBag(categoryKey);
        return;
      }
      setRemoveConfirmCategoryKey(categoryKey);
    },
    [
      commitRemoveOneCompletedFromPriorityBag,
      isPriorityRowCompleted,
      skipRemovePriorityBagConfirm,
    ],
  );

  const closeRemovePriorityBagConfirm = useCallback(() => {
    setRemoveConfirmCategoryKey(null);
    setRemoveConfirmSkipNextChecked(false);
  }, []);

  const confirmRemoveFromPriorityBagOnce = useCallback(() => {
    if (!removeConfirmCategoryKey) return;
    if (removeConfirmSkipNextChecked) {
      savePriorityBagRemoveConfirmSkip(true);
      setSkipRemovePriorityBagConfirm(true);
    }
    commitRemoveOneCompletedFromPriorityBag(removeConfirmCategoryKey);
    closeRemovePriorityBagConfirm();
  }, [
    closeRemovePriorityBagConfirm,
    commitRemoveOneCompletedFromPriorityBag,
    removeConfirmCategoryKey,
    removeConfirmSkipNextChecked,
  ]);

  const removeConfirmLabel = useMemo(() => {
    if (!removeConfirmCategoryKey) return '항목';
    return getPickerCategoryLabel(removeConfirmCategoryKey);
  }, [removeConfirmCategoryKey, categoryHintTick]);

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

  /** 당일(오늘) · 다음날 — 전날 열은 제외하고, 자정 넘김 종료일만 연장 카드로 표시 */
  const timelineThreeDayKeys = useMemo(
    () => [
      todayKey,
      addDaysToLocalDateKey(todayKey, 1),
    ],
    [todayKey],
  );

  const sortedTimelineFlowBlocks = useMemo(
    () => sortDayPlanBlocks(filterDayPlanFlowBlocks(planBlocks)),
    [planBlocks],
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
    setPriorityTimeModalOpen(true);
  }, [priorityEnd, priorityStart]);

  const closePriorityTimeModal = useCallback(() => {
    Keyboard.dismiss();
    setPriorityTimeModalOpen(false);
  }, []);

  const confirmPriorityTimeModal = useCallback(() => {
    Keyboard.dismiss();
    onChangePriorityStart(draftPriorityStart);
    onChangePriorityEnd(draftPriorityEnd);
    setPriorityTimeModalOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftPriorityEnd, draftPriorityStart, onChangePriorityEnd, onChangePriorityStart]);

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
                    onChange={setDraftPriorityStart}
                    dateCaption={modalClockFaceHints.startDateCaption}
                  />
                </View>
                <View style={styles.timeFlipColumn}>
                  <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>종료</ThemedText>
                  <FlipClockTimePair
                    value={draftPriorityEnd}
                    onChange={setDraftPriorityEnd}
                    nextDayHint={modalClockFaceHints.endNextDayOnlyBadge}
                    dateCaption={modalClockFaceHints.endDateCaption}
                  />
                </View>
              </View>
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

      <Modal
        visible={removeConfirmCategoryKey !== null}
        transparent
        animationType="fade"
        onRequestClose={closeRemovePriorityBagConfirm}>
        <View style={styles.removeConfirmModalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.removeConfirmModalDim}
            onPress={closeRemovePriorityBagConfirm}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          />
          <View
            style={[
              styles.removeConfirmCard,
              {
                zIndex: 2,
                elevation: 14,
                backgroundColor: c.containerLow,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            ]}>
            <ThemedText style={[styles.removeConfirmTitle, { color: editorial.ink }]} numberOfLines={2}>
              담기에서 뺄까요?
            </ThemedText>
            <ThemedText style={[styles.removeConfirmBody, { color: editorial.muted }]} numberOfLines={4}>
              완료한 「{removeConfirmLabel}」을 목록에서 빼요. 필요하면 담기 화면에서 다시 추가할 수 있어요.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                removeConfirmSkipNextChecked ? '다음부터 묻지 않기 해제' : '다음부터 묻지 않기 선택'
              }
              onPress={() => setRemoveConfirmSkipNextChecked((v) => !v)}
              style={[
                styles.removeConfirmDontAskBtn,
                {
                  borderColor: removeConfirmSkipNextChecked ? PRIMARY : editorial.line,
                  backgroundColor: removeConfirmSkipNextChecked
                    ? isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.05)'
                    : 'transparent',
                },
              ]}>
              <View
                style={[
                  styles.removeConfirmCheckChip,
                  {
                    borderColor: removeConfirmSkipNextChecked ? PRIMARY : editorial.line,
                    backgroundColor: removeConfirmSkipNextChecked ? PRIMARY : 'transparent',
                  },
                ]}>
                <IconSymbol
                  name="checkmark"
                  size={12}
                  color={removeConfirmSkipNextChecked ? '#fff' : 'transparent'}
                />
              </View>
              <ThemedText style={[styles.removeConfirmDontAskBtnText, { color: editorial.ink }]}>
                다음부터 묻지 않기
              </ThemedText>
            </Pressable>
            <View style={styles.removeConfirmActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="취소"
                onPress={closeRemovePriorityBagConfirm}
                style={[
                  styles.removeConfirmGhostBtn,
                  {
                    borderColor: tabColors.inactiveBorder,
                    backgroundColor: tabColors.inactiveBg,
                  },
                ]}>
                <ThemedText style={[styles.removeConfirmActionText, { color: tabColors.inactiveIcon }]}>
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="담기에서 빼기"
                onPress={confirmRemoveFromPriorityBagOnce}
                style={[
                  styles.removeConfirmPrimaryBtn,
                  {
                    backgroundColor: tabColors.activeBg,
                    borderColor: tabColors.activeBorder,
                  },
                ]}>
                <ThemedText style={[styles.removeConfirmPrimaryBtnText, { color: tabColors.activeIcon }]}>
                  빼기
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.bookOuter, { backgroundColor: surfaceBg }]}>
        {/* 기간·집중 구간 — 다일 타임라인 카드 (달력·시계는 각각 모달) */}
        <View style={styles.priorityTimelineOuter}>
          <View
            style={[
              styles.priorityTimelineCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
                /** 드래그 시작 시 React 상태 토글로 제스처가 취소되는 문제를 막기 위해 항상 visible */
                overflow: 'visible',
              },
            ]}>
            <View style={styles.priorityTimelineHeader}>
              <View style={styles.priorityTimelineHeaderText}>
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
                  <Pressable
                    onPress={openPriorityTimeModal}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`집중 구간 시간 설정, 현재 ${priorityWindowLine}`}
                    accessibilityHint="탭하면 집중 구간 시간을 변경할 수 있어요"
                    style={({ pressed }) => [pressed && { opacity: 0.65 }]}>
                    <View style={styles.priorityTimelineTimeRow}>
                      <IconSymbol name="clock" size={11} color={editorial.muted} />
                      <ThemedText
                        style={[
                          styles.priorityTimelineSub,
                          styles.priorityTimelineTimeTap,
                          { color: editorial.ink },
                        ]}
                        lightColor={editorial.ink}
                        darkColor={editorial.ink}
                        numberOfLines={2}>
                        {priorityWindowLine}
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/settings');
                }}
                hitSlop={12}
                style={styles.timelineHeaderSettingsBtn}
                accessibilityRole="button"
                accessibilityLabel="설정">
                <IconSymbol name="gearshape" size={22} color={editorial.muted} />
              </Pressable>
            </View>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.priorityTimelineScroll}
              contentContainerStyle={[
                styles.priorityTimelineScrollContent,
                { paddingBottom: TIMELINE_SCROLL_CONTENT_PADDING_BOTTOM },
              ]}>
              {timelineThreeDayKeys.map((dk) => {
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
                const showPriorityInMainTimeline = bagCount > 0 && isMainDay;
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
                        {isMainDay && bagCount === 0 ? (
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
                              아래에서 항목을 추가해 주세요.
                            </ThemedText>
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
                          {orderedSelectedItemsForDisplay.map((cat, idx) => {
                            const rowDone = isPriorityRowCompleted(cat.key);
                            const activeIndexBefore = orderedSelectedItemsForDisplay
                              .slice(0, idx)
                              .filter((c) => !isPriorityRowCompleted(c.key)).length;
                            const priorityLabel = rowDone ? undefined : priorityLabelByIndex(activeIndexBefore);
                            const isTopPriority = !rowDone && activeIndexBefore === 0;
                            const allowBagReorder = orderedSelectedItemsForDisplay.length >= 2;
                            return (
                              <Reanimated.View
                                key={cat.key}
                                layout={PRIORITY_ROW_LAYOUT}
                                exiting={PRIORITY_ROW_EXITING}
                                style={[
                                  styles.priorityOrderRowAnimWrap,
                                  draggingPriorityKey === cat.key
                                    ? styles.priorityOrderRowAnimWrapDragging
                                    : null,
                                ]}
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
                                  subtitle={categorySubtitleByKey(cat.key)}
                                  priorityLabel={priorityLabel}
                                  isTopPriority={isTopPriority}
                                  priorityColor={rowDone ? undefined : priorityColorByIndex(activeIndexBefore)}
                                  isFocusStarted={isFocusStarted}
                                  isCompleted={rowDone}
                                  isDark={isDark}
                                  ink={editorial.ink}
                                  inkMuted={editorial.muted}
                                  line={editorial.line}
                                  onToggleFocusComplete={() => handleTogglePriorityRowComplete(cat.key)}
                                  onRemoveCompletedFromPriorityBag={
                                    rowDone
                                      ? () => requestRemoveOneCompletedFromPriorityBag(cat.key)
                                      : undefined
                                  }
                                  onReorderDragTranslationEnd={
                                    allowBagReorder
                                      ? (ty) => commitPriorityDisplayReorderFromDrag(cat.key, ty)
                                      : undefined
                                  }
                                  onReorderDragActiveChange={
                                    allowBagReorder
                                      ? (active) => {
                                        setDraggingPriorityKey((prev) => {
                                          if (active) return cat.key;
                                          if (prev === cat.key) return null;
                                          return prev;
                                        });
                                      }
                                      : undefined
                                  }
                                  reorderDragSurface={allowBagReorder ? editorial.surface : undefined}
                                  onSettings={
                                    onOpenCategorySettings ? () => onOpenCategorySettings(cat.key) : undefined
                                  }
                                  onFocusDetail={onOpenFocusDetail ? () => onOpenFocusDetail(cat.key) : undefined}
                                  animateOnMount={lastAddedCategoryKey === cat.key}
                                />
                              </Reanimated.View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Fragment 대신 단일 루트 — 부모 ScrollView gap·자식 평탄화로 생기는 밝은 띠 방지 */
  prioritySectionRoot: {
    width: '100%',
    overflow: 'hidden',
  },
  priorityTimelineOuter: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  priorityTimelineCard: {
    width: '100%',
    borderRadius: 28,
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
  },
  priorityTimelineHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
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
  priorityTimelineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityTimelineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
    paddingTop: 2,
    marginLeft: 4,
  },
  priorityTimelineScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  priorityTimelineScrollContent: {
    paddingHorizontal: 10,
    gap: 10,
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
  /** Reanimated layout/exit — 드래그 중 `translateY`가 잘리지 않도록 visible */
  priorityOrderRowAnimWrap: {
    width: '100%',
    overflow: 'visible',
  },
  priorityOrderRowAnimWrapDragging: {
    zIndex: 300,
    elevation: 30,
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
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
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
    elevation: 14,
  },
  timeModalFlipWrap: {
    width: '100%',
    marginTop: 2,
    paddingBottom: 4,
  },
  timeCalendarTopLeftHit: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineHeaderSettingsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
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
    borderRadius: 10,
    borderWidth: 1,
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
    borderWidth: 1,
    borderRadius: 14,
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
    borderRadius: 10,
    borderWidth: 1,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateActionGhost: {
    borderWidth: 1,
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
  removeConfirmModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  removeConfirmModalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  removeConfirmCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  removeConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  removeConfirmBody: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  removeConfirmDontAskBtn: {
    marginTop: 2,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  removeConfirmCheckChip: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeConfirmDontAskBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  removeConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  removeConfirmGhostBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeConfirmPrimaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeConfirmActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  removeConfirmPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
