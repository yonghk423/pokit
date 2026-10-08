import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  buildPuzzleRevealLayout,
  listUnseenCompletedPuzzleIndices,
  markPuzzleRevealSeen,
  type PuzzleHistory,
  type PuzzleRevealUnit,
  type PuzzleSeedPiece,
} from '@entities/puzzle-history';
import { useTranslation } from '@shared/lib/i18n';
import { resolvePuzzleBoardImageUri } from '@shared/lib/media/pickPuzzleHistoryImage';
import { ThemedText } from '@shared/ui/themed-text';

const REVEAL_MS = 480;
/**
 * 레퍼런스 콜라주 캔버스 톤 (회백색).
 * 샘플: (245,244,242) ≈ #F5F4F2 — 따뜻한 크림이 아닌 cool gray-white.
 */
const BOARD_BG = '#F5F4F2';
/** 벽 썸네일 콜라주 상한 — 시드+진행을 합쳐 이 장수까지만 (Reanimated/Image 폭증 방지) */
const WALL_PREVIEW_MAX_TILES = 16;
/** preview는 항상 썸네일 URI 쓰도록 좁은 폭으로 resolve */
const PREVIEW_RESOLVE_WIDTH = 120;

type PuzzleBoardProps = {
  history: PuzzleHistory;
  width: number;
  ink: string;
  muted: string;
  cover: string;
  /**
   * `preview` — 벽 격자용. 포스트잇 콜라주는 유지하되 연출·히트셀 없음.
   * `full` — 펼침·상세. 콜라주 + 공개 연출 + (선택) 히트셀.
   */
  variant?: 'full' | 'preview';
  onPressPiece?: (puzzleIndex: number, completed: boolean) => void;
  highlightPuzzleIndex?: number | null;
  imageBroken?: boolean;
  onPieceRevealed?: (puzzleIndex: number) => void;
  onJustCompleted?: () => void;
};

type VisualTile = (PuzzleSeedPiece | PuzzleRevealUnit) & {
  key: string;
  animate: boolean;
};

type TileLayoutProps = {
  tile: VisualTile;
  boardW: number;
  boardH: number;
  imageUri: string;
  recyclingKey: string;
};

function tileFrame(tile: VisualTile, boardW: number, boardH: number) {
  return {
    left: tile.x * boardW,
    top: tile.y * boardH,
    width: Math.max(tile.w * boardW, 8),
    height: Math.max(tile.h * boardH, 8),
    zIndex: tile.z,
  };
}

function TilePhoto({
  tile,
  boardW,
  boardH,
  imageUri,
  recyclingKey,
  priority,
  decodeEdge,
}: TileLayoutProps & {
  priority?: 'low' | 'normal' | 'high';
  /** expo-image 디코드 힌트(표시 보드 긴 변). 벽 lite는 작게 */
  decodeEdge?: number;
}) {
  if (tile.fill === 'solid') {
    return (
      <View
        style={[styles.solidFace, { backgroundColor: tile.solidColor ?? '#D6D2CB' }]}
      />
    );
  }
  const edge =
    decodeEdge != null && decodeEdge > 0
      ? Math.max(64, Math.round(decodeEdge))
      : undefined;
  return (
    <View style={styles.photoWindow}>
      <Image
        source={
          edge != null
            ? { uri: imageUri, width: edge, height: edge }
            : { uri: imageUri }
        }
        style={{
          position: 'absolute',
          width: boardW,
          height: boardH,
          left: -tile.imgX * boardW,
          top: -tile.imgY * boardH,
        }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`${recyclingKey}:${tile.key}:${edge ?? 'f'}`}
        transition={0}
        priority={priority}
      />
    </View>
  );
}

/** 루틴/메인 탭 포스트잇과 동일 — 솔리드 각진 오프셋 음영 */
const PIECE_SHADOW = 1;
const PIECE_SHADOW_COLOR = 'rgba(0, 0, 0, 0.12)';

/** 벽·정지 조각 — Reanimated 없이 일반 View (병목 제거) */
function StaticPostItTile({
  tile,
  boardW,
  boardH,
  imageUri,
  recyclingKey,
  lite,
}: TileLayoutProps & { lite?: boolean }) {
  const frame = tileFrame(tile, boardW, boardH);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.postItWrap,
        frame,
        { transform: [{ rotate: `${tile.rotate}deg` }] },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.postItSolidShadow,
          {
            backgroundColor: PIECE_SHADOW_COLOR,
            transform: [
              { translateX: PIECE_SHADOW },
              { translateY: PIECE_SHADOW },
            ],
          },
        ]}
      />
      <View style={styles.postItFace}>
        <TilePhoto
          tile={tile}
          boardW={boardW}
          boardH={boardH}
          imageUri={imageUri}
          recyclingKey={recyclingKey}
          priority={lite ? 'low' : 'normal'}
          decodeEdge={lite ? Math.max(boardW, boardH) : undefined}
        />
      </View>
    </View>
  );
}

const MemoStaticPostItTile = memo(StaticPostItTile);

