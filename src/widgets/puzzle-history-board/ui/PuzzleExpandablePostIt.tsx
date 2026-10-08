import * as Haptics from 'expo-haptics';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import type { PuzzleHistory } from '@entities/puzzle-history';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { PuzzleHistoryCardPalette } from './PuzzleHistoryHomeCard';
import { PuzzleBoard } from './PuzzleBoard';

/** 회색빛 화이트 포스트잇 면 (벽 #F5F4F2 위에서 살짝 밝게) */
const WALL_NOTE = '#FFFFFF';
const WALL_NOTE_DARK = '#3A3B42';
const BOARD_FACE = '#F5F4F2';

/** 좌측 상단 사선 테이프 */
const TAPE_ROTATE_DEG = -28;
/** 루틴 세그먼트 탭·헤더 아이콘과 동일 솔리드 음영 */
const NOTE_SHADOW = 1;

const EXPAND_SPRING = {
  damping: 24,
  stiffness: 140,
  mass: 0.85,
  overshootClamping: false,
} as const;

const expandIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: 0.86 }, { translateY: 14 }],
    },
    animations: {
      opacity: withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.quad),
      }),
      transform: [
        { scale: withSpring(1, EXPAND_SPRING) },
        { translateY: withSpring(0, EXPAND_SPRING) },
      ],
    },
  };
};

const expandOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 1,
      transform: [{ scale: 1 }, { translateY: 0 }],
    },
    animations: {
      opacity: withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.quad),
      }),
      transform: [
        {
          scale: withTiming(0.9, {
            duration: 280,
            easing: Easing.in(Easing.cubic),
          }),
        },
        {
          translateY: withTiming(10, {
            duration: 280,
            easing: Easing.in(Easing.cubic),
          }),
        },
      ],
    },
  };
};

type Props = {
  history: PuzzleHistory;
  palette: PuzzleHistoryCardPalette;
  isDark: boolean;
  expanded: boolean;
  /** 타일 한 변(접힘). 펼침이면 무시하고 가로 100% */
  tileSize: number;
  tiltIndex?: number;
  onToggle: () => void;
  /** 삭제 모드 — 카드에 체크 표시 */
  deleteMode?: boolean;
  /** 삭제 모드에서 선택됨 */
  selected?: boolean;
  /** 삭제 모드에서 선택 토글 */
  onToggleSelect?: () => void;
  onOpenDetail?: (historyId: string) => void;
};

/**
 * 접힘: 동일 크기·동일 스타일 포스트잇 (우측 상단 사선 테이프).
 * 펼침: 전체 폭 보드로 열림.
 */
