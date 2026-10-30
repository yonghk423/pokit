import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { categoryReminderLabelKo, useDayPlanDraftStore } from '@entities/day-plan';
import { historyDateKeyToday, useHistoryStore } from '@entities/history';
import {
  isPuzzleHistoryTarget,
  puzzleLayoutSalt,
  PUZZLE_INK_COLORS,
  sanitizePuzzleInkStrokes,
  usePuzzleHistoryStore,
  type PuzzleInkColor,
} from '@entities/puzzle-history';
import {
  countCompletionsByCategory,
  linkedRoutineContributionCounts,
  linkedRoutineCountsByDate,
  syncPuzzleHistoryFromDailyStats,
} from '@features/puzzle-history-sync';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatDateKeyDisplay, useTranslation, type I18nKey } from '@shared/lib/i18n';
import { puzzleHistoryImageExists } from '@shared/lib/media/pickPuzzleHistoryImage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button/BrutalConfirmButton';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { PuzzleBoard } from '@widgets/puzzle-history-board';

import { shareLocalImageFile } from '../lib/shareCompletedPuzzleImage';
import { collectTodayInProgressRoutineKeys } from './collectTodayInProgressRoutineKeys';
import { PuzzleCollageExporter, type CollageExportRequest } from './PuzzleCollageExporter';
import { PuzzleHandwritingLayer } from './PuzzleHandwritingLayer';
import { PuzzleOpenedDaysCalendar } from './PuzzleOpenedDaysCalendar';
import { PuzzleRenameSheet } from './PuzzleRenameSheet';

/** 메인 펼침 보드와 동일 회백색 면 */
const BOARD_FACE = '#F5F4F2';
const BOARD_SHELL_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const BOARD_SHELL_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';
const BOARD_SHELL_SHADOW_OFFSET = 1;
const INK_SWATCH_SIZE = 28;
const INK_SWATCH_GAP = 8;
const INK_PALETTE_WIDTH =
  PUZZLE_INK_COLORS.length * INK_SWATCH_SIZE +
  (PUZZLE_INK_COLORS.length - 1) * INK_SWATCH_GAP;

const INK_COLOR_LABEL: Record<(typeof PUZZLE_INK_COLORS)[number], I18nKey> = {
  '#1A1A1A': 'history.puzzle.handwriteInkBlack',
  '#FFFFFF': 'history.puzzle.handwriteInkWhite',
  '#E15A5A': 'history.puzzle.handwriteInkRed',
  '#F0C14A': 'history.puzzle.handwriteInkYellow',
  '#3E7FD6': 'history.puzzle.handwriteInkBlue',
  '#2F8F8C': 'history.puzzle.handwriteInkMint',
  '#E48BB4': 'history.puzzle.handwriteInkPink',
};

