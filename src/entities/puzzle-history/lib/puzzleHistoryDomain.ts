import type {
  PuzzleHistory,
  PuzzleHistoryTarget,
  PuzzlePieceRecord,
} from '../model/types';
import { PUZZLE_HISTORY_TARGETS } from '../model/types';

export function isPuzzleHistoryTarget(value: number): value is PuzzleHistoryTarget {
  return (PUZZLE_HISTORY_TARGETS as readonly number[]).includes(value);
}

/** @deprecated isPuzzleHistoryTarget */
export function isPuzzleHistoryDuration(value: number): value is PuzzleHistoryTarget {
  return isPuzzleHistoryTarget(value);
}

export function buildPiecesForTarget(targetCount: PuzzleHistoryTarget): PuzzlePieceRecord[] {
  const pieces: PuzzlePieceRecord[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    pieces.push({ puzzleIndex: i, completed: false });
  }
  return pieces;
}

/** @deprecated buildPiecesForTarget */
export function buildDailyRecordsForDuration(
  _startDateKey: string,
  duration: PuzzleHistoryTarget,
): PuzzlePieceRecord[] {
  return buildPiecesForTarget(duration);
}

export function normalizeLinkedCategoryKeys(keys: Iterable<string> | undefined): string[] {
  if (!keys) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys) {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function normalizeCompletionBaselineByCategory(
  linkedCategoryKeys: string[],
  raw: Record<string, number> | undefined,
): Record<string, number> | undefined {
  if (linkedCategoryKeys.length === 0) return undefined;
  const out: Record<string, number> = {};
  for (const key of linkedCategoryKeys) {
    out[key] = Math.max(0, Math.floor(Number(raw?.[key]) || 0));
  }
  return out;
}

export function sumCompletionBaselineByCategory(
  byCategory: Record<string, number> | undefined,
): number {
  if (!byCategory) return 0;
  let sum = 0;
  for (const value of Object.values(byCategory)) {
    sum += Math.max(0, Math.floor(Number(value) || 0));
  }
  return sum;
}

export function countCompletedPieces(pieces: PuzzlePieceRecord[]): number {
  let n = 0;
  for (const row of pieces) {
    if (row.completed) n += 1;
  }
  return n;
}

export function createPuzzleHistoryInput(params: {
  id: string;
  title: string;
  imageUri: string;
  thumbnailUri?: string;
  targetCount: PuzzleHistoryTarget;
  /** @deprecated targetCount */
  duration?: PuzzleHistoryTarget;
  createdAt?: string;
  linkedCategoryKeys?: string[];
  completionBaseline?: number;
  completionBaselineByCategory?: Record<string, number>;
}): PuzzleHistory {
  const targetCount = params.targetCount ?? params.duration;
  if (!targetCount || !isPuzzleHistoryTarget(targetCount)) {
    throw new Error('invalid puzzle targetCount');
  }
  const pieces = buildPiecesForTarget(targetCount);
  const linkedCategoryKeys = normalizeLinkedCategoryKeys(params.linkedCategoryKeys);
  const createdAt = params.createdAt ?? new Date().toISOString();
  const completionBaselineByCategory = normalizeCompletionBaselineByCategory(
    linkedCategoryKeys,
    params.completionBaselineByCategory,
  );
  const baselineFromCategory = sumCompletionBaselineByCategory(completionBaselineByCategory);
  const baseline = Math.max(
    0,
    Math.floor(
      params.completionBaseline ??
        (completionBaselineByCategory ? baselineFromCategory : 0),
    ),
  );
  return {
    id: params.id,
    title: params.title.trim() || createdAt.slice(0, 10),
    imageUri: params.imageUri.trim(),
    thumbnailUri: params.thumbnailUri?.trim() || undefined,
    targetCount,
    totalPieces: targetCount,
    completedCount: 0,
    status: 'active',
    pieces,
    linkedCategoryKeys: linkedCategoryKeys.length > 0 ? linkedCategoryKeys : undefined,
    completionBaseline: baseline,
    completionBaselineByCategory,
    createdAt,
    // 레거시 필드 미러(읽기 호환)
    duration: targetCount,
    totalDays: targetCount,
    completedDays: 0,
    dailyRecords: pieces,
  };
}

/**
 * sticky: completedCount는 줄지 않는다.
 * desiredCompleted만큼 앞쪽 조각을 연다.
 */
export function applyCompletedPieceCount(
  history: PuzzleHistory,
  desiredCompleted: number,
  completedAt = new Date().toISOString(),
): PuzzleHistory {
  if (history.status !== 'active' && history.status !== 'completed') return history;
  const pieces = history.pieces ?? history.dailyRecords ?? [];
  const target = history.targetCount ?? history.duration ?? pieces.length;
  const capped = Math.max(
    history.completedCount ?? history.completedDays ?? 0,
    Math.min(target, Math.max(0, Math.floor(desiredCompleted))),
  );

  let changed = false;
  const nextPieces = pieces.map((row) => {
    const shouldComplete = row.puzzleIndex < capped;
    if (shouldComplete && !row.completed) {
      changed = true;
      return { ...row, completed: true, completedAt: row.completedAt ?? completedAt };
    }
    return row;
  });

  const completedCount = countCompletedPieces(nextPieces);
  if (!changed && completedCount === (history.completedCount ?? history.completedDays ?? 0)) {
    return history;
  }

  const done = completedCount >= target;
  return {
    ...history,
    pieces: nextPieces,
    dailyRecords: nextPieces,
    completedCount,
    completedDays: completedCount,
    totalPieces: target,
    totalDays: target,
    targetCount: target as PuzzleHistoryTarget,
    duration: target as PuzzleHistoryTarget,
    status: done ? 'completed' : 'active',
    completedAt: done ? history.completedAt ?? completedAt : history.completedAt,
  };
}

/** @deprecated applyCompletedPieceCount */
export function markPuzzleDayCompleted(
  history: PuzzleHistory,
  _dateKey: string,
  completedAt = new Date().toISOString(),
): PuzzleHistory {
  const current = history.completedCount ?? history.completedDays ?? 0;
  return applyCompletedPieceCount(history, current + 1, completedAt);
}

/** @deprecated applyCompletedPieceCount */
export function applyCompletedDateKeys(
  history: PuzzleHistory,
  completedDateKeys: Iterable<string>,
  completedAt = new Date().toISOString(),
): PuzzleHistory {
  const keys = [...completedDateKeys];
  return applyCompletedPieceCount(history, keys.length, completedAt);
}

export function findRecordByPuzzleIndex(
  history: PuzzleHistory,
  puzzleIndex: number,
): PuzzlePieceRecord | undefined {
  const pieces = history.pieces ?? history.dailyRecords ?? [];
  return pieces.find((r) => r.puzzleIndex === puzzleIndex);
}

export function findRecordByDateKey(
  history: PuzzleHistory,
  _dateKey: string,
): PuzzlePieceRecord | undefined {
  return undefined;
}

export function isDateInPuzzleRange(_history: PuzzleHistory, _dateKey: string): boolean {
  return false;
}
