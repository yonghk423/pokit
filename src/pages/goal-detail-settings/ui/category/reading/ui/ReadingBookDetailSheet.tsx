import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  deriveReadingBookProgress,
  ensureReadingBookPages,
  formatDateKeyDisplayKo,
  getLocalDateKey,
  normalizeReadingBookMemo,
  normalizeReadingBookStatus,
  normalizeReadingPageLogs,
  pagesToReadFromLog,
  readPageLogForDate,
  READING_BOOK_MEMO_MAX,
  readingBookExternalLinkLabel,
  resolveReadingBookAuthor,
  resolveReadingBookCatalogSource,
  resolveReadingBookCoverUrl,
  resolveReadingBookExternalLink,
  resolveReadingBookTotalPages,
  setReadingPageLog,
  toMonthStart,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from '@entities/day-plan';
import { readingBookEntryToShareText } from '@entities/day-plan/lib/readingBookShareText';
import { AladinAttributionLine, openAladinProductPage } from '@features/aladin-book-search';
import { OpenLibraryAttributionLine, openOpenLibraryBookPage } from '@features/open-library-book-search';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ScrapTapeLabel } from '@shared/ui/scrap-tape-label';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import {
  READING_ACCENT,
  READING_ACCENT_ON,
  READING_PROGRESS_FILL_DARK,
  READING_PROGRESS_FILL_LIGHT,
  readingAccentOnInk,
  readingStatusDoneFace,
  readingStatusReadingFace,
} from '../lib/readingAccent';
import { ReadingPageLogCalendarSection } from './ReadingPageLogCalendarSection';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const CHIP_SHADOW = 1;
/** 칩·필드 solid shadow — 검정 면보다 옅은 반투명 */
const SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.10)';
const SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.10)';
const DELETE_SHADOW = 1;

const PROGRESS_BAR_HEIGHT = 6;

const PROGRESS_FILL_LIGHT = READING_PROGRESS_FILL_LIGHT;
const PROGRESS_FILL_DARK = READING_PROGRESS_FILL_DARK;

