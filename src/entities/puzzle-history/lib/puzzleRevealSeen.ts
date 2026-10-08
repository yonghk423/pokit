/**
 * Puzzle 보드가 “이미 보여 준” 조각 인덱스.
 * 루틴 완료 sync가 탭 진입보다 먼저 일어나도,
 * sync 직전에 찍은 baseline 덕분에 새로 열린 조각만 reveal 애니할 수 있다.
 */
const seenByHistoryId = new Map<string, Set<number>>();

export function ensurePuzzleRevealBaseline(
  historyId: string,
  completedIndices: Iterable<number>,
): void {
  if (!historyId || seenByHistoryId.has(historyId)) return;
  seenByHistoryId.set(historyId, new Set(completedIndices));
}

export function markPuzzleRevealSeen(
  historyId: string,
  indices: Iterable<number>,
): void {
  if (!historyId) return;
  let set = seenByHistoryId.get(historyId);
  if (!set) {
    set = new Set();
    seenByHistoryId.set(historyId, set);
  }
  for (const idx of indices) {
    if (Number.isFinite(idx)) set.add(idx);
  }
}

/** 완료됐지만 아직 보드에서 보여 주지 않은 조각 */
export function listUnseenCompletedPuzzleIndices(
  historyId: string,
  completedIndices: Iterable<number>,
): number[] {
  const seen = seenByHistoryId.get(historyId);
  if (!seen) {
    // baseline 없음 — 첫 진입 직전 ensure를 호출하지 않은 경우.
    // 한꺼번에 애니하지 않도록 현재 완료분을 baseline으로 채택.
    ensurePuzzleRevealBaseline(historyId, completedIndices);
    return [];
  }
  const pending: number[] = [];
  for (const idx of completedIndices) {
    if (!seen.has(idx)) pending.push(idx);
  }
  pending.sort((a, b) => a - b);
  return pending;
}

/** 앱 데이터 초기화·목업 clear 시 인메모리 reveal 상태도 비운다. */
export function clearPuzzleRevealSeen(): void {
  seenByHistoryId.clear();
}

/** @deprecated clearPuzzleRevealSeen 사용 */
export function resetPuzzleRevealSeenForTests(): void {
  clearPuzzleRevealSeen();
}