function PuzzleExpandablePostItComponent({
  history,
  palette,
  isDark,
  expanded,
  tileSize,
  tiltIndex = 0,
  onToggle,
  deleteMode = false,
  selected = false,
  onToggleSelect,
  onOpenDetail,
}: Props) {
  const { t } = useTranslation();
  const [boardWidth, setBoardWidth] = useState(0);
  const press = useSharedValue(0);
  const cover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const noteFace = isDark ? WALL_NOTE_DARK : WALL_NOTE;
  const showDeleteControl = deleteMode && Boolean(onToggleSelect);

  const targetCount = history.targetCount ?? history.duration ?? 0;
  const completed = history.completedCount ?? history.completedDays ?? 0;
  const miniBoardW = Math.max(tileSize - 14, 56);
  const miniFrameH = Math.round(miniBoardW * 0.9);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value }],
  }));

  useEffect(() => {
    if (!expanded) setBoardWidth(0);
  }, [expanded]);

  if (expanded) {
    return (
      <Animated.View entering={expandIn} exiting={expandOut} style={styles.expandedWrap}>
        <PostItCardShell
          isDark={isDark}
          faceColor={BOARD_FACE}
          shadowColor={palette.shadow}
          shadowOffset={1}
          showTape={false}
          contentStyle={styles.cardBleed}>
          <View
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - boardWidth) > 0.5) setBoardWidth(w);
            }}>
            {boardWidth > 0 ? (
              <PuzzleBoard
                history={history}
                width={boardWidth}
                ink={palette.ink}
                muted={palette.muted}
                cover={cover}
                variant="full"
                onPressPiece={
                  onOpenDetail
                    ? () => {
                        void Haptics.selectionAsync();
                        onOpenDetail(history.id);
                      }
                    : undefined
                }
              />
            ) : (
              <View style={{ height: 120 }} />
            )}
          </View>
        </PostItCardShell>
      </Animated.View>
    );
  }

  void tiltIndex;

  return (
    <Animated.View style={[styles.tileWrap, { width: tileSize }, pressStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          expanded: false,
          checked: showDeleteControl ? selected : undefined,
        }}
        accessibilityLabel={
          showDeleteControl
            ? `${history.title}, ${t('history.puzzle.deleteCta')}`
            : `${history.title}, ${t('history.puzzle.progress', {
                completed,
                total: targetCount,
              })}`
        }
        onPressIn={() => {
          press.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 100 });
        }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}>
        <View
          style={[
            styles.noteOuter,
            { marginRight: NOTE_SHADOW, marginBottom: NOTE_SHADOW },
            showDeleteControl && styles.noteOuterDeleteMode,
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.noteSolidShadow,
              {
                backgroundColor: palette.shadow,
                transform: [
                  { translateX: NOTE_SHADOW },
                  { translateY: NOTE_SHADOW },
                ],
              },
            ]}
          />
          {/* 좌측 상단 사선 테이프 */}
          <View
            pointerEvents="none"
            style={[
              styles.tape,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.22)'
                  : 'rgba(255,255,255,0.78)',
              },
            ]}
          />
          <View style={[styles.noteFace, { backgroundColor: noteFace }]}>
            <View style={styles.tileContent}>
              <View style={[styles.miniBoardFrame, { height: miniFrameH }]}>
                <PuzzleBoard
                  history={history}
                  width={miniBoardW}
                  ink={palette.ink}
                  muted={palette.muted}
                  cover={cover}
                  variant="preview"
                />
              </View>
              <ThemedText
                style={[styles.tileTitle, { color: isDark ? '#FAFAFA' : '#1A1A1A' }]}
                numberOfLines={1}>
                {history.title}
              </ThemedText>
              <ThemedText
                style={[
                  styles.tileMeta,
                  { color: isDark ? 'rgba(255,255,255,0.7)' : '#444' },
                ]}
                numberOfLines={1}>
                {history.status === 'completed'
                  ? t('history.puzzle.albumItemMeta', { count: targetCount })
                  : t('history.puzzle.progress', {
                      completed,
                      total: targetCount,
                    })}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
      {showDeleteControl && onToggleSelect ? (
        <View style={styles.tileCheckWrap}>
          <CompletionRadioButton
            checked={selected}
            isDark={isDark}
            shape="square"
            size={22}
            accessibilityLabel={t('history.puzzle.deleteCta')}
            onPress={onToggleSelect}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

function expandablePropsEqual(
  prev: Props,
  next: Props,
): boolean {
  // onToggle/onOpenDetail 인라인 콜백은 매번 새로워도 무시
  return (
    prev.expanded === next.expanded &&
    prev.tileSize === next.tileSize &&
    prev.isDark === next.isDark &&
    prev.tiltIndex === next.tiltIndex &&
    prev.palette.ink === next.palette.ink &&
    prev.palette.muted === next.palette.muted &&
    prev.palette.shadow === next.palette.shadow &&
    prev.history.id === next.history.id &&
    prev.history.status === next.history.status &&
    prev.history.title === next.history.title &&
    prev.history.imageUri === next.history.imageUri &&
    prev.history.thumbnailUri === next.history.thumbnailUri &&
    prev.history.completedCount === next.history.completedCount &&
    prev.history.targetCount === next.history.targetCount &&
    prev.deleteMode === next.deleteMode &&
    prev.selected === next.selected &&
    Boolean(prev.onToggleSelect) === Boolean(next.onToggleSelect)
  );
}

export const PuzzleExpandablePostIt = memo(
  PuzzleExpandablePostItComponent,
  expandablePropsEqual,
);

const styles = StyleSheet.create({
  tileWrap: {
    marginBottom: 2,
    position: 'relative',
    overflow: 'visible',
  },
  noteOuter: {
    position: 'relative',
    borderRadius: 1,
  },
  noteOuterDeleteMode: {
    opacity: 0.94,
  },
  /** 오늘 탭 완료와 같은 붓터치 체크 */
  tileCheckWrap: {
    position: 'absolute',
    top: 2,
    right: NOTE_SHADOW,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  noteSolidShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1,
  },
  noteFace: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 1,
    zIndex: 1,
  },
  tape: {
    position: 'absolute',
    top: -4,
    left: -2,
    width: 28,
    height: 10,
    zIndex: 6,
    borderRadius: 1,
    opacity: 0.94,
    transform: [{ rotate: `${TAPE_ROTATE_DEG}deg` }],
  },
  tileContent: {
    paddingHorizontal: 7,
    paddingTop: 12,
    paddingBottom: 7,
    gap: 4,
    alignItems: 'center',
  },
  miniBoardFrame: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: BOARD_FACE,
  },
  tileTitle: {
    alignSelf: 'stretch',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingHorizontal: 1,
  },
  tileMeta: {
    alignSelf: 'stretch',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 1,
    marginTop: -2,
  },
  expandedWrap: {
    width: '100%',
    marginBottom: 8,
  },
  cardBleed: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    overflow: 'visible',
  },
});
