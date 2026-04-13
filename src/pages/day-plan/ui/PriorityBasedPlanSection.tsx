// @ts-nocheck — RN Web에서 StyleSheet.create 타입이 TextStyle|ViewStyle로 합쳐져 Reanimated·제스처와 충돌함
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { formatMinutesToHHmm, PICKER_CATEGORIES, PRIMARY } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

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
}: {
  value: string;
  onChange: (hhmm: string) => void;
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
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  mergedOuter: {
    width: '100%',
    maxWidth: 408,
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
    width: 18,
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
  /** clock-digit — lineHeight 없으면 세로 클리핑으로 ‘가운데 잘린 선’처럼 보일 수 있음 */
  digitInput: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    padding: 0,
    margin: 0,
    textAlign: 'center',
    minWidth: 72,
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
  priorityStart: string;
  priorityEnd: string;
  onChangePriorityStart: (v: string) => void;
  onChangePriorityEnd: (v: string) => void;
  priorityCategoryOrder: string[];
  onSelectCategory: (key: string) => void;
  /** 목록 행에서 상세 설정 열기 — categoryKey를 전달 */
  onOpenCategorySettings?: (categoryKey: string) => void;
};

/* ─── 왼쪽 페이지: 우선 순위 목록 ─── */

function OrderRow({
  icon,
  label,
  isDark,
  ink,
  inkMuted,
  line,
  onRemove,
  onSettings,
}: {
  icon: string;
  label: string;
  isDark: boolean;
  ink: string;
  inkMuted: string;
  line: string;
  onRemove: () => void;
  onSettings?: () => void;
}) {
  return (
    <View style={[styles.orderRowRoman, { borderBottomColor: line }]}>
      <IconSymbol name={icon as any} size={20} color={ink} />
      <View style={styles.orderRowRomanText}>
        <ThemedText
          style={[styles.orderRowRomanTitle, { color: ink }]}
          numberOfLines={1}
          lightColor={ink}
          darkColor={ink}>
          {label}
        </ThemedText>
      </View>
      <View style={styles.orderRowActions}>
        {onSettings ? (
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
          accessibilityLabel={`${label} 제거`}
          hitSlop={12}
          onPress={onRemove}
          style={[styles.orderRemoveRoman, { borderColor: line }]}>
          <IconSymbol name="xmark" size={12} color={isDark ? inkMuted : ink} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── 도구 카탈로그 — 세로 목록(추가형) ─── */

function CatalogListRow({
  icon,
  label,
  selected,
  ink,
  muted,
  line,
  onPress,
}: {
  icon: string;
  label: string;
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
      accessibilityLabel={`${label}, ${selected ? '담김' : '담기'}`}
      onPress={onPress}
      style={[styles.catalogRow, { borderBottomColor: line }]}>
      <IconSymbol name={icon as any} size={22} color={selected ? PRIMARY : muted} />
      <ThemedText
        style={[styles.catalogRowLabel, { color: selected ? ink : muted }]}
        lightColor={selected ? ink : muted}
        darkColor={selected ? ink : muted}
        numberOfLines={1}>
        {label}
      </ThemedText>
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

/* ─── 메인 ─── */

export function PriorityBasedPlanSection({
  c,
  priorityStart,
  priorityEnd,
  onChangePriorityStart,
  onChangePriorityEnd,
  priorityCategoryOrder,
  onSelectCategory,
  onOpenCategorySettings,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bc = bookColors(c, isDark);

  const selectedItems = useMemo(
    () =>
      priorityCategoryOrder
        .map((key) => PICKER_CATEGORIES.find((cat) => cat.key === key))
        .filter(Boolean) as (typeof PICKER_CATEGORIES)[number][],
    [priorityCategoryOrder],
  );

  const bagCount = selectedItems.length;

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
              <FlipClockTimePair value={priorityStart} onChange={onChangePriorityStart} />
            </View>
            <View style={styles.timeArrowColumn}>
              <IconSymbol name="arrow.right" size={18} color={editorial.muted} />
            </View>
            <View style={styles.timeFlipColumn}>
              <ThemedText style={[styles.timeKicker, { color: editorial.muted }]}>종료</ThemedText>
              <FlipClockTimePair value={priorityEnd} onChange={onChangePriorityEnd} />
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
              여기에는 오늘 플로의 우선 순위를 담아요.
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
                  selectedItems.map((cat) => (
                    <OrderRow
                      key={cat.key}
                      icon={cat.icon}
                      label={cat.label}
                      isDark={isDark}
                      ink={editorial.ink}
                      inkMuted={editorial.muted}
                      line={editorial.line}
                      onRemove={() => handleRemove(cat.key)}
                      onSettings={onOpenCategorySettings ? () => onOpenCategorySettings(cat.key) : undefined}
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
  timeRibbonInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
  },
  timeFlipColumn: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    alignItems: 'center',
  },
  timeArrowColumn: {
    width: 28,
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
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
  catalogRowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  catalogRowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