/** 공개 연출이 필요할 때만 Reanimated */
function AnimatedPostItTile({
  tile,
  boardW,
  boardH,
  imageUri,
  recyclingKey,
  onAnimDone,
}: TileLayoutProps & { onAnimDone?: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && onAnimDone) runOnJS(onAnimDone)();
      },
    );
  }, [onAnimDone, progress, tile.key]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.85, 1]),
    transform: [
      { rotate: `${tile.rotate}deg` },
      { scale: interpolate(progress.value, [0, 1], [0.92, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
    ],
  }));

  const frame = tileFrame(tile, boardW, boardH);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.postItWrap, frame, animStyle]}>
      <View
        pointerEvents="none"
        style={[
          styles.postItSolidShadow,
          {
            backgroundColor: PIECE_SHADOW_COLOR,
            transform: [
              { translateX: PIECE_SHADOW },
              { translateY: PIECE_SHADOW },
            ],
          },
        ]}
      />
      <View style={styles.postItFace}>
        <TilePhoto
          tile={tile}
          boardW={boardW}
          boardH={boardH}
          imageUri={imageUri}
          recyclingKey={recyclingKey}
        />
      </View>
    </Animated.View>
  );
}

const MemoAnimatedPostItTile = memo(AnimatedPostItTile);

function HitCell({
  unit,
  boardW,
  boardH,
  a11yLabel,
  highlight,
  onPress,
}: {
  unit: PuzzleRevealUnit;
  boardW: number;
  boardH: number;
  a11yLabel: string;
  highlight: boolean;
  onPress?: () => void;
}) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.97]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: unit.x * boardW,
          top: unit.y * boardH,
          width: Math.max(unit.w * boardW, 12),
          height: Math.max(unit.h * boardH, 12),
          zIndex: 200 + unit.puzzleIndex,
          transform: [{ rotate: `${unit.rotate}deg` }],
        },
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        disabled={!onPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 120 });
        }}
        onPress={onPress}
        style={[styles.hit, highlight ? styles.highlight : null]}
      />
    </Animated.View>
  );
}

const MemoHitCell = memo(HitCell);

