import { useHistoryStore } from '@entities/history';
import {
  ensurePuzzleRevealBaseline,
  usePuzzleHistoryStore,
} from '@entities/puzzle-history';

import { desiredPuzzleCompletions } from './countLinkedCompletions';

/**
 * historyStore 루틴 완료 횟수를 모든 진행 중 Puzzle에 반영한다.
 * - 연결 루틴 각각의 완료가 +1
 * - sticky / completionBaseline 적용
 */
export function syncPuzzleHistoryFromDailyStats(): void {
  const puzzle = usePuzzleHistoryStore.getState();
  if (!puzzle.isHydrated) {
    puzzle.hydrate();
  }

  const actives = puzzle.listActiveHistories();
  if (actives.length === 0) return;

  const history = useHistoryStore.getState();
  if (!history.isHydrated) {
    history.hydrate();
  }

  for (const active of actives) {
    const pieces = active.pieces ?? active.dailyRecords ?? [];
    ensurePuzzleRevealBaseline(
      active.id,
      pieces.filter((r) => r.completed).map((r) => r.puzzleIndex),
    );

    const desired = desiredPuzzleCompletions({
      linkedCategoryKeys: active.linkedCategoryKeys,
      completionBaseline: active.completionBaseline ?? 0,
      dailyStatsByDate: history.dailyStatsByDate,
    });

    if (desired <= 0) continue;
    puzzle.syncCompletedPieceCountForHistory(active.id, desired);
  }
}
