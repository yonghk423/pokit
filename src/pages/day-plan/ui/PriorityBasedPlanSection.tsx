// @ts-nocheck — RN Web에서 StyleSheet.create 타입이 TextStyle|ViewStyle로 합쳐져 Reanimated·제스처와 충돌함
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  filterDayPlanFlowBlocks,
  getLocalDateKey,
  localDateToDateKey,
  parseHHmmToMinutes,
  parseLocalDateKeyToDate,
  resolveCategoryKeyFromLabel,
  useDayPlanStore,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { hasGoalDetailCommittedCategory } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  formatDateKeyCompactKo,
  formatMinutesToHHmm,
  isOvernightHhmmRange,
  planDayIntroFromRange,
  PICKER_CATEGORIES,
  PRIMARY,
  priorityClockCaptionDateKeyEnd,
  priorityClockCaptionDateKeyStart,
  sortedPlanDateRange,
} from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { getPriorityCategoryGoalHint } from '../lib/priorityCategoryGoalHints';

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
  const [hourDraft, setHourDraft] = useState(() => String(h12).padStart(2, '0'));
  const [minDraft, setMinDraft] = useState(() => String(min).padStart(2, '0'));

  useEffect(() => {
    const p = parseHHmmToMinutes(value.trim());
    const tm = p !== null ? p : 9 * 60;
    if (tm === 24 * 60) return;
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
    const d = t.replace(/\D/g, '').slice(0, 2);
    setHourDraft(d);
    if (d === '') return;
    /** 선행 0만 있으면 10~12·01~09 입력 대기 (기존 max(1,0)→1로 튀던 문제 제거) */
    if (d === '0') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;
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
    const d = hourDraft.replace(/\D/g, '').slice(0, 2);
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
    const d = t.replace(/\D/g, '').slice(0, 2);
    setMinDraft(d);
    if (d === '') return;
    if (d === '0') return;
    const n = parseInt(d, 10);
    if (!Number.isFinite(n)) return;
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
    const d = minDraft.replace(/\D/g, '').slice(0, 2);
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
    void Haptics.selectionAsync();
    commit({ ap: ap === '오전' ? '오후' : '오전' });
  };

  if (is2400) {
    return (
      <View style={flipStyles.pairRow}>
        <View style={[flipStyles.card2400, { backgroundColor: CLOCK_CARD_DARK }]}>
          <TextInput
            value="24:00"
            editable
            selectTextOnFocus
            keyboardType="numbers-and-punctuation"
            placeholder="24:00"
            placeholderTextColor={CLOCK_TEXT_GREY}
            onChangeText={(tx) => {
              const p = parseHHmmToMinutes(tx.trim());
              if (p !== null) onChange(formatMinutesToHHmm(p));
            }}
            style={[flipStyles.digitInput2400, digitInputNoArtifact, { color: CLOCK_TEXT_GREY }]}
          />
          <View pointerEvents="none" style={[flipStyles.flipHinge, { backgroundColor: CLOCK_FLIP_HINGE }]} />
        </View>
      </View>
    );
  }

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
            <Pressable
              onPress={toggleAp}
              hitSlop={8}
              style={flipStyles.ampmBadge}
              accessibilityRole="button"
              accessibilityLabel={ap === '오전' ? '오전, 탭하면 오후로 전환' : '오후, 탭하면 오전으로 전환'}>
              <ThemedText style={[flipStyles.ampmText, { color: CLOCK_AMPM_GREY }]}>{ap}</ThemedText>
            </Pressable>
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
  /** (레거시) 개별 카드 — 24:00 단일 입력 등에서 참조 가능 */
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
  card2400: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    minHeight: 72,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
  /** ampm: absolute top-[8%] left-[8%] */
  ampmBadge: {
    position: 'absolute',
    top: '8%',
    left: '8%',
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
  digitInput2400: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    padding: 0,
    margin: 0,
    textAlign: 'center',
    width: '100%',
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
  /** 플로우 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  onChangePriorityPlanDateKey: (v: string) => void;
  /** 플로우 적용 기간 종료일 (YYYY-MM-DD) */
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
  /** 진행 중 모든 항목 완료 시 호출 */
  onAllFocusCompleted?: () => void;
};

/* ─── 왼쪽 페이지: 우선 순위 목록 ─── */

function OrderRow({
  categoryKey,
  icon,
  label,
  subtitle,
  priorityLabel,
  isTopPriority,
  priorityColor,
  isFocusStarted,
  isCompleted,
  isDark,
  ink,
  inkMuted,
  line,
  onRemove,
  onComplete,
  onSettings,
  onFocusDetail,
}: {
  categoryKey: string;
  icon: string;
  label: string;
  /** 목표 상세에서 온 부가 한 줄 (책 제목·단식 누적·수분·약 복용 등) */
  subtitle?: string | null;
  priorityLabel?: string;
  isTopPriority?: boolean;
  priorityColor?: { bg: string; fg: string };
  isFocusStarted?: boolean;
  isCompleted?: boolean;
  isDark: boolean;
  ink: string;
  inkMuted: string;
  line: string;
  onRemove: () => void;
  onComplete?: () => void;
  onSettings?: () => void;
  onFocusDetail?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldPulse = Boolean(isFocusStarted && !isCompleted);

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulse]);

  return (
    <View style={[styles.orderRowRoman, { borderBottomColor: line }]}>
      {priorityLabel ? (
        <View
          style={[
            styles.inlineRankPill,
            {
              backgroundColor:
                priorityColor?.bg ?? (isTopPriority ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.08)'),
            },
          ]}>
          <ThemedText
            style={[
              styles.inlineRankPillText,
              { color: priorityColor?.fg ?? (isTopPriority ? '#fff' : ink) },
            ]}>
            {priorityLabel}
          </ThemedText>
        </View>
      ) : null}
      {shouldPulse && categoryKey === 'medicine' ? (
        <Animated.View style={[styles.medicineIconBadge, { opacity: pulse }]}>
          <IconSymbol name="cross.fill" size={12} color="#ef4444" />
        </Animated.View>
      ) : (
        <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
          <IconSymbol
            name={icon as any}
            size={20}
            color={shouldPulse ? activeIconColorByCategory(categoryKey) : ink}
          />
        </Animated.View>
      )}
      <View style={styles.orderRowRomanText}>
        <ThemedText
          style={[styles.orderRowRomanTitle, { color: ink }, isCompleted && styles.orderRowRomanTitleDone]}
          numberOfLines={1}
          lightColor={ink}
          darkColor={ink}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[
              styles.orderRowRomanSubtitle,
              { color: inkMuted },
              isCompleted && styles.orderRowRomanTitleDone,
            ]}
            numberOfLines={1}
            lightColor={inkMuted}
            darkColor={inkMuted}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.orderRowActions}>
        {isFocusStarted && onFocusDetail ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 몰입 화면 자세히 보기`}
            hitSlop={10}
            onPress={onFocusDetail}
            style={[styles.orderSettingsBtn, { borderColor: line }]}>
            <IconSymbol name="chevron.right.circle" size={16} color={isDark ? inkMuted : ink} />
          </Pressable>
        ) : onSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 상세 설정`}
            hitSlop={10}
            onPress={onSettings}
            style={[styles.orderSettingsBtn, { borderColor: line }]}>
            <IconSymbol name="slider.horizontal.3" size={14} color={isDark ? inkMuted : ink} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFocusStarted ? `${label} 완료` : `${label} 제거`}
          hitSlop={12}
          onPress={isFocusStarted ? onComplete : onRemove}
          style={[styles.orderRemoveRoman, { borderColor: line }]}>
          <IconSymbol
            name={isFocusStarted ? 'checkmark.circle.fill' : 'xmark'}
            size={isFocusStarted ? 15 : 12}
            color={isDark ? inkMuted : ink}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── 도구 카탈로그 — 세로 목록(추가형) ─── */