function ReadingBookProgressBar({
  progressPct,
  trackColor,
  isDark,
}: {
  progressPct: number;
  trackColor: string;
  isDark: boolean;
}) {
  const progress = useSharedValue(0);
  const fillStops = isDark ? PROGRESS_FILL_DARK : PROGRESS_FILL_LIGHT;

  useEffect(() => {
    const next = Math.max(0, Math.min(100, progressPct));
    progress.value = withTiming(next, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPct, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
    backgroundColor: interpolateColor(progress.value, [0, 50, 100], [...fillStops]),
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

function pageToInputValue(value: unknown, fallback: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.max(0, Math.round(value)));
  }
  return String(fallback);
}

type Props = {
  visible: boolean;
  entry: ReadingBookEntry | null;
  palette: Palette;
  onClose: () => void;
  onChange: (next: ReadingBookEntry) => void;
  onRemove: () => void;
};

export function ReadingBookDetailSheet({
  visible,
  entry,
  palette,
  onClose,
  onChange,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const softShadow = isDark ? SOFT_SHADOW_DARK : SOFT_SHADOW_LIGHT;
  const faceWhite = isDark ? tone.surfaceAlt : '#FFFFFF';
  const { height: windowHeight } = useWindowDimensions();
  const c = palette;
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewportHeightRef = useRef(300);
  const memoSectionLayoutRef = useRef({ y: 0, height: 0 });
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isMemoFocused, setIsMemoFocused] = useState(false);

  const statusOptions = useMemo(
    (): { key: ReadingBookStatus; label: string }[] => [
      { key: 'want', label: t('goalDetail.reading.status.want') },
      { key: 'reading', label: t('goalDetail.reading.status.reading') },
      { key: 'done', label: t('goalDetail.reading.status.done') },
    ],
    [t],
  );

  const resolved = entry ? ensureReadingBookPages(entry) : null;
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthStart, setMonthStart] = useState(() => toMonthStart(new Date()));
  const [startPageStr, setStartPageStr] = useState('1');
  const [targetPageStr, setTargetPageStr] = useState('100');
  const [todayPagesStr, setTodayPagesStr] = useState('0');
  const [memo, setMemo] = useState('');
  const [pageFieldFocus, setPageFieldFocus] = useState<'start' | 'today' | null>(null);
  const [showDoneCelebrate, setShowDoneCelebrate] = useState(false);
  const celebrateScale = useSharedValue(0.4);
  const celebrateOpacity = useSharedValue(0);
  const pageLogsRef = useRef<ReturnType<typeof normalizeReadingPageLogs>>({});
  const celebrateHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProgressPctRef = useRef<number | null>(null);
  const progressWatchBookIdRef = useRef<string | null>(null);

  const clearCelebrateHideTimer = useCallback(() => {
    if (celebrateHideTimerRef.current) {
      clearTimeout(celebrateHideTimerRef.current);
      celebrateHideTimerRef.current = null;
    }
  }, []);

  const hideDoneCelebrate = useCallback(() => {
    clearCelebrateHideTimer();
    celebrateOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(setShowDoneCelebrate)(false);
    });
  }, [celebrateOpacity, clearCelebrateHideTimer]);

  const playDoneCelebrate = useCallback(() => {
    clearCelebrateHideTimer();
    setShowDoneCelebrate(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    celebrateOpacity.value = 1;
    celebrateScale.value = 0.88;
    celebrateScale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    celebrateHideTimerRef.current = setTimeout(() => {
      celebrateHideTimerRef.current = null;
      hideDoneCelebrate();
    }, 5600);
  }, [celebrateOpacity, celebrateScale, clearCelebrateHideTimer, hideDoneCelebrate]);

  useEffect(() => {
    if (!visible) {
      clearCelebrateHideTimer();
      setShowDoneCelebrate(false);
      celebrateOpacity.value = 0;
      celebrateScale.value = 0.4;
      prevProgressPctRef.current = null;
      progressWatchBookIdRef.current = null;
      return;
    }
    setSelectedDateKey(todayKey);
    setMonthStart(toMonthStart(new Date()));
  }, [visible, entry?.id, todayKey, clearCelebrateHideTimer, celebrateOpacity, celebrateScale]);

  // 책 진행도가 100%에 도달하면 완료 축하 애니메이션 (+ 상태 done)
  useEffect(() => {
    if (!visible || !entry) {
      prevProgressPctRef.current = null;
      progressWatchBookIdRef.current = null;
      return;
    }
    if (progressWatchBookIdRef.current !== entry.id) {
      progressWatchBookIdRef.current = entry.id;
      prevProgressPctRef.current = null;
    }
    const next = ensureReadingBookPages(entry);
    const pct = deriveReadingBookProgress({
      startPage: next.startPage,
      targetPage: next.targetPage,
      totalPages: resolveReadingBookTotalPages(next),
      pageLogs: next.pageLogs,
    }).progressPct;
    const prev = prevProgressPctRef.current;
    prevProgressPctRef.current = pct;
    if (prev == null) return;
    if (pct < 100 || prev >= 100) return;

    if (normalizeReadingBookStatus(entry.status) !== 'done') {
      onChange({ ...entry, status: 'done' });
    }
    playDoneCelebrate();
  }, [
    visible,
    entry,
    onChange,
    playDoneCelebrate,
  ]);

  // 선택 날짜의 pageLogs(또는 오늘이면 책 필드)로 입력칸 동기화
  useEffect(() => {
    if (!entry) return;
    const next = ensureReadingBookPages(entry);
    const logs = normalizeReadingPageLogs(next.pageLogs);
    const dayLog = readPageLogForDate(logs, selectedDateKey);
    if (dayLog) {
      setStartPageStr(pageToInputValue(dayLog.startPage, 1));
      setTargetPageStr(pageToInputValue(dayLog.targetPage, dayLog.startPage));
      setTodayPagesStr(pageToInputValue(pagesToReadFromLog(dayLog), 0));
    } else if (selectedDateKey === todayKey) {
      setStartPageStr(pageToInputValue(next.startPage, 1));
      setTargetPageStr(
        pageToInputValue(next.targetPage, resolveReadingBookTotalPages(next) ?? 100),
      );
      setTodayPagesStr(
        pageToInputValue(Math.max(0, next.targetPage - next.startPage), 0),
      );
    } else {
      setStartPageStr(pageToInputValue(next.startPage, 1));
      setTargetPageStr(
        pageToInputValue(next.targetPage, resolveReadingBookTotalPages(next) ?? 100),
      );
      setTodayPagesStr(
        pageToInputValue(Math.max(0, next.targetPage - next.startPage), 0),
      );
    }
    setMemo(next.memo ?? '');
  }, [
    entry?.id,
    entry?.startPage,
    entry?.targetPage,
    entry?.memo,
    entry?.pageLogs,
    selectedDateKey,
    todayKey,
  ]);

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      setIsMemoFocused(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const scrollMemoIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const { y, height } = memoSectionLayoutRef.current;
      const viewportHeight = scrollViewportHeightRef.current;
      const targetY = y + height - viewportHeight + 32;
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
    });
  }, []);

  useEffect(() => {
    if (!visible || keyboardInset <= 0 || !isMemoFocused) return;
    const timer = setTimeout(() => scrollMemoIntoView(), Platform.OS === 'ios' ? 80 : 120);
    return () => clearTimeout(timer);
  }, [visible, keyboardInset, isMemoFocused, scrollMemoIntoView]);

  const celebrateStyle = useAnimatedStyle(() => ({
    opacity: celebrateOpacity.value,
    transform: [{ scale: celebrateScale.value }],
  }));

  if (!entry || !resolved) return null;

  const sheetMaxHeight = Math.round(windowHeight * 0.88);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);
  const totalPages = resolveReadingBookTotalPages(entry);
  const pageLogs = normalizeReadingPageLogs(entry.pageLogs);
  pageLogsRef.current = pageLogs;
  const { pagesRead, progressPct } = deriveReadingBookProgress({
    startPage,
    targetPage,
    totalPages,
    pageLogs,
  });
  const status = normalizeReadingBookStatus(entry.status);
  const metaLine = resolveReadingBookAuthor(entry) || null;
  const coverUrl = resolveReadingBookCoverUrl(entry);
  const externalLink = resolveReadingBookExternalLink(entry);
  const catalogSource = resolveReadingBookCatalogSource(entry);
  const externalLinkLabel = readingBookExternalLinkLabel(catalogSource);
  const isSelectedToday = selectedDateKey === todayKey;
  const goalSectionTitle = isSelectedToday
    ? t('goalDetail.reading.todayGoal')
    : t('goalDetail.reading.dayGoal', { date: formatDateKeyDisplayKo(selectedDateKey) });
  const goalSectionHint = isSelectedToday
    ? t('goalDetail.reading.todayGoalHint')
    : t('goalDetail.reading.dayGoalHint');

  const commitPages = (nextStart: number, nextTarget: number) => {
    const nextLogs = setReadingPageLog(pageLogsRef.current, selectedDateKey, {
      startPage: nextStart,
      targetPage: nextTarget,
    });
    pageLogsRef.current = nextLogs;
    onChange(
      ensureReadingBookPages({
        ...entry,
        ...(selectedDateKey === todayKey
          ? { startPage: nextStart, targetPage: nextTarget }
          : {}),
        pageLogs: nextLogs,
      }),
    );
  };

  const commitPageLogs = (nextLogs: typeof pageLogs) => {
    pageLogsRef.current = nextLogs;
    const todayLog = readPageLogForDate(nextLogs, todayKey);
    const cleared = Object.keys(nextLogs).length === 0;
    onChange(
      ensureReadingBookPages({
        ...entry,
        pageLogs: nextLogs,
        ...(todayLog
          ? { startPage: todayLog.startPage, targetPage: todayLog.targetPage }
          : cleared
            ? { startPage: 1, targetPage: 1 }
            : {}),
      }),
    );
  };

  const setStatus = (nextStatus: ReadingBookStatus) => {
    const wasDone = status === 'done';
    onChange({ ...entry, status: nextStatus });
    if (nextStatus === 'done' && !wasDone) {
      playDoneCelebrate();
    }
  };

  const commitMemo = () => {
    onChange({
      ...entry,
      memo: normalizeReadingBookMemo(memo),
    });
  };

  const shareBook = async () => {
    const shareEntry = ensureReadingBookPages({
      ...entry,
      startPage,
      targetPage,
      memo: normalizeReadingBookMemo(memo),
      status: showDoneCelebrate ? 'done' : entry.status,
    });
    const message = readingBookEntryToShareText(shareEntry);
    try {
      await Share.share({
        message,
        title: entry.title,
      });
      if (showDoneCelebrate) hideDoneCelebrate();
    } catch {
      Alert.alert(t('goalDetail.reading.shareFailTitle'), t('goalDetail.reading.shareFailBody'));
    }
  };

  const sheetBottomInset =
    keyboardInset > 0 ? 12 : Math.max(insets.bottom, 16);
  const effectiveSheetMaxHeight =
    keyboardInset > 0
      ? Math.min(sheetMaxHeight, windowHeight - keyboardInset - 16)
      : sheetMaxHeight;
  const effectiveScrollMaxHeight = Math.max(180, effectiveSheetMaxHeight - 72);
  scrollViewportHeightRef.current = effectiveScrollMaxHeight;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('dayPlan.close')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceLowest,
              borderColor: c.outline,
              marginBottom: keyboardInset > 0 ? keyboardInset : 0,
              paddingBottom: sheetBottomInset,
              maxHeight: effectiveSheetMaxHeight,
            },
          ]}>
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: isDark ? 'rgba(241,239,255,0.55)' : '#000000' },
              ]}
            />

            <View style={styles.sheetHeader}>
              <ThemedText style={[styles.sheetTitle, { color: c.onSurface }]} numberOfLines={2}>
                {entry.title}
              </ThemedText>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDetail.reading.shareA11y')}
                  onPress={() => {
                    void shareBook();
                  }}
                  hitSlop={8}
                  style={[
                    styles.headerActionBtn,
                    showDoneCelebrate && {
                      backgroundColor: readingStatusReadingFace(isDark),
                      borderWidth: 1.5,
                      borderColor: tone.border,
                    },
                  ]}>
                  <IconSymbol
                    name="square.and.arrow.up"
                    size={16}
                    color={showDoneCelebrate ? READING_ACCENT_ON : c.onSurface}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('dayPlan.close')}
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.headerActionBtn}>
                  <IconSymbol name="xmark" size={14} color={c.onVariant} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={[styles.sheetScroll, { maxHeight: effectiveScrollMaxHeight }]}
              contentContainerStyle={[
                styles.sheetBody,
                keyboardInset > 0 && isMemoFocused && { paddingBottom: 56 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}>
            <View style={styles.bookHero}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.bookCover}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[styles.bookCover, styles.bookCoverFallback, { borderColor: c.outlineVariant }]}>
                  <IconSymbol name="book.closed.fill" size={22} color={c.outline} />
                </View>
              )}
              <View style={styles.bookHeroText}>
                {metaLine ? (
                  <ThemedText style={[styles.bookMeta, { color: c.onVariant }]} numberOfLines={2}>
                    {metaLine}
                  </ThemedText>
                ) : null}
                {externalLink && externalLinkLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (catalogSource === 'aladin') {
                        void openAladinProductPage(externalLink);
                        return;
                      }
                      void openOpenLibraryBookPage(externalLink);
                    }}
                    style={({ pressed }) => pressed && { opacity: 0.72 }}>
                    <ThemedText style={[styles.aladinLink, { color: c.onVariant }]}>
                      {externalLinkLabel}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.statusSection}>
              <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>
                {t('goalDetail.reading.statusLabel')}
              </ThemedText>
              <View style={styles.statusRow}>
                {statusOptions.map((opt) => {
                  const on = status === opt.key;
                  const shadow = on ? 2 : CHIP_SHADOW;
                  const doneFace = readingStatusDoneFace(isDark);
                  const wantFace = isDark ? 'rgba(255, 236, 179, 0.28)' : '#FFE8A8';
                  const onFace =
                    opt.key === 'done'
                      ? doneFace
                      : opt.key === 'want'
                        ? wantFace
                        : readingStatusReadingFace(isDark);
                  const onLabelColor =
                    on && (opt.key === 'done' || opt.key === 'reading')
                      ? readingAccentOnInk(isDark)
                      : on
                        ? tone.text
                        : c.onVariant;
                  return (
                    <View
                      key={opt.key}
                      style={[
                        styles.chipShell,
                        { marginRight: shadow, marginBottom: shadow },
                      ]}>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.chipShadow,
                          {
                            backgroundColor: softShadow,
                            transform: [{ translateX: shadow }, { translateY: shadow }],
                          },
                        ]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        onPress={() => setStatus(opt.key)}
                        style={({ pressed }) => [
                          styles.statusChip,
                          {
                            backgroundColor: on ? onFace : faceWhite,
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}>
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: on ? '800' : '600',
                            color: onLabelColor,
                          }}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.goalSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>
                {goalSectionTitle}
              </ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                {goalSectionHint}
              </ThemedText>

            <View style={styles.progressRow}>
              <ThemedText style={[styles.progressLine, { color: c.onSurface }]}>
                {t('goalDetail.reading.pagesRead', { pages: pagesRead })}
              </ThemedText>
              <ThemedText style={[styles.progressSub, { color: c.onVariant }]}>
                {startPage}P
                {totalPages != null
                  ? t('goalDetail.reading.bookProgress', { percent: progressPct })
                  : ''}
              </ThemedText>
            </View>
            {totalPages != null ? (
              <ReadingBookProgressBar
                progressPct={progressPct}
                trackColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(24,26,46,0.08)'}
                isDark={isDark}
              />
            ) : null}

            <View style={styles.pageFields}>
              {(
                [
                  {
                    key: 'start' as const,
                    label: t('goalDetail.reading.start'),
                    accent: false,
                    editable: true,
                    content: (
                      <View
                        style={[
                          styles.pageFieldEditableValue,
                          {
                            borderBottomColor:
                              pageFieldFocus === 'start'
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#000000'
                                : softShadow,
                          },
                        ]}>
                        <ThemedTextInput
                          value={startPageStr}
                          onChangeText={setStartPageStr}
                          onFocus={() => setPageFieldFocus('start')}
                          onBlur={() => {
                            setPageFieldFocus(null);
                            const nextStart = Math.max(0, parseInt(startPageStr, 10) || 0);
                            const dayPages = Math.max(0, parseInt(todayPagesStr, 10) || 0);
                            commitPages(nextStart, nextStart + dayPages);
                          }}
                          placeholder="1"
                          placeholderTextColor={c.outline}
                          keyboardType="number-pad"
                          selectionColor={tone.primary}
                          hitSlop={12}
                          style={[styles.pageFieldInput, { color: c.onSurface }]}
                        />
                        <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                      </View>
                    ),
                  },
                  {
                    key: 'today' as const,
                    label: isSelectedToday
                      ? t('goalDetail.reading.todayPagesRead')
                      : t('goalDetail.reading.dayPagesRead'),
                    accent: false,
                    editable: true,
                    content: (
                      <View
                        style={[
                          styles.pageFieldEditableValue,
                          {
                            borderBottomColor:
                              pageFieldFocus === 'today'
                                ? isDark
                                  ? '#FAFAFA'
                                  : '#000000'
                                : softShadow,
                          },
                        ]}>
                        <ThemedTextInput
                          value={todayPagesStr}
                          onChangeText={setTodayPagesStr}
                          onFocus={() => setPageFieldFocus('today')}
                          onBlur={() => {
                            setPageFieldFocus(null);
                            const dayPages = Math.max(0, parseInt(todayPagesStr, 10) || 0);
                            commitPages(startPage, startPage + dayPages);
                          }}
                          placeholder="0"
                          placeholderTextColor={c.outline}
                          keyboardType="number-pad"
                          selectionColor={tone.primary}
                          hitSlop={12}
                          style={[styles.pageFieldInput, { color: c.onSurface }]}
                        />
                        <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                      </View>
                    ),
                  },
                  {
                    key: 'total' as const,
                    label: t('goalDetail.reading.totalPages'),
                    accent: true,
                    editable: false,
                    content:
                      totalPages != null ? (
                        <View style={styles.pageFieldStaticValue}>
                          <ThemedText
                            style={[
                              styles.pageFieldValue,
                              { color: readingAccentOnInk(isDark) },
                            ]}>
                            {totalPages}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.pageFieldSuffix,
                              {
                                color: isDark
                                  ? c.onVariant
                                  : 'rgba(247, 242, 243, 0.72)',
                              },
                            ]}>
                            P
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.pageFieldValueMuted, { color: c.outline }]}>—</ThemedText>
                      ),
                  },
                ]
              ).map((field) => (
                <View
                  key={field.key}
                  style={[
                    styles.chipShell,
                    styles.pageFieldShell,
                    { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.chipShadow,
                      {
                        backgroundColor: softShadow,
                        transform: [
                          { translateX: CHIP_SHADOW },
                          { translateY: CHIP_SHADOW },
                        ],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.pageField,
                      {
                        backgroundColor: field.accent
                          ? readingStatusDoneFace(isDark)
                          : faceWhite,
                      },
                    ]}>
                    <View style={styles.pageFieldLabelRow}>
                      <ThemedText
                        style={[
                          styles.pageFieldLabel,
                          {
                            color: field.accent
                              ? isDark
                                ? c.onVariant
                                : 'rgba(247, 242, 243, 0.78)'
                              : c.onVariant,
                          },
                        ]}
                        numberOfLines={2}>
                        {field.label}
                      </ThemedText>
                      {field.editable ? (
                        <IconSymbol name="pencil" size={11} color={c.onVariant} />
                      ) : null}
                    </View>
                    {field.content}
                  </View>
                </View>
              ))}
            </View>

            <ReadingPageLogCalendarSection
              pageLogs={pageLogs}
              selectedDateKey={selectedDateKey}
              monthStart={monthStart}
              fallbackPages={{ startPage, targetPage }}
              palette={c}
              onChangePageLogs={commitPageLogs}
              onSelectDate={setSelectedDateKey}
              onChangeMonthStart={setMonthStart}
            />
            </View>

            <View
              style={styles.memoSection}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                memoSectionLayoutRef.current = { y, height };
              }}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>
                {t('goalDetail.reading.memo')}
              </ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                {t('goalDetail.reading.memoHint')}
              </ThemedText>
              <View
                style={[
                  styles.chipShell,
                  { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.chipShadow,
                    {
                      backgroundColor: softShadow,
                      transform: [
                        { translateX: CHIP_SHADOW },
                        { translateY: CHIP_SHADOW },
                      ],
                    },
                  ]}
                />
                <ThemedTextInput
                  value={memo}
                  onChangeText={(text) => setMemo(text.slice(0, READING_BOOK_MEMO_MAX))}
                  onFocus={() => {
                    setIsMemoFocused(true);
                    scrollMemoIntoView();
                  }}
                  onBlur={() => {
                    setIsMemoFocused(false);
                    commitMemo();
                  }}
                  placeholder={t('goalDetail.reading.memoPlaceholder')}
                  placeholderTextColor={c.outline}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.memoInput,
                    {
                      color: c.onSurface,
                      backgroundColor: faceWhite,
                    },
                  ]}
                />
              </View>
            </View>

            {catalogSource === 'aladin' ? (
              <AladinAttributionLine color={c.outline} compact />
            ) : catalogSource === 'openlibrary' ? (
              <OpenLibraryAttributionLine color={c.outline} compact />
            ) : null}

            <View style={styles.removeShell}>
              <View
                pointerEvents="none"
                style={[
                  styles.removeShadow,
                  { backgroundColor: 'rgba(186, 26, 26, 0.12)' },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('goalDetail.reading.removeA11y', { title: entry.title })}
                onPress={() => {
                  Alert.alert(
                    t('goalDetail.reading.removeFromLibrary'),
                    t('goalDetail.reading.removeConfirm', { title: entry.title }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: () => {
                          onRemove();
                          onClose();
                        },
                      },
                    ],
                  );
                }}
                style={[styles.removeBtn, { backgroundColor: 'rgba(255, 218, 214, 0.35)' }]}>
                <ThemedText style={[styles.removeBtnText, { color: tone.danger }]}>
                  {t('goalDetail.reading.removeFromLibrary')}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
          {showDoneCelebrate ? (
            <View pointerEvents="box-none" style={styles.celebrateLayer}>
              <Animated.View style={[styles.celebrateCard, celebrateStyle]}>
                <ScrapTapeLabel
                  text={t('goalDetail.reading.doneCelebrateWithTitle', { title: entry.title })}
                  isDark={isDark}
                  tone="scrap"
                  rotateDeg={0}
                  style={styles.celebrateTape}
                  accessibilityLabel={t('goalDetail.reading.doneCelebrateWithTitle', {
                    title: entry.title,
                  })}
                />
                <View style={styles.celebrateShareWrap}>
                  <BrutalConfirmButton
                    align="stretch"
                    fill={READING_ACCENT}
                    labelColor={READING_ACCENT_ON}
                    label={t('goalDetail.reading.shareCompletion')}
                    accessibilityLabel={t('goalDetail.reading.shareCompletion')}
                    onPress={() => {
                      void shareBook();
                    }}
                  />
                </View>
              </Animated.View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingTop: 8,
    overflow: 'hidden',
  },
  celebrateLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  celebrateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  celebrateShareWrap: {
    alignSelf: 'stretch',
    minWidth: 240,
  },
  celebrateTape: {
    maxWidth: 300,
    alignSelf: 'center',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { paddingHorizontal: 16, gap: 14, paddingBottom: 16 },
  bookHero: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  bookCover: { width: 64, height: 90, backgroundColor: '#f3f4f6' },
  bookCoverFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  bookHeroText: { flex: 1, gap: 6, paddingTop: 4 },
  bookMeta: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  aladinLink: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  statusSection: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipShell: {
    position: 'relative',
  },
  chipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  statusChip: {
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
    zIndex: 1,
  },
  goalSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLine: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  progressSub: { fontSize: 12, fontWeight: '600' },
  progressTrack: {
    height: PROGRESS_BAR_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    overflow: 'hidden',
  },
  pageFields: { flexDirection: 'row', gap: 8 },
  pageFieldShell: {
    flex: 1,
    minWidth: 0,
  },
  pageField: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 72,
    zIndex: 1,
  },
  pageFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.15,
    textAlign: 'center',
    lineHeight: 14,
  },
  pageFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 16,
  },
  pageFieldInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  pageFieldEditableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 2,
    paddingBottom: 4,
    paddingTop: 2,
    minWidth: 56,
    minHeight: 36,
    justifyContent: 'center',
  },
  pageFieldStaticValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  pageFieldInput: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 40,
    minHeight: 32,
  },
  pageFieldSuffix: { fontSize: 13, fontWeight: '700' },
  pageFieldValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  pageFieldValueMuted: { fontSize: 22, fontWeight: '500' },
  memoSection: { gap: 8 },
  memoInput: {
    minHeight: 88,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    zIndex: 1,
  },
  /** 루틴 삭제 버튼과 동일 — 우측 하단 작은 CTA */
  removeShell: {
    position: 'relative',
    alignSelf: 'flex-end',
    marginTop: 12,
    marginRight: DELETE_SHADOW,
    marginBottom: DELETE_SHADOW,
  },
  removeShadow: {
    position: 'absolute',
    top: DELETE_SHADOW,
    left: DELETE_SHADOW,
    right: -DELETE_SHADOW,
    bottom: -DELETE_SHADOW,
    borderWidth: 0,
    borderRadius: 0,
  },
  removeBtn: {
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
    opacity: 0.5,
  },
});
