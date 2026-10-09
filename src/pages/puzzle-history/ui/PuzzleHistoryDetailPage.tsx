import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { categoryReminderLabelKo } from '@entities/day-plan';
import { historyDateKeyToday, useHistoryStore } from '@entities/history';
import { usePuzzleHistoryStore } from '@entities/puzzle-history';
import {
  linkedRoutineContributionCounts,
  linkedRoutineCountsByDate,
  syncPuzzleHistoryFromDailyStats,
} from '@features/puzzle-history-sync';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatDateKeyDisplay, useTranslation } from '@shared/lib/i18n';
import { puzzleHistoryImageExists } from '@shared/lib/media/pickPuzzleHistoryImage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button/BrutalConfirmButton';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { PuzzleBoard } from '@widgets/puzzle-history-board';

import { PuzzleOpenedDaysCalendar } from './PuzzleOpenedDaysCalendar';
import { PuzzleRenameSheet } from './PuzzleRenameSheet';

/** 메인 펼침 보드와 동일 회백색 면 */
const BOARD_FACE = '#F5F4F2';
const BOARD_SHELL_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const BOARD_SHELL_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';
const BOARD_SHELL_SHADOW_OFFSET = 1;

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

/** 목업에서 루틴 개수별 달력을 바로 보게 하는 미리보기. 저장값과 별개다. */
const MOCK_ROUTINE_PREVIEW: Record<string, readonly string[]> = {
  ph_dev_mock_album_10_basketball: ['reading', 'work'],
  ph_dev_mock_album_10_meal: ['reading', 'work', 'water'],
  ph_dev_mock_album_20_hands_heart: PREVIEW_FIVE,
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

  const { hydrate, histories, removeHistory, renameHistory } = usePuzzleHistoryStore(
    useShallow((s) => ({
      hydrate: s.hydrate,
      histories: s.histories,
      removeHistory: s.removeHistory,
      renameHistory: s.renameHistory,
    })),
  );
  const historyHydrate = useHistoryStore((s) => s.hydrate);
  const dailyStatsByDate = useHistoryStore((s) => s.dailyStatsByDate);

  const [boardSize, setBoardSize] = useState(0);
  const [imageBroken, setImageBroken] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  useEffect(() => {
    hydrate();
    historyHydrate();
    syncPuzzleHistoryFromDailyStats();
  }, [hydrate, historyHydrate]);

  const history = useMemo(() => {
    const id = typeof params.id === 'string' ? params.id : '';
    return histories.find((h) => h.id === id) ?? null;
  }, [histories, params.id]);

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
      MOCK_ROUTINE_PREVIEW[history.id] ?? history.linkedCategoryKeys ?? [];
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
    if (MOCK_ROUTINE_PREVIEW[history.id]) {
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/puzzle-history'))}
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
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - boardSize) > 0.5) setBoardSize(w);
              }}>
              {boardSize > 0 ? (
                <PuzzleBoard
                  history={history}
                  width={boardSize}
                  ink={c.text}
                  muted={c.textMuted}
                  cover={cover}
                  imageBroken={imageBroken}
                />
              ) : (
                <View style={{ height: 120 }} />
              )}
            </View>
          </PostItCardShell>
        </View>

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
          <ThemedText style={[styles.completeBanner, { color: c.text }]}>
            {t('history.puzzle.completedBanner', { count: targetCount })}
          </ThemedText>
        ) : null}

        {contributions.length > 0 ? (
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  completeBanner: { fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  sectionBlock: { gap: 4, marginTop: 4 },
  listTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  dayLine: { fontSize: 13, lineHeight: 19 },
  empty: { padding: 24, fontSize: 14 },
});