function CatalogListRow({
  icon,
  label,
  subtitle,
  selected,
  ink,
  muted,
  line,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle?: string | null;
  selected: boolean;
  ink: string;
  muted: string;
  line: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        subtitle ? `${label}. ${subtitle}, ${selected ? '담김' : '담기'}` : `${label}, ${selected ? '담김' : '담기'}`
      }
      onPress={onPress}
      style={[styles.catalogRow, { borderBottomColor: line }]}>
      <IconSymbol name={icon as any} size={22} color={selected ? PRIMARY : muted} />
      <View style={styles.catalogRowTextCol}>
        <ThemedText
          style={[styles.catalogRowLabel, { color: selected ? ink : muted }]}
          lightColor={selected ? ink : muted}
          darkColor={selected ? ink : muted}
          numberOfLines={1}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[styles.catalogRowSubtitle, { color: muted }]}
            lightColor={muted}
            darkColor={muted}
            numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.catalogRowBadge, { backgroundColor: PRIMARY }]}>
          <IconSymbol name="checkmark" size={11} color="#fff" />
        </View>
      ) : (
        <IconSymbol name="plus.circle" size={22} color={muted} />
      )}
    </Pressable>
  );
}

function priorityLabelByIndex(index: number): string {
  return String(index + 1);
}

