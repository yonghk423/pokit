export {
  applyCompletedDateKeys,
  applyCompletedPieceCount,
  buildDailyRecordsForDuration,
  buildPiecesForTarget,
  createPuzzleHistoryInput,
  findRecordByDateKey,
  findRecordByPuzzleIndex,
  isDateInPuzzleRange,
  isPuzzleHistoryDuration,
  isPuzzleHistoryTarget,
  markPuzzleDayCompleted,
  normalizeCompletionBaselineByCategory,
  normalizeLinkedCategoryKeys,
  sumCompletionBaselineByCategory,
} from './lib/puzzleHistoryDomain';
export { buildPuzzleGrid, cellForPuzzleIndex } from './lib/puzzleGrid';
export type { PuzzleGrid, PuzzleGridCell } from './lib/puzzleGrid';
export {
  buildPuzzleRevealLayout,
  PUZZLE_JIGSAW_VIEWBOX,
  PUZZLE_POSTIT_HEIGHT,
  PUZZLE_POSTIT_WIDTH,
  seedCountForTarget,
  totalRevealArea,
  unitForPuzzleIndex,
} from './lib/puzzleRevealLayout';
export type {
  PostItFill,
  PuzzleRevealLayout,
  PuzzleRevealUnit,
  PuzzleSeedPiece,
} from './lib/puzzleRevealLayout';
export {
  clearPuzzleRevealSeen,
  ensurePuzzleRevealBaseline,
  listUnseenCompletedPuzzleIndices,
  markPuzzleRevealSeen,
  resetPuzzleRevealSeenForTests,
} from './lib/puzzleRevealSeen';
export {
  PUZZLE_HISTORY_DURATIONS,
  PUZZLE_HISTORY_TARGETS,
  usePuzzleHistoryStore,
} from './model';
export type {
  PuzzleDailyRecord,
  PuzzleHistory,
  PuzzleHistoryDuration,
  PuzzleHistoryPersistedState,
  PuzzleHistoryStatus,
  PuzzleHistoryStoreState,
  PuzzleHistoryTarget,
  PuzzlePieceRecord,
} from './model';