function inkFaceIsLight(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

function isoToLocalDateKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    return null;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PREVIEW_FIVE = ['reading', 'work', 'water', 'fasting', 'healthIntake'] as const;
const PREVIEW_TEN = [
  ...PREVIEW_FIVE,
  'other',
  'review',
  'sampleStretch',
  'sampleWalk',
  'sampleMeditation',
] as const;

const PREVIEW_TWO = ['reading', 'work'] as const;
const PREVIEW_THREE = ['reading', 'work', 'water'] as const;

/** 목업에서 루틴 개수별 달력을 바로 보게 하는 미리보기. 저장값과 별개다. */
const MOCK_ROUTINE_PREVIEW: Record<string, readonly string[]> = {
  ph_dev_mock_album_10_basketball: PREVIEW_TWO,
  ph_dev_mock_album_20_garage_kettlebell: PREVIEW_TWO,
  ph_dev_mock_album_50_desk: PREVIEW_TWO,
  ph_dev_mock_album_10_meal: PREVIEW_THREE,
  ph_dev_mock_album_100_lake: PREVIEW_THREE,
  ph_dev_mock_album_50_open_book: PREVIEW_THREE,
  ph_dev_mock_album_20_hands_heart: PREVIEW_FIVE,
  ph_dev_mock_album_100_peace: PREVIEW_FIVE,
  ph_dev_mock_album_20_happy: PREVIEW_FIVE,
  ph_dev_mock_album_10_rocky: PREVIEW_TEN,
};

function previewRoutineLabel(
  key: string,
  translate: (
    key:
      | 'history.puzzle.sampleStretch'
      | 'history.puzzle.sampleWalk'
      | 'history.puzzle.sampleMeditation',
  ) => string,
): string {
  if (key === 'sampleStretch') return translate('history.puzzle.sampleStretch');
  if (key === 'sampleWalk') return translate('history.puzzle.sampleWalk');
  if (key === 'sampleMeditation') return translate('history.puzzle.sampleMeditation');
  return categoryReminderLabelKo(key);
}

function mockRoutineCountsByDate(
  linkedKeys: string[],
  pieces: Array<{ puzzleIndex: number; dateKey: string | null }>,
): Record<string, Array<{ categoryKey: string; count: number }>> {
  const out: Record<string, Array<{ categoryKey: string; count: number }>> = {};
  const add = (dateKey: string, categoryKey: string) => {
    const bucket = out[dateKey] ?? [];
    const found = bucket.find((row) => row.categoryKey === categoryKey);
    if (found) found.count += 1;
    else bucket.push({ categoryKey, count: 1 });
    out[dateKey] = bucket;
  };
  for (const piece of pieces) {
    if (!piece.dateKey || linkedKeys.length === 0) continue;
    const index = piece.puzzleIndex;
    if (index === 0) {
      for (const key of linkedKeys) add(piece.dateKey, key);
      continue;
    }
    const primary = linkedKeys[index % linkedKeys.length];
    if (primary) add(piece.dateKey, primary);
    if (linkedKeys.length >= 2 && index % 4 === 0) {
      const extra = linkedKeys[(index + 1) % linkedKeys.length];
      if (extra) add(piece.dateKey, extra);
    }
    if (linkedKeys.length >= 3 && index % 5 === 0) {
      const extra = linkedKeys[(index + 2) % linkedKeys.length];
      if (extra) add(piece.dateKey, extra);
    }
  }
  return out;
}

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T12:00:00`);
  const b = new Date(`${toKey}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function PuzzleHistoryDetailPage() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const params = useLocalSearchParams<{ id?: string }>();

  const { hydrate, histories, removeHistory, renameHistory, addLinkedRoutines, setHistoryInk } =
    usePuzzleHistoryStore(
      useShallow((s) => ({
        hydrate: s.hydrate,
        histories: s.histories,
        removeHistory: s.removeHistory,
        renameHistory: s.renameHistory,
        addLinkedRoutines: s.addLinkedRoutines,
        setHistoryInk: s.setHistoryInk,
      })),
    );
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  const priorityCategoryOrder = useDayPlanDraftStore((s) => s.priorityCategoryOrder);
  const completedFocusCategoryKeys = useDayPlanDraftStore((s) => s.completedFocusCategoryKeys);
  const historyHydrate = useHistoryStore((s) => s.hydrate);
  const dailyStatsByDate = useHistoryStore((s) => s.dailyStatsByDate);

  const [boardSize, setBoardSize] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [writing, setWriting] = useState(false);
  const [inkColor, setInkColor] = useState<PuzzleInkColor>('#FFFFFF');
  const inkReveal = useSharedValue(0);
  const [imageBroken, setImageBroken] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const sharingRef = useRef(false);
  const collageWaiter = useRef<((fileUri: string | null) => void) | null>(null);
  const [exportingCollage, setExportingCollage] = useState(false);
  const [collageJob, setCollageJob] = useState<CollageExportRequest | null>(null);

  useEffect(() => {
    hydrate();
    historyHydrate();
    syncPuzzleHistoryFromDailyStats();
  }, [hydrate, historyHydrate]);

  const inProgressKeys = useMemo(() => {
    void categoryLabelEpoch;
    return collectTodayInProgressRoutineKeys(priorityCategoryOrder, completedFocusCategoryKeys);
  }, [categoryLabelEpoch, completedFocusCategoryKeys, priorityCategoryOrder]);

  const history = useMemo(() => {
    const id = typeof params.id === 'string' ? params.id : '';
    return histories.find((h) => h.id === id) ?? null;
  }, [histories, params.id]);

  const addableKeys = useMemo(() => {
    const linked = new Set(history?.linkedCategoryKeys ?? []);
    return inProgressKeys.filter((key) => !linked.has(key));
  }, [history?.linkedCategoryKeys, inProgressKeys]);

  useEffect(() => {
    let cancelled = false;
    if (!history?.imageUri) {
      setImageBroken(false);
      return;
    }
    void puzzleHistoryImageExists(history.imageUri).then((ok) => {
      if (!cancelled) setImageBroken(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, [history?.imageUri]);

  useEffect(() => {
    setWriting(false);
  }, [history?.id]);

  useEffect(() => {
    inkReveal.value = withTiming(writing ? 1 : 0, {
      duration: writing ? 240 : 160,
      easing: writing ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [inkReveal, writing]);

  const inkColorsStyle = useAnimatedStyle(() => ({
    opacity: inkReveal.value,
    width: inkReveal.value * INK_PALETTE_WIDTH,
    transform: [{ translateX: (1 - inkReveal.value) * -8 }],
  }));
  const inkHintStyle = useAnimatedStyle(() => ({
    opacity: inkReveal.value,
    height: inkReveal.value * 22,
    marginTop: inkReveal.value * 6,
    transform: [{ translateY: (1 - inkReveal.value) * -4 }],
  }));

  const detailMeta = useMemo(() => {
    if (!history) return null;
    const targetCount = history.targetCount ?? history.duration ?? 10;
    const completedCount = history.completedCount ?? history.completedDays ?? 0;
    const totalPieces = history.totalPieces ?? history.totalDays ?? targetCount;
    const remaining = Math.max(0, totalPieces - completedCount);
    const progressRatio =
      totalPieces > 0 ? Math.min(1, Math.max(0, completedCount / totalPieces)) : 0;
    const startedKey =
      isoToLocalDateKey(history.createdAt) ??
      (typeof history.startDateKey === 'string' ? history.startDateKey : null);
    const finishedKey =
      isoToLocalDateKey(history.completedAt) ??
      (typeof history.endDateKey === 'string' ? history.endDateKey : null);
    const endKeyForElapsed =
      history.status === 'completed' && finishedKey
        ? finishedKey
        : historyDateKeyToday();
    const dayNumber = startedKey
      ? daysBetweenDateKeys(startedKey, endKeyForElapsed) + 1
      : null;
    const pieces = history.pieces ?? history.dailyRecords ?? [];
    const openedPieces = pieces
      .filter((row) => row.completed)
      .slice()
      .sort((a, b) => a.puzzleIndex - b.puzzleIndex)
      .map((row) => {
        const dateKey = isoToLocalDateKey(row.completedAt);
        return {
          puzzleIndex: row.puzzleIndex,
          dateKey,
          dateLabel: dateKey ? formatDateKeyDisplay(dateKey, locale) : null,
        };
      });
    let contributions = linkedRoutineContributionCounts({
      linkedCategoryKeys: history.linkedCategoryKeys,
      completionBaselineByCategory: history.completionBaselineByCategory,
      dailyStatsByDate,
    });
    const linkedKeys =
      [...(MOCK_ROUTINE_PREVIEW[history.id] ?? history.linkedCategoryKeys ?? [])];
    const pieceDateKeys = openedPieces.flatMap((row) => (row.dateKey ? [row.dateKey] : []));
    let routinesByDate = history.id.startsWith('ph_dev_mock_')
      ? mockRoutineCountsByDate(linkedKeys, openedPieces)
      : linkedRoutineCountsByDate({
        linkedCategoryKeys: linkedKeys,
        dateKeys: pieceDateKeys,
        dailyStatsByDate,
      });
    const hasDayStats = Object.keys(routinesByDate).length > 0;
    if (!hasDayStats && linkedKeys.length > 0) {
      const filled: typeof routinesByDate = {};
      for (const piece of openedPieces) {
        if (!piece.dateKey) continue;
        const categoryKey = linkedKeys[piece.puzzleIndex % linkedKeys.length] ?? linkedKeys[0];
        if (!categoryKey) continue;
        const bucket = filled[piece.dateKey] ?? [];
        const found = bucket.find((row) => row.categoryKey === categoryKey);
        if (found) found.count += 1;
        else bucket.push({ categoryKey, count: 1 });
        filled[piece.dateKey] = bucket;
      }
      routinesByDate = filled;
    } else if (linkedKeys.length === 1) {
      const categoryKey = linkedKeys[0];
      if (categoryKey) {
        for (const piece of openedPieces) {
          if (!piece.dateKey || routinesByDate[piece.dateKey]) continue;
          routinesByDate[piece.dateKey] = [{ categoryKey, count: 1 }];
        }
      }
    }
    if (history.id.startsWith('ph_dev_mock_')) {
      contributions = linkedKeys
        .map((categoryKey) => {
          let count = 0;
          for (const rows of Object.values(routinesByDate)) {
            count += rows.find((row) => row.categoryKey === categoryKey)?.count ?? 0;
          }
          return { categoryKey, count };
        })
        .filter((row) => row.count > 0);
    }
    const labeledRoutinesByDate = Object.fromEntries(
      Object.entries(routinesByDate).map(([dateKey, rows]) => [
        dateKey,
        rows.map((row) => ({
          key: row.categoryKey,
          label: previewRoutineLabel(row.categoryKey, t),
          count: row.count,
        })),
      ]),
    );
    return {
      targetCount,
      completedCount,
      totalPieces,
      remaining,
      progressRatio,
      startedKey,
      finishedKey,
      dayNumber,
      openedPieces,
      contributions,
      labeledRoutinesByDate,
    };
  }, [dailyStatsByDate, history, locale, t]);

  if (!history || !detailMeta) {
    return (
      <ThemedView style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => { tapHaptic(); if (router.canGoBack()) router.back(); else router.replace('/puzzle-history'); }}
            style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={18} color={c.text} />
          </Pressable>
        </View>
        <ThemedText style={[styles.empty, { color: c.textMuted }]}>
          {t('history.puzzle.detailMissing')}
        </ThemedText>
      </ThemedView>
    );
  }

  const cover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const mint = isDark ? RetroFlatColors.dark.bgMint : RetroFlatColors.light.bgMint;
  const trackBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const {
    targetCount,
    completedCount,
    totalPieces,
    remaining,
    progressRatio,
    startedKey,
    finishedKey,
    dayNumber,
    openedPieces,
    contributions,
    labeledRoutinesByDate,
  } = detailMeta;
  const canSharePhoto = history.status === 'completed' && !imageBroken;

  const exportCollage = () => {
    if (!canSharePhoto || sharingRef.current || exportingCollage) return;
    const target = history.targetCount ?? history.duration ?? 0;
    if (!isPuzzleHistoryTarget(target)) return;
    const pieces = history.pieces ?? history.dailyRecords ?? [];
    sharingRef.current = true;
    setExportingCollage(true);
    void Haptics.selectionAsync();
    const request: CollageExportRequest = {
      id: `${history.id}-${Date.now()}`,
      imageUri: history.imageUri,
      title: history.title,
      targetCount: target,
      completedPuzzleIndices: pieces
        .filter((piece) => piece.completed)
        .map((piece) => piece.puzzleIndex),
      ink: sanitizePuzzleInkStrokes(
        usePuzzleHistoryStore.getState().histories.find((row) => row.id === history.id)?.inkStrokes,
      ),
      layoutSalt: puzzleLayoutSalt(history.id),
    };
    void new Promise<string | null>((resolve) => {
      collageWaiter.current = resolve;
      setCollageJob(request);
    })
      .then(async (fileUri) => {
        if (!fileUri) {
          Alert.alert(
            t('history.puzzle.exportCollageFailedTitle'),
            t('history.puzzle.exportCollageFailedBody'),
          );
          return;
        }
        const result = await shareLocalImageFile(fileUri);
        if (result === 'failed') {
          Alert.alert(
            t('history.puzzle.exportCollageFailedTitle'),
            t('history.puzzle.exportCollageFailedBody'),
          );
        }
      })
      .finally(() => {
        collageWaiter.current = null;
        sharingRef.current = false;
        setExportingCollage(false);
        setCollageJob(null);
      });
  };

  return (
    <ThemedView style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={10}
          onPress={() => {
            void Haptics.selectionAsync();
            if (router.canGoBack()) router.back();
            else router.replace('/puzzle-history');
          }}
          style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={18} color={c.text} />
        </Pressable>
        {canSharePhoto ? <View style={styles.backBtn} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${history.title}, ${t('history.puzzle.renameA11y')}`}
          accessibilityHint={t('history.puzzle.renameA11y')}
          onPress={() => {
            void Haptics.selectionAsync();
            setRenameOpen(true);
          }}
          style={styles.topMeta}>
          <View style={styles.topTitleEditRow}>
            <ThemedText style={[styles.topTitle, { color: c.text }]} numberOfLines={1}>
              {history.title}
            </ThemedText>
            <IconSymbol name="pencil" size={10} color={c.textMuted} />
          </View>
          <ThemedText style={[styles.topCount, { color: c.textMuted }]} numberOfLines={1}>
            {t('history.puzzle.progress', {
              completed:
                history.status === 'completed' && completedCount <= 0
                  ? targetCount
                  : completedCount,
              total: totalPieces,
            })}
          </ThemedText>
        </Pressable>
        {canSharePhoto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('history.puzzle.exportCollageA11y')}
            hitSlop={10}
            onPress={exportCollage}
            style={styles.backBtn}>
            <IconSymbol name="square.and.arrow.up" size={18} color={c.text} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.puzzle.deleteCta')}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(t('history.puzzle.deleteTitle'), t('history.puzzle.deleteBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('history.puzzle.deleteCta'),
                style: 'destructive',
                onPress: () => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  removeHistory(history.id);
                  if (router.canGoBack()) router.back();
                  else router.replace('/puzzle-history');
                },
              },
            ]);
          }}
          style={styles.backBtn}>
          <IconSymbol name="trash" size={18} color={c.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.boardWrap}>
          <PostItCardShell
            isDark={isDark}
            faceColor={BOARD_FACE}
            shadowColor={
              isDark ? BOARD_SHELL_SHADOW_DARK : BOARD_SHELL_SHADOW_LIGHT
            }
            shadowOffset={BOARD_SHELL_SHADOW_OFFSET}
            showTape={false}
            contentStyle={styles.boardBleed}>
            <View
              style={styles.boardHit}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                const h = e.nativeEvent.layout.height;
                if (w > 0 && Math.abs(w - boardSize) > 0.5) setBoardSize(w);
                if (h > 160 && Math.abs(h - boardHeight) > 0.5) setBoardHeight(h);
              }}>
              {boardSize > 0 ? (
                <PuzzleBoard
                  history={history}
                  width={boardSize}
                  ink={c.text}
                  muted={c.textMuted}
                  cover={cover}
                  imageBroken={imageBroken}
                  showInk={!canSharePhoto}
                />
              ) : (
                <View style={{ height: 120 }} />
              )}
              {canSharePhoto && boardSize > 0 && boardHeight > 160 ? (
                <PuzzleHandwritingLayer
                  width={boardSize}
                  height={boardHeight}
                  strokes={history.inkStrokes ?? []}
                  color={inkColor}
                  enabled={writing}
                  onCommitStroke={(stroke) => {
                    const current =
                      usePuzzleHistoryStore
                        .getState()
                        .histories.find((row) => row.id === history.id)?.inkStrokes ?? [];
                    setHistoryInk(history.id, [...current, stroke]);
                  }}
                />
              ) : null}
            </View>
          </PostItCardShell>
        </View>

        {canSharePhoto && boardHeight > 160 ? (
          <Animated.View
            entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
            style={styles.inkBlock}>
            <View style={styles.inkRow}>
              <View style={styles.saveTapeHost}>
                <View pointerEvents="none" style={styles.saveTapeWrap}>
                  <View
                    style={[
                      styles.saveTape,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.34)'
                          : 'rgba(255,255,255,0.82)',
                      },
                    ]}
                  />
                </View>
                <BrutalConfirmButton
                  align="end"
                  compact
                  label={
                    writing ? t('history.puzzle.handwriteDone') : t('history.puzzle.handwrite')
                  }
                  accessibilityLabel={
                    writing
                      ? t('history.puzzle.handwriteDoneA11y')
                      : t('history.puzzle.handwriteA11y')
                  }
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setWriting((on) => !on);
                  }}
                  style={styles.shareBtn}
                />
              </View>
              <Animated.View
                pointerEvents={writing ? 'auto' : 'none'}
                style={[styles.inkColors, inkColorsStyle]}>
                {PUZZLE_INK_COLORS.map((color) => {
                  const selected = inkColor === color;
                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(INK_COLOR_LABEL[color])}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setInkColor(color);
                      }}
                      style={[
                        styles.inkSwatch,
                        {
                          backgroundColor: color,
                          borderColor: selected
                            ? inkFaceIsLight(color)
                              ? isDark
                                ? 'rgba(255,255,255,0.78)'
                                : 'rgba(0,0,0,0.62)'
                              : isDark
                                ? 'rgba(255,255,255,0.78)'
                                : '#FFFFFF'
                            : isDark
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(0,0,0,0.14)',
                          borderWidth: selected ? 1 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    />
                  );
                })}
              </Animated.View>
              {(history.inkStrokes?.length ?? 0) > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('history.puzzle.handwriteUndo')}
                  onPress={() => {
                    const current =
                      usePuzzleHistoryStore
                        .getState()
                        .histories.find((row) => row.id === history.id)?.inkStrokes ?? [];
                    if (current.length === 0) return;
                    void Haptics.selectionAsync();
                    setHistoryInk(history.id, current.slice(0, -1));
                  }}
                  style={styles.inkTextBtn}>
                  <ThemedText style={[styles.inkText, { color: c.text }]}>
                    {t('history.puzzle.handwriteUndo')}
                  </ThemedText>
                </Pressable>
              ) : null}
              {(history.inkStrokes?.length ?? 0) > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('history.puzzle.handwriteClear')}
                  onPress={() => {
                    Alert.alert(
                      t('history.puzzle.handwriteClearTitle'),
                      t('history.puzzle.handwriteClearBody'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('history.puzzle.handwriteClear'),
                          style: 'destructive',
                          onPress: () => {
                            void Haptics.notificationAsync(
                              Haptics.NotificationFeedbackType.Success,
                            );
                            setHistoryInk(history.id, []);
                            setWriting(false);
                          },
                        },
                      ],
                    );
                  }}
                  style={styles.inkTextBtn}>
                  <ThemedText style={[styles.inkText, { color: c.text }]}>
                    {t('history.puzzle.handwriteClear')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <Animated.View
              pointerEvents={writing ? 'auto' : 'none'}
              style={[styles.inkHintWrap, inkHintStyle]}>
              <ThemedText style={[styles.inkHint, { color: c.textMuted }]}>
                {t('history.puzzle.handwriteHint')}
              </ThemedText>
            </Animated.View>
          </Animated.View>
        ) : null}

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <ThemedText style={[styles.infoPrimary, { color: c.text }]}>
              {t('history.puzzle.rangeLabel', { count: targetCount })}
            </ThemedText>
            <ThemedText style={[styles.infoBadge, { color: c.textMuted }]}>
              {history.status === 'completed'
                ? t('history.puzzle.statusDone')
                : t('history.puzzle.statusInProgress')}
            </ThemedText>
          </View>

          <View
            style={[styles.progressTrack, { backgroundColor: trackBg }]}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: totalPieces,
              now: completedCount,
            }}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progressRatio * 100)}%`,
                  backgroundColor: mint,
                },
              ]}
            />
          </View>

          <ThemedText style={[styles.infoLine, { color: c.text }]}>
            {t('history.puzzle.progress', {
              completed: completedCount,
              total: totalPieces,
            })}
            {history.status !== 'completed'
              ? ` · ${t('history.puzzle.remainingLabel', { count: remaining })}`
              : null}
            {dayNumber != null
              ? ` · ${t('history.puzzle.elapsedLabel', { count: dayNumber })}`
              : null}
          </ThemedText>

          {startedKey ? (
            <ThemedText style={[styles.infoMuted, { color: c.textMuted }]}>
              {t('history.puzzle.startedOn', {
                date: formatDateKeyDisplay(startedKey, locale),
              })}
            </ThemedText>
          ) : null}
          {history.status === 'completed' && finishedKey ? (
            <ThemedText style={[styles.infoMuted, { color: c.textMuted }]}>
              {t('history.puzzle.finishedOn', {
                date: formatDateKeyDisplay(finishedKey, locale),
              })}
            </ThemedText>
          ) : null}
        </View>

        {history.status === 'completed' ? (
          <View style={styles.completeRow}>
            <ThemedText
              style={[
                styles.completeBanner,
                { color: c.text },
                canSharePhoto ? styles.completeBannerBeside : null,
              ]}>
              {t('history.puzzle.completedBanner', { count: targetCount })}
            </ThemedText>
            {canSharePhoto ? (
              <View style={styles.saveTapeHost}>
                <View pointerEvents="none" style={styles.saveTapeWrap}>
                  <View
                    style={[
                      styles.saveTape,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.34)'
                          : 'rgba(255,255,255,0.82)',
                      },
                    ]}
                  />
                </View>
                <BrutalConfirmButton
                  align="end"
                  compact
                  label={
                    exportingCollage
                      ? t('history.puzzle.exportCollageBusy')
                      : t('history.puzzle.exportCollage')
                  }
                  accessibilityLabel={t('history.puzzle.exportCollageA11y')}
                  onPress={exportCollage}
                  style={styles.shareBtn}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {contributions.length > 0 || history.status === 'active' ? (
          <View style={styles.sectionBlock}>
            <ThemedText style={[styles.listTitle, { color: c.text }]}>
              {t('history.puzzle.linkedRoutinesTitle')}
            </ThemedText>
            {contributions.map((row) => (
              <ThemedText
                key={row.categoryKey}
                style={[styles.dayLine, { color: c.text }]}>
                {t('history.puzzle.linkedRoutineContribution', {
                  label: previewRoutineLabel(row.categoryKey, t),
                  count: row.count,
                })}
              </ThemedText>
            ))}
            {history.status === 'active' ? (
              <View style={styles.addBlock}>
                <BrutalConfirmButton
                  align="stretch"
                  compact
                  label={t('history.puzzle.addLinkedRoutine')}
                  accessibilityLabel={t('history.puzzle.addLinkedRoutine')}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setAddOpen((open) => !open);
                    setPendingKeys([]);
                  }}
                />
                {addOpen ? (
                  <View style={styles.addPanel}>
                    {addableKeys.length === 0 ? (
                      <ThemedText style={[styles.infoMuted, { color: c.textMuted }]}>
                        {t('history.puzzle.addLinkedRoutineEmpty')}
                      </ThemedText>
                    ) : (
                      addableKeys.map((key) => {
                        const selected = pendingKeys.includes(key);
                        return (
                          <Pressable
                            key={key}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            accessibilityLabel={categoryReminderLabelKo(key)}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setPendingKeys((prev) =>
                                prev.includes(key)
                                  ? prev.filter((row) => row !== key)
                                  : [...prev, key],
                              );
                            }}
                            style={[
                              styles.addRow,
                              {
                                backgroundColor: selected ? mint : c.surfaceAlt,
                                borderColor: selected ? c.text : 'transparent',
                              },
                            ]}>
                            <ThemedText
                              style={[styles.addRowLabel, { color: c.text }]}
                              numberOfLines={2}>
                              {categoryReminderLabelKo(key)}
                            </ThemedText>
                            <ThemedText style={[styles.addRowMark, { color: c.text }]}>
                              {selected ? '✓' : ''}
                            </ThemedText>
                          </Pressable>
                        );
                      })
                    )}
                    {pendingKeys.length > 0 ? (
                      <BrutalConfirmButton
                        align="stretch"
                        label={t('history.puzzle.addLinkedRoutineConfirm')}
                        onPress={() => {
                          const baselines = countCompletionsByCategory(
                            pendingKeys,
                            dailyStatsByDate,
                          );
                          addLinkedRoutines(history.id, pendingKeys, baselines);
                          syncPuzzleHistoryFromDailyStats();
                          setPendingKeys([]);
                          setAddOpen(false);
                          void Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Success,
                          );
                        }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <ThemedText style={[styles.listTitle, { color: c.text }]}>
            {t('history.puzzle.dayListTitle')}
          </ThemedText>
          {openedPieces.length === 0 ? (
            <ThemedText style={[styles.dayLine, { color: c.textMuted }]}>
              {t('history.puzzle.timelineEmpty')}
            </ThemedText>
          ) : (
            <>
              <PuzzleOpenedDaysCalendar
                pieces={openedPieces.flatMap((row) =>
                  row.dateKey ? [{ puzzleIndex: row.puzzleIndex, dateKey: row.dateKey }] : [],
                )}
                locale={locale}
                ink={c.text}
                muted={c.textMuted}
                mint={mint}
                routinesByDate={labeledRoutinesByDate}
                routineLine={(routine) =>
                  t('history.puzzle.linkedRoutineContribution', {
                    label: routine.label,
                    count: routine.count,
                  })
                }
                emptyDayLabel={t('history.puzzle.dayCompletedNoDetail')}
                pieceLabel={(n, date) => t('history.puzzle.pieceOpened', { n, date })}
              />
              {openedPieces
                .filter((row) => !row.dateKey)
                .map((row) => (
                  <ThemedText
                    key={`piece-${row.puzzleIndex}`}
                    style={[styles.dayLine, { color: c.text }]}>
                    {t('history.puzzle.pieceOpenedNoDate', { n: row.puzzleIndex + 1 })}
                  </ThemedText>
                ))}
            </>
          )}
        </View>

        {imageBroken ? (
          <BrutalConfirmButton
            align="stretch"
            label={t('history.puzzle.reselectPhoto')}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/puzzle-history-start',
                params: { mode: 'replace-image' },
              });
            }}
          />
        ) : null}
      </ScrollView>

      <PuzzleRenameSheet
        visible={renameOpen}
        isDark={isDark}
        initialTitle={history.title}
        onClose={() => setRenameOpen(false)}
        onSave={(nextTitle) => {
          renameHistory(history.id, nextTitle);
          setRenameOpen(false);
        }}
      />
      <PuzzleCollageExporter
        request={collageJob}
        onResult={(fileUri) => {
          collageWaiter.current?.(fileUri);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topMeta: { flex: 1, minWidth: 0, alignItems: 'center', gap: 1 },
  topTitleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 4,
  },
  topTitle: { flexShrink: 1, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  topCount: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  /** 메인 퍼즐 탭 WALL_PAD(16)와 동일 — 보드 폭이 펼친 포스트잇과 맞도록 */
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  boardWrap: { alignSelf: 'stretch', marginVertical: 8 },
  boardHit: { position: 'relative' },
  inkBlock: { marginTop: 16 },
  inkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  inkColors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: INK_SWATCH_GAP,
    overflow: 'hidden',
  },
  inkSwatch: { width: INK_SWATCH_SIZE, height: INK_SWATCH_SIZE },
  inkTextBtn: { paddingVertical: 8, paddingHorizontal: 2 },
  inkText: { fontSize: 13, fontWeight: '700' },
  inkHintWrap: { overflow: 'hidden' },
  inkHint: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  boardBleed: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    /** 조각 솔리드 음영이 잘리지 않도록 */
    overflow: 'visible',
  },
  infoBlock: { gap: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoPrimary: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  infoBadge: { fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  infoLine: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  infoMuted: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeBanner: { fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  completeBannerBeside: { flex: 1, textAlign: 'left' },
  shareBtn: { flexShrink: 0 },
  saveTapeHost: {
    flexShrink: 0,
    position: 'relative',
    overflow: 'visible',
  },
  saveTapeWrap: {
    position: 'absolute',
    top: -2,
    left: -8,
    zIndex: 4,
  },
  saveTape: {
    width: 32,
    height: 9,
    borderRadius: 1,
    transform: [{ rotate: '-20deg' }],
  },
  sectionBlock: { gap: 4, marginTop: 4 },
  addBlock: { marginTop: 10, gap: 8 },
  addPanel: { gap: 8 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  addRowLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  addRowMark: { fontSize: 16, fontWeight: '800', width: 18, textAlign: 'center' },
  listTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  dayLine: { fontSize: 13, lineHeight: 19 },
  empty: { padding: 24, fontSize: 14 },
});