function priorityColorByIndex(index: number): { bg: string; fg: string } {
  const palette: Array<{ bg: string; fg: string }> = [
    { bg: '#ef4444', fg: '#ffffff' }, // red
    { bg: '#f97316', fg: '#ffffff' }, // orange
    { bg: '#f59e0b', fg: '#111827' }, // amber
    { bg: '#eab308', fg: '#111827' }, // yellow
    { bg: '#84cc16', fg: '#052e16' }, // lime
    { bg: '#22c55e', fg: '#052e16' }, // green
    { bg: '#14b8a6', fg: '#042f2e' }, // teal
    { bg: '#06b6d4', fg: '#083344' }, // cyan
    { bg: '#3b82f6', fg: '#ffffff' }, // blue
    { bg: '#8b5cf6', fg: '#ffffff' }, // violet
  ];
  return palette[index % palette.length];
}

function activeIconColorByCategory(categoryKey: string): string {
  if (categoryKey === 'work') return '#1e3a8a';
  if (categoryKey === 'reading') return '#22c55e';
  if (categoryKey === 'fasting') return '#8b5a2b';
  if (categoryKey === 'water') return '#7dd3fc';
  if (categoryKey === 'other') return '#f97316';
  return PRIMARY;
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
  onAllFocusCompleted,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const bc = bookColors(c, isDark);

  const todayKey = getLocalDateKey();

  const [iosDateModalOpen, setIosDateModalOpen] = useState(false);
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

  const clockFaceHints = useMemo(() => {
    const explicit = priorityPlanExplicitMultiDay;
    const { lo, hi } = sortedPlanDateRange(priorityPlanDateKey, priorityPlanDateKeyEnd);
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
    const startKey = priorityClockCaptionDateKeyStart(lo);
    const endKey = priorityClockCaptionDateKeyEnd(hi, priorityStart, priorityEnd);
    return {
      startDateCaption: explicit ? formatDateKeyCompactKo(startKey) : undefined,
      endDateCaption: explicit ? formatDateKeyCompactKo(endKey) : undefined,
      /** 달력 다중일이 아닐 때만 자정 넘김 → 「다음날」 */
      endNextDayOnlyBadge: overnight && !explicit,
    };
  }, [
    priorityPlanExplicitMultiDay,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityStart,
    priorityEnd,
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

  const selectedItems = useMemo(
    () =>
      priorityCategoryOrder
        .map((key) => PICKER_CATEGORIES.find((cat) => cat.key === key))
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [priorityCategoryOrder],
  );

  /** 목표 상세 저장소 기준 부가 한 줄 — 설정 화면에서 돌아올 때 갱신 */
  const [categoryHintTick, setCategoryHintTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setCategoryHintTick((n) => n + 1);
    }, []),
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
      fasting: '목표 시간 설정 안 함',
      water: '섭취 목표 설정 안 함',
      medicine: '복용 슬롯 설정 안 함',
      other: '보조 도구 설정 안 함',
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
  const [completedCategoryKeys, setCompletedCategoryKeys] = useState<string[]>([]);
  const planBlocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(planBlocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key = resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [planBlocks, completedBlockIds, skippedBlockIds]);

  const effectiveCompletedCategoryKeys = useMemo(
    () => [...new Set([...completedCategoryKeys, ...completedCategoryKeysFromPlan])],
    [completedCategoryKeys, completedCategoryKeysFromPlan],
  );

  useEffect(() => {
    setCompletedCategoryKeys((prev) => prev.filter((k) => priorityCategoryOrder.includes(k)));
  }, [priorityCategoryOrder]);

  useEffect(() => {
    if (!isFocusStarted) return;
    if (priorityCategoryOrder.length === 0) return;
    const done = priorityCategoryOrder.every((k) => effectiveCompletedCategoryKeys.includes(k));
    if (done) {
      onAllFocusCompleted?.();
    }
  }, [isFocusStarted, priorityCategoryOrder, effectiveCompletedCategoryKeys, onAllFocusCompleted]);

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

  const handleRemove = useCallback(
    (key: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectCategory(key);
    },
    [onSelectCategory],
  );

  const onCatalogTap = useCallback(
    (key: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelectCategory(key);
    },
    [onSelectCategory],
  );

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

      <View style={[styles.bookOuter, { backgroundColor: surfaceBg }]}>
        {/* 목표 시간 */}
        <View
          style={[
            styles.timeRibbon,
            styles.timeRibbonInBook,
            {
              backgroundColor: surfaceBg,
              borderBottomColor: editorial.line,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <View style={[styles.timeRibbonInner, { backgroundColor: surfaceBg }]}>
            <View style={styles.timeFlipColumn}>
              <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>시작</ThemedText>
              <FlipClockTimePair
                value={priorityStart}
                onChange={onChangePriorityStart}
                dateCaption={clockFaceHints.startDateCaption}
              />
            </View>
            <View style={styles.timeCalendarBetweenColumn}>
              <Pressable
                onPress={openPlanDatePicker}
                hitSlop={12}
                style={styles.timeCalendarHit}
                accessibilityRole="button"
                accessibilityLabel={`적용 기간 선택, 현재 ${planDayIntroFromRange(todayKey, priorityPlanDateKey, priorityPlanDateKeyEnd)}`}>
                <IconSymbol name="calendar" size={22} color={editorial.muted} />
              </Pressable>
            </View>
            <View style={styles.timeFlipColumn}>
              <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>종료</ThemedText>
              <FlipClockTimePair
                value={priorityEnd}
                onChange={onChangePriorityEnd}
                nextDayHint={clockFaceHints.endNextDayOnlyBadge}
                dateCaption={clockFaceHints.endDateCaption}
              />
            </View>
          </View>
        </View>

        <View style={[styles.bookSpread, { backgroundColor: surfaceBg }]}>
          {/* ① 우선 순위 목록 */}
          <View
            style={[
              styles.pageBlock,
              styles.pageTop,
              styles.pageTopEditorial,
              { backgroundColor: surfaceBg },
            ]}>
            <ThemedText
              style={[styles.pagePriorityIntro, { color: editorial.ink }]}
              lightColor={editorial.ink}
              darkColor={editorial.ink}>
              {isFocusStarted
                ? '진행 중인 플로우예요. 각 항목에서 자세히 보기를 누르면 몰입 화면으로 이동해요.'
                : '여기에는 플로의 우선 순위를 담아요.'}
            </ThemedText>
            <View style={[styles.pageScrollContent, { backgroundColor: surfaceBg }]}>
              <View
                style={[
                  styles.orderListFrame,
                  { borderTopColor: editorial.line, backgroundColor: surfaceBg },
                ]}>
                {bagCount === 0 ? (
                  <View
                    style={[styles.priorityEmpty, { backgroundColor: surfaceBg }]}
                    accessibilityRole="text"
                    accessibilityLabel="우선 순위가 비어 있음. 아래 도구 카탈로그에서 항목을 담을 수 있음">
                    <View
                      style={[
                        styles.priorityEmptyIconFrame,
                        { borderColor: editorial.line },
                      ]}>
                      <IconSymbol name="square.stack" size={26} color={editorial.muted} />
                    </View>
                    <ThemedText
                      style={[styles.priorityEmptyTitle, { color: editorial.ink }]}
                      lightColor={editorial.ink}
                      darkColor={editorial.ink}>
                      아직 담긴 항목이 없어요
                    </ThemedText>
                    <ThemedText
                      style={[styles.priorityEmptyHint, { color: editorial.muted }]}
                      lightColor={editorial.muted}
                      darkColor={editorial.muted}>
                      아래 도구 카탈로그에서 항목을 탭하면 여기에 순서대로 쌓여요.
                    </ThemedText>
                    <View style={styles.priorityEmptyCue}>
                      <IconSymbol name="arrow.down" size={14} color={editorial.muted} />
                      <ThemedText
                        style={[styles.priorityEmptyCueText, { color: editorial.muted }]}
                        lightColor={editorial.muted}
                        darkColor={editorial.muted}>
                        아래에서 담기
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  selectedItems.map((cat, idx) => (
                    <OrderRow
                      key={cat.key}
                      categoryKey={cat.key}
                      icon={cat.icon}
                      label={cat.label}
                      subtitle={categorySubtitleByKey(cat.key)}
                      priorityLabel={priorityLabelByIndex(idx)}
                      isTopPriority={idx === 0}
                      priorityColor={priorityColorByIndex(idx)}
                      isFocusStarted={isFocusStarted}
                      isCompleted={effectiveCompletedCategoryKeys.includes(cat.key)}
                      isDark={isDark}
                      ink={editorial.ink}
                      inkMuted={editorial.muted}
                      line={editorial.line}
                      onRemove={() => handleRemove(cat.key)}
                      onComplete={() =>
                        setCompletedCategoryKeys((prev) =>
                          prev.includes(cat.key) ? prev : [...prev, cat.key],
                        )
                      }
                      onSettings={onOpenCategorySettings ? () => onOpenCategorySettings(cat.key) : undefined}
                      onFocusDetail={onOpenFocusDetail ? () => onOpenFocusDetail(cat.key) : undefined}
                    />
                  ))
                )}
              </View>
            </View>
          </View>

          {/* 구분선 */}
          <View style={[styles.pageDivider, { backgroundColor: editorial.line }]} />

          {/* ② 도구 카탈로그 */}
          <View
            style={[
              styles.pageBlock,
              styles.pageBottom,
              styles.pageBottomEditorial,
              { backgroundColor: surfaceBg },
            ]}>
            <View style={styles.pageHeader}>
              <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>도구 카탈로그</ThemedText>
            </View>
            <View style={[styles.catalogListFrame, { borderTopColor: editorial.line }]}>
              {PICKER_CATEGORIES
                .filter((cat) => !priorityCategoryOrder.includes(cat.key))
                .map((cat) => (
                  <CatalogListRow
                    key={cat.key}
                    icon={cat.icon}
                    label={cat.label}
                    subtitle={null}
                    selected={false}
                    ink={editorial.ink}
                    muted={editorial.muted}
                    line={editorial.line}
                    onPress={() => onCatalogTap(cat.key)}
                  />
                ))}
            </View>
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
  },
  /** 시계 블록 — 둥근 박스·사방 테두리 제거로 레이어·흰 띠 감소 */
  timeRibbon: {
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  timeRibbonInBook: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 0,
  },
  /** 시작·종료 플립 시계 + 가운데 달력 (예전 화살표 자리) */
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
  /** 좁은 고정폭 — 시계 두 열이 동일 비율로 남은 폭 분할 */
  timeCalendarBetweenColumn: {
    width: 36,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
  timeCalendarHit: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 120,
    paddingTop: 0,
  },
  pageTopEditorial: {
    borderRadius: 0,
  },
  pageBottom: {
    paddingBottom: 14,
    paddingTop: 4,
  },
  pageBottomEditorial: {
    borderRadius: 0,
  },
  pageDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 0,
  },
  pageHeader: { marginBottom: 10, gap: 2 },
  pageTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  orderListFrame: {
    width: '100%',
    borderTopWidth: 1,
  },
  /** 우선 순위 0개 — 목록 영역 안에서만 안내(배경 장식 원 금지 규칙 준수) */
  priorityEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 8,
  },
  priorityEmptyIconFrame: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  priorityEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  priorityEmptyHint: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
  },
  priorityEmptyCue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    opacity: 0.9,
  },
  priorityEmptyCueText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  orderRowRoman: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  inlineRankPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineRankPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  medicineIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRowRomanText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  orderRowRomanTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  orderRowRomanSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  orderRowRomanTitleDone: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.52,
  },
  orderRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderSettingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRemoveRoman: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  catalogListFrame: {
    width: '100%',
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  catalogRowTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  catalogRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  catalogRowSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  catalogRowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