function PuzzleBoardComponent({
  history,
  width,
  ink,
  muted,
  cover,
  variant = 'full',
  onPressPiece,
  highlightPuzzleIndex = null,
  imageBroken = false,
  onPieceRevealed,
  onJustCompleted,
}: PuzzleBoardProps) {
  const { t } = useTranslation();
  const targetCount = history.targetCount ?? history.duration ?? 10;
  const pieces = history.pieces ?? history.dailyRecords ?? [];
  const layout = useMemo(() => buildPuzzleRevealLayout(targetCount), [targetCount]);
  const boardW = width;
  const boardH = width * (layout.viewBoxHeight / layout.viewBoxWidth);
  const isPreview = variant === 'preview';
  const displayUri = useMemo(
    () =>
      resolvePuzzleBoardImageUri(
        history.imageUri,
        history.thumbnailUri,
        isPreview ? PREVIEW_RESOLVE_WIDTH : boardW,
      ),
    [boardW, history.imageUri, history.thumbnailUri, isPreview],
  );
  const imageRecyclingKey = `${history.id}:${isPreview ? 'p' : 'f'}:${Math.round(boardW)}`;

  const [animatingIndices, setAnimatingIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const celebratedRef = useRef(false);
  const boardScale = useSharedValue(1);

  const completedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const row of pieces) {
      if (row.completed) set.add(row.puzzleIndex);
    }
    return set;
  }, [pieces]);

  const visibleProgress = useMemo(
    () => layout.units.filter((u) => completedIndices.has(u.puzzleIndex)),
    [completedIndices, layout.units],
  );

  const visualTiles: VisualTile[] = useMemo(() => {
    const seeds: VisualTile[] = layout.seeds.map((seed) => ({
      ...seed,
      key: seed.id,
      animate: false,
    }));
    let progress: VisualTile[] = visibleProgress.map((unit) => ({
      ...unit,
      key: `p-${unit.puzzleIndex}`,
      animate: isPreview ? false : animatingIndices.has(unit.puzzleIndex),
    }));

    if (isPreview) {
      const budget = Math.max(0, WALL_PREVIEW_MAX_TILES - seeds.length);
      if (progress.length > budget) {
        // 위에 보이는(z 높은) 장을 우선 남겨 콜라주 느낌 유지
        progress = [...progress].sort((a, b) => b.z - a.z).slice(0, budget);
      }
    }

    return [...seeds, ...progress].sort((a, b) => a.z - b.z);
  }, [animatingIndices, isPreview, layout.seeds, visibleProgress]);

  useEffect(() => {
    if (isPreview) return;
    if (history.status === 'completed') {
      const pending = listUnseenCompletedPuzzleIndices(history.id, completedIndices);
      if (pending.length === 0) celebratedRef.current = true;
    }
  }, [completedIndices, history.id, history.status, isPreview]);

  useEffect(() => {
    if (isPreview) return;
    const newly = listUnseenCompletedPuzzleIndices(history.id, completedIndices);
    if (newly.length === 0) return;

    markPuzzleRevealSeen(history.id, newly);

    setAnimatingIndices((prev) => {
      const next = new Set(prev);
      for (const idx of newly) next.add(idx);
      return next;
    });

    const lastNew = newly[newly.length - 1]!;
    onPieceRevealed?.(lastNew);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const totalPieces = history.totalPieces ?? history.totalDays ?? targetCount;
    const justFinished =
      history.status === 'completed' && completedIndices.size >= totalPieces;
    if (justFinished && !celebratedRef.current) {
      celebratedRef.current = true;
      boardScale.value = withSequence(
        withTiming(1.015, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 18, stiffness: 180 }),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onJustCompleted?.();
    }
  }, [
    boardScale,
    completedIndices,
    history.id,
    history.status,
    history.totalDays,
    history.totalPieces,
    isPreview,
    onJustCompleted,
    onPieceRevealed,
    targetCount,
  ]);

  const boardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  if (imageBroken) {
    return (
      <View
        style={[
          styles.board,
          { width: boardW, height: boardH, backgroundColor: cover || BOARD_BG },
        ]}>
        <ThemedText style={[styles.brokenTitle, { color: ink }]}>
          {t('history.puzzle.imageBrokenTitle')}
        </ThemedText>
        <ThemedText style={[styles.brokenBody, { color: muted }]}>
          {t('history.puzzle.imageBrokenBody')}
        </ThemedText>
      </View>
    );
  }

  if (isPreview) {
    return (
      <View
        style={[
          styles.board,
          { width: boardW, height: boardH, backgroundColor: BOARD_BG },
        ]}>
        {visualTiles.map((tile) => (
          <MemoStaticPostItTile
            key={tile.key}
            tile={tile}
            boardW={boardW}
            boardH={boardH}
            imageUri={displayUri}
            recyclingKey={imageRecyclingKey}
            lite
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.board,
        { width: boardW, height: boardH, backgroundColor: BOARD_BG },
        boardPulseStyle,
      ]}>
      {visualTiles.map((tile) => {
        const puzzleIndex =
          'puzzleIndex' in tile && typeof tile.puzzleIndex === 'number'
            ? tile.puzzleIndex
            : -1;
        if (tile.animate) {
          return (
            <MemoAnimatedPostItTile
              key={tile.key}
              tile={tile}
              boardW={boardW}
              boardH={boardH}
              imageUri={displayUri}
              recyclingKey={imageRecyclingKey}
              onAnimDone={
                puzzleIndex >= 0
                  ? () => {
                      setAnimatingIndices((prev) => {
                        if (!prev.has(puzzleIndex)) return prev;
                        const next = new Set(prev);
                        next.delete(puzzleIndex);
                        return next;
                      });
                    }
                  : undefined
              }
            />
          );
        }
        return (
          <MemoStaticPostItTile
            key={tile.key}
            tile={tile}
            boardW={boardW}
            boardH={boardH}
            imageUri={displayUri}
            recyclingKey={imageRecyclingKey}
          />
        );
      })}

      {onPressPiece
        ? layout.units.map((unit) => {
            const record = pieces.find((r) => r.puzzleIndex === unit.puzzleIndex);
            const completed = Boolean(record?.completed);
            const pieceLabel = String(unit.puzzleIndex + 1);
            const a11yLabel = completed
              ? t('history.puzzle.a11yPieceDone', { date: pieceLabel })
              : t('history.puzzle.a11yPiecePending', { date: pieceLabel });

            return (
              <MemoHitCell
                key={`hit-${unit.puzzleIndex}`}
                unit={unit}
                boardW={boardW}
                boardH={boardH}
                a11yLabel={a11yLabel}
                highlight={highlightPuzzleIndex === unit.puzzleIndex}
                onPress={() => onPressPiece(unit.puzzleIndex, completed)}
              />
            );
          })
        : null}
    </Animated.View>
  );
}

function boardPropsEqual(a: PuzzleBoardProps, b: PuzzleBoardProps): boolean {
  return (
    a.variant === b.variant &&
    a.width === b.width &&
    a.ink === b.ink &&
    a.muted === b.muted &&
    a.cover === b.cover &&
    a.imageBroken === b.imageBroken &&
    a.highlightPuzzleIndex === b.highlightPuzzleIndex &&
    a.history.id === b.history.id &&
    a.history.status === b.history.status &&
    a.history.imageUri === b.history.imageUri &&
    a.history.thumbnailUri === b.history.thumbnailUri &&
    a.history.completedCount === b.history.completedCount &&
    a.history.targetCount === b.history.targetCount &&
    a.onPressPiece === b.onPressPiece
  );
}

export const PuzzleBoard = memo(PuzzleBoardComponent, boardPropsEqual);

const styles = StyleSheet.create({
  board: {
    borderRadius: 0,
    overflow: 'visible',
    position: 'relative',
  },
  postItWrap: {
    position: 'absolute',
  },
  postItSolidShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  postItFace: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  photoWindow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  solidFace: {
    flex: 1,
  },
  hit: {
    flex: 1,
  },
  highlight: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.28)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  brokenTitle: {
    marginTop: 48,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  brokenBody: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
