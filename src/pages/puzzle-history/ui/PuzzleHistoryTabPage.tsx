import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { historyDateKeyToday, useHistoryStore } from '@entities/history';
import {
  ensurePuzzleRevealBaseline,
  usePuzzleHistoryStore,
  type PuzzleHistory,
} from '@entities/puzzle-history';
import { syncRoutineWindowCompletionsToHistory } from '@features/history-routine-sync';
import { syncPuzzleHistoryFromDailyStats } from '@features/puzzle-history-sync';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ListRowSkeletonStack } from '@shared/ui/list-row-skeleton';
import {
  RoutineAtmosphereFooterStrip,
  RoutineTabAtmosphere,
} from '@shared/ui/routine-atmosphere';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import {
  PuzzleExpandablePostIt,
  PuzzleHistoryHomeCard,
} from '@widgets/puzzle-history-board';

import { PuzzleRenameSheet } from './PuzzleRenameSheet';

/** 포스트잇 벽 배경 (레퍼런스 회백색) */
const WALL_BG_LIGHT = '#F5F4F2';
const WALL_BG_DARK = '#2A2A30';
/** 헤더 액션 — 루틴 세그먼트 탭(FixedRoutineSectionTabs)과 동일 솔리드 음영 */
const ICON_SHADOW = 1;
const ICON_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const ICON_SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';
const ICON_FACE = 24;
const ICON_GLYPH = 13;
const WALL_PAD = 16;
const WALL_GAP = 10;
/**
 * FlatList windowSize — 화면 높이 배수.
 * 5면 화면 밖까지 넓게 미리 마운트됨. 2면 보이는 근처만.
 */
const WALL_LIST_WINDOW_SIZE = 2;

function buildPuzzlePalette(isDark: boolean) {
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const face = isDark ? rf.surfaceAlt : '#FFFFFF';
  return {
    pageBg: isDark ? WALL_BG_DARK : WALL_BG_LIGHT,
    card: face,
    ink: rf.text,
    muted: rf.textMuted,
    shadow: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    border: rf.border,
  };
}

