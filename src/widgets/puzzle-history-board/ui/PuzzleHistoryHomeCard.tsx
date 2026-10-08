import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { usePuzzleHistoryStore } from '@entities/puzzle-history';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { puzzleHistoryImageExists } from '@shared/lib/media/pickPuzzleHistoryImage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button/BrutalConfirmButton';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import { PuzzleBoard } from './PuzzleBoard';

/** 레퍼런스 캔버스 회백색 */
const PAPER_FACE = '#F5F4F2';

export type PuzzleHistoryCardPalette = {
  card: string;
  shadow: string;
  ink: string;
  muted: string;
};

type Props = {
  palette: PuzzleHistoryCardPalette;
  isDark: boolean;
  /** 특정 퍼즐을 표시. 없으면 포커스된 active / 빈 상태. */
  historyId?: string;
  onOpenDetail?: (historyId: string) => void;
  /** 빈 상태에서만 카드 안 CTA (있으면 부모가 버튼을 아래에 둠) */
  onStart?: () => void;
};

/**
 * 퍼즐 보드만 가득 채운 카드.
 * 추가·삭제 버튼은 탭 페이지에서 카드 아래에 둔다.
 */
export function PuzzleHistoryHomeCard({
  palette,
  isDark,
  historyId,
  onOpenDetail,
  onStart,
}: Props) {
  const { t } = useTranslation();

  const { isHydrated, hydrate, histories, activeHistoryId } = usePuzzleHistoryStore(
    useShallow((s) => ({
      isHydrated: s.isHydrated,
      hydrate: s.hydrate,
      histories: s.histories,
      activeHistoryId: s.activeHistoryId,
    })),
  );

  const focused = useMemo(() => {
    if (historyId) {
      return histories.find((h) => h.id === historyId) ?? null;
    }
    if (!activeHistoryId) return null;
    return histories.find((h) => h.id === activeHistoryId) ?? null;
  }, [histories, activeHistoryId, historyId]);

  const [imageBroken, setImageBroken] = useState(false);
  const [boardWidth, setBoardWidth] = useState(300);
  const cover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const paperFace = isDark ? RetroFlatColors.dark.surfaceAlt : PAPER_FACE;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    if (!focused?.imageUri) {
      setImageBroken(false);
      return;
    }
    void puzzleHistoryImageExists(focused.imageUri).then((ok) => {
      if (!cancelled) setImageBroken(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, [focused?.imageUri]);

  if (!isHydrated) return null;

  if (!focused) {
    return (
      <PostItCardShell
        isDark={isDark}
        faceColor={paperFace}
        shadowColor={palette.shadow}
        shadowOffset={1}
        showTape={false}
        contentStyle={styles.cardContentBleed}>
        <View style={styles.emptyBoard}>
          <ThemedText style={[styles.emptyHint, { color: palette.ink }]}>
            {t('history.puzzle.emptyTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
            {t('history.puzzle.emptyBody')}
          </ThemedText>
        </View>
        {onStart ? (
          <View style={styles.emptyCtaPad}>
            <BrutalConfirmButton
              align="stretch"
              label={t('history.puzzle.newCta')}
              accessibilityLabel={t('history.puzzle.newCta')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onStart();
              }}
            />
          </View>
        ) : null}
      </PostItCardShell>
    );
  }

  return (
    <PostItCardShell
      isDark={isDark}
      faceColor={paperFace}
      shadowColor={palette.shadow}
      shadowOffset={1}
      showTape={false}
      contentStyle={styles.cardContentBleed}>
      <View
        style={styles.boardWrap}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setBoardWidth(w);
        }}>
        <PuzzleBoard
          history={focused}
          width={boardWidth}
          ink={palette.ink}
          muted={palette.muted}
          cover={cover}
          imageBroken={imageBroken}
          onPressPiece={
            onOpenDetail
              ? () => {
                  void Haptics.selectionAsync();
                  onOpenDetail(focused.id);
                }
              : undefined
          }
        />
      </View>
    </PostItCardShell>
  );
}

const styles = StyleSheet.create({
  cardContentBleed: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  boardWrap: {
    width: '100%',
    alignItems: 'stretch',
  },
  emptyBoard: {
    width: '100%',
    aspectRatio: 1000 / 1200,
    backgroundColor: PAPER_FACE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyHint: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.15,
    lineHeight: 19,
  },
  emptyCtaPad: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
});