function HeaderIconButton({
  name,
  accessibilityLabel,
  onPress,
  face,
  shadow,
  iconColor,
  emphasize = false,
}: {
  name: string;
  accessibilityLabel: string;
  onPress: () => void;
  face: string;
  shadow: string;
  iconColor: string;
  /** 빈 벽에서 + 유도 — 오늘 탭 집중 시간 칩과 같은 스케일·민트 펄스 */
  emphasize?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  const mint = isDark ? RetroFlatColors.dark.bgMint : RetroFlatColors.light.bgMint;
  const idleBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)';
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!emphasize) {
      cancelAnimation(scale);
      cancelAnimation(pulse);
      scale.value = withTiming(1, { duration: 160 });
      pulse.value = withTiming(0, { duration: 160 });
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [emphasize, pulse, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(pulse.value, [0, 1], [idleBorder, mint]),
    shadowOpacity: 0.08 + pulse.value * 0.22,
    shadowRadius: 1 + pulse.value * 6,
    elevation: pulse.value > 0.15 ? 4 : 0,
  }));

  return (
    <View style={[styles.iconShell, { marginRight: ICON_SHADOW, marginBottom: ICON_SHADOW }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.iconPressFill, pressed && styles.pressed]}>
        <View
          pointerEvents="none"
          style={[
            styles.iconShadow,
            {
              backgroundColor: shadow,
              transform: [{ translateX: ICON_SHADOW }, { translateY: ICON_SHADOW }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconHit,
            {
              backgroundColor: face,
              borderWidth: emphasize ? StyleSheet.hairlineWidth * 2 : 0,
              borderColor: idleBorder,
              shadowColor: mint,
            },
            emphasize ? animStyle : null,
          ]}>
          <IconSymbol name={name as 'trash'} size={ICON_GLYPH} color={iconColor} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** 퍼즐 탭 — 진행 중을 작은 포스트잇 벽으로, 탭하면 크게 펼침 */
export function PuzzleHistoryTabPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => buildPuzzlePalette(isDark), [isDark]);
  const todayDateKey = historyDateKeyToday();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** 접힌 벽에서 복수 선택 삭제 */
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  const historyHydrate = useHistoryStore((s) => s.hydrate);
  const reloadFromStorage = useHistoryStore((s) => s.reloadFromStorage);

  const { hydrate, isHydrated, histories, removeHistory, renameHistory } =
    usePuzzleHistoryStore(
      useShallow((s) => ({
        hydrate: s.hydrate,
        isHydrated: s.isHydrated,
        histories: s.histories,
        removeHistory: s.removeHistory,
        renameHistory: s.renameHistory,
      })),
    );

  const clearDeleteSelection = useCallback(() => {
    setSelectedIds([]);
    setDeleteMode(false);
  }, []);

  const toggleSelect = useCallback((historyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(historyId)
        ? prev.filter((id) => id !== historyId)
        : [...prev, historyId],
    );
  }, []);

  const confirmDelete = useCallback(
    (historyId: string) => {
      Alert.alert(t('history.puzzle.deleteTitle'), t('history.puzzle.deleteBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('history.puzzle.deleteCta'),
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (expandedId === historyId) setExpandedId(null);
            removeHistory(historyId);
          },
        },
      ]);
    },
    [expandedId, removeHistory, t],
  );

  const confirmDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    Alert.alert(
      t('history.puzzle.deleteSelectedTitle', { count: ids.length }),
      t('history.puzzle.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('history.puzzle.deleteCta'),
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (expandedId && ids.includes(expandedId)) setExpandedId(null);
            for (const id of ids) removeHistory(id);
            clearDeleteSelection();
          },
        },
      ],
    );
  }, [clearDeleteSelection, expandedId, removeHistory, selectedIds, t]);

  /** 진행 중 + 완료 — 목표를 채워도 벽에 남겨 완성 콜라주를 볼 수 있게 함 */
  const wallHistories = useMemo(() => {
    const actives = histories
      .filter((h) => h.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const completed = histories
      .filter((h) => h.status === 'completed')
      .sort((a, b) =>
        (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt),
      );
    return [...actives, ...completed];
  }, [histories]);

  useEffect(() => {
    if (wallHistories.length === 0 && deleteMode) clearDeleteSelection();
  }, [clearDeleteSelection, deleteMode, wallHistories.length]);

  useEffect(() => {
    if (!deleteMode) return;
    const alive = new Set(wallHistories.map((h) => h.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => alive.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [deleteMode, wallHistories]);

  const cols = windowW >= 520 ? 4 : 3;
  const tileSize = useMemo(
    () => (windowW - WALL_PAD * 2 - WALL_GAP * (cols - 1)) / cols,
    [cols, windowW],
  );

  const expanded = wallHistories.find((h) => h.id === expandedId) ?? null;
  const renameTarget = wallHistories.find((h) => h.id === renameTargetId) ?? null;
  const wallItems = expanded
    ? wallHistories.filter((h) => h.id !== expandedId)
    : wallHistories;

  /** 첫 화면에 보이는 칸 수(대략 2행) — 그 외는 FlatList가 스크롤 시 마운트 */
  const initialWallCount = cols * 2;

  useEffect(() => {
    historyHydrate();
    hydrate();
  }, [historyHydrate, hydrate]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const list = usePuzzleHistoryStore.getState().histories.filter(
        (h) => h.status === 'active' || h.status === 'completed',
      );
      for (const row of list) {
        const pieces = row.pieces ?? row.dailyRecords ?? [];
        const completedIndices = pieces
          .filter((r) => r.completed)
          .map((r) => r.puzzleIndex);
        // 방금 완료된 건 베이스라인 생략 → 마지막 조각 연출을 볼 수 있게
        const completedAtMs = row.completedAt ? Date.parse(row.completedAt) : NaN;
        if (
          row.status === 'completed' &&
          Number.isFinite(completedAtMs) &&
          now - completedAtMs < 8_000
        ) {
          continue;
        }
        ensurePuzzleRevealBaseline(row.id, completedIndices);
      }

      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          syncRoutineWindowCompletionsToHistory(todayDateKey);
          reloadFromStorage();
          syncPuzzleHistoryFromDailyStats();
        });
      });
      return () => {
        cancelled = true;
        task.cancel();
      };
    }, [reloadFromStorage, todayDateKey]),
  );

  const openDetail = useCallback((historyId: string) => {
    router.push({
      pathname: '/puzzle-history-detail',
      params: { id: historyId },
    });
  }, []);

  const toggleExpand = useCallback(
    (historyId: string) => {
      clearDeleteSelection();
      setExpandedId(historyId);
    },
    [clearDeleteSelection],
  );

  const renderWallItem: ListRenderItem<PuzzleHistory> = useCallback(
    ({ item, index }) => (
      <PuzzleExpandablePostIt
        history={item}
        palette={palette}
        isDark={isDark}
        tileSize={tileSize}
        tiltIndex={index}
        expanded={false}
        deleteMode={deleteMode}
        selected={selectedIds.includes(item.id)}
        onToggle={() => {
          if (deleteMode) {
            toggleSelect(item.id);
            return;
          }
          toggleExpand(item.id);
        }}
        onToggleSelect={deleteMode ? () => toggleSelect(item.id) : undefined}
        onOpenDetail={openDetail}
      />
    ),
    [
      deleteMode,
      isDark,
      openDetail,
      palette,
      selectedIds,
      tileSize,
      toggleExpand,
      toggleSelect,
    ],
  );

  const listHeader = useMemo(() => {
    if (!isHydrated) return null;
    if (wallHistories.length === 0) {
      return <PuzzleHistoryHomeCard palette={palette} isDark={isDark} />;
    }
    if (!expanded) return <View style={styles.listHeaderSpacer} />;
    return (
      <View style={styles.expandedSlot}>
        <PuzzleExpandablePostIt
          history={expanded}
          palette={palette}
          isDark={isDark}
          tileSize={tileSize}
          expanded
          onToggle={() => setExpandedId(null)}
          onOpenDetail={openDetail}
        />
      </View>
    );
  }, [expanded, isDark, isHydrated, openDetail, palette, tileSize, wallHistories.length]);

  const listFooter = useMemo(() => {
    if (!isHydrated) {
      return (
        <View style={styles.loadingBlock} accessibilityRole="progressbar">
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            {t('history.loading')}
          </ThemedText>
          <ListRowSkeletonStack count={6} isDark={isDark} />
        </View>
      );
    }
    return <RoutineAtmosphereFooterStrip variant="puzzle" isDark={isDark} />;
  }, [isDark, isHydrated, palette.muted, t]);

  return (
    <ThemedView
      style={[styles.root, { backgroundColor: palette.pageBg }]}
      lightColor={palette.pageBg}
      darkColor={palette.pageBg}>
      <RoutineTabAtmosphere variant="puzzle" isDark={isDark} />
      <View style={styles.foreground}>
        <View style={styles.stickyHeader}>
          <View style={styles.headerTitleRow}>
            {expanded ? (
              <HeaderIconButton
                name="chevron.left"
                accessibilityLabel={t('common.back')}
                face={isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF'}
                shadow={isDark ? ICON_SOFT_SHADOW_DARK : ICON_SOFT_SHADOW_LIGHT}
                iconColor="#000000"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedId(null);
                }}
              />
            ) : null}
            {expanded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${expanded.title}, ${t('history.puzzle.renameA11y')}`}
                accessibilityHint={t('history.puzzle.renameA11y')}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setRenameTargetId(expanded.id);
                }}
                style={styles.headerMeta}>
                <View style={styles.headerTitleEditRow}>
                  <ThemedText
                    style={[styles.headerPuzzleTitle, { color: palette.ink }]}
                    numberOfLines={1}>
                    {expanded.title}
                  </ThemedText>
                  <IconSymbol name="pencil" size={10} color={palette.muted} />
                </View>
                <ThemedText
                  style={[styles.headerPuzzleCount, { color: palette.muted }]}
                  numberOfLines={1}>
                  {t('history.puzzle.progress', {
                    completed:
                      expanded.completedCount ??
                      expanded.completedDays ??
                      (expanded.status === 'completed'
                        ? (expanded.targetCount ?? expanded.duration ?? 0)
                        : 0),
                    total: expanded.targetCount ?? expanded.duration ?? 0,
                  })}
                </ThemedText>
              </Pressable>
            ) : (
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={t('tabs.puzzle')}
                style={styles.titleIconWrap}>
                <IconSymbol
                  name="rectangle.stack"
                  size={22}
                  color={palette.ink}
                />
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            {expanded ? (
              <HeaderIconButton
                name="magnifyingglass"
                accessibilityLabel={t('history.puzzle.openDetail')}
                face={isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF'}
                shadow={isDark ? ICON_SOFT_SHADOW_DARK : ICON_SOFT_SHADOW_LIGHT}
                iconColor="#000000"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openDetail(expanded.id);
                }}
              />
            ) : null}
            {wallHistories.length > 0 ? (
              <HeaderIconButton
                name="trash.fill"
                accessibilityLabel={
                  expanded
                    ? t('history.puzzle.deleteCta')
                    : deleteMode
                      ? selectedIds.length > 0
                        ? t('history.puzzle.deleteSelectedCta')
                        : t('history.puzzle.deleteModeOff')
                      : t('history.puzzle.deleteModeOn')
                }
                face={
                  !expanded && deleteMode
                    ? isDark
                      ? RetroFlatColors.dark.dangerBg
                      : RetroFlatColors.light.dangerBg
                    : isDark
                      ? RetroFlatColors.dark.surfaceAlt
                      : '#FFFFFF'
                }
                shadow={isDark ? ICON_SOFT_SHADOW_DARK : ICON_SOFT_SHADOW_LIGHT}
                iconColor="#000000"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (expanded) {
                    confirmDelete(expanded.id);
                    return;
                  }
                  if (!deleteMode) {
                    setSelectedIds([]);
                    setDeleteMode(true);
                    return;
                  }
                  if (selectedIds.length === 0) {
                    clearDeleteSelection();
                    return;
                  }
                  confirmDeleteSelected();
                }}
              />
            ) : null}
            <HeaderIconButton
              name="plus"
              accessibilityLabel={t('history.puzzle.newCta')}
              face={isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF'}
              shadow={isDark ? ICON_SOFT_SHADOW_DARK : ICON_SOFT_SHADOW_LIGHT}
              iconColor="#000000"
              emphasize={isHydrated && wallHistories.length === 0}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                clearDeleteSelection();
                router.push('/puzzle-history-start');
              }}
            />
          </View>
        </View>

        <FlatList
          key={`wall-${cols}`}
          style={styles.list}
          data={isHydrated ? wallItems : []}
          keyExtractor={(item) => item.id}
          numColumns={cols}
          renderItem={renderWallItem}
          extraData={{ deleteMode, selectedIds }}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          columnWrapperStyle={wallItems.length > 0 ? styles.columnWrap : undefined}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 16 },
          ]}
          initialNumToRender={initialWallCount}
          maxToRenderPerBatch={cols}
          windowSize={WALL_LIST_WINDOW_SIZE}
          updateCellsBatchingPeriod={50}
          /** 삭제 체크박스가 absolute로 카드 밖으로 나가 clip 되지 않게 */
          removeClippedSubviews={!deleteMode}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <PuzzleRenameSheet
        visible={renameTarget != null}
        isDark={isDark}
        initialTitle={renameTarget?.title ?? ''}
        onClose={() => setRenameTargetId(null)}
        onSave={(nextTitle) => {
          if (renameTarget) renameHistory(renameTarget.id, nextTitle);
          setRenameTargetId(null);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  foreground: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: WALL_PAD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  titleIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 4,
  },
  /** 루틴 탭 그룹명(pencil)과 동일 — 제목 오른쪽 수정 가능 표시 */
  headerTitleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  headerPuzzleTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerPuzzleCount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconShell: {
    position: 'relative',
    width: ICON_FACE + ICON_SHADOW,
    height: ICON_FACE + ICON_SHADOW,
  },
  iconPressFill: {
    width: '100%',
    height: '100%',
  },
  iconShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ICON_FACE,
    height: ICON_FACE,
    borderRadius: 0,
  },
  iconHit: {
    width: ICON_FACE,
    height: ICON_FACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    zIndex: 1,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: WALL_PAD,
    paddingTop: 8,
  },
  listHeaderSpacer: {
    height: 6,
  },
  expandedSlot: {
    marginBottom: 12,
  },
  columnWrap: {
    gap: WALL_GAP,
    marginBottom: 12,
  },
  loadingBlock: {
    gap: 12,
    paddingTop: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
