export { buildPuzzleGrid, cellForPuzzleIndex } from './lib/puzzleGrid';
export type { PuzzleGrid, PuzzleGridCell } from './lib/puzzleGrid';
export {
  appendLinkedRoutines,
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
  sumCompletionBaselineByCategory
} from './lib/puzzleHistoryDomain';
export { listCompletedCollageTiles } from './lib/puzzleCollageExport';
export type { CollageDrawTile } from './lib/puzzleCollageExport';
export {
  PUZZLE_INK_COLORS,
  PUZZLE_INK_MAX_POINTS,
  PUZZLE_INK_MAX_STROKES,
  PUZZLE_INK_MIN_DISTANCE,
  PUZZLE_INK_WIDTH,
  sanitizePuzzleInkStrokes,
} from './lib/puzzleInk';
export type { PuzzleInkColor, PuzzleInkPoint, PuzzleInkStroke } from './lib/puzzleInk';
export {
  buildPuzzleRevealLayout,
  puzzleLayoutSalt,
  PUZZLE_JIGSAW_VIEWBOX,
  PUZZLE_POSTIT_HEIGHT,
  PUZZLE_POSTIT_WIDTH,
  seedCountForTarget,
  totalRevealArea,
  unitForPuzzleIndex
} from './lib/puzzleRevealLayout';
export type {
  PostItFill,
  PuzzleRevealLayout,
  PuzzleRevealUnit,
  PuzzleSeedPiece
} from './lib/puzzleRevealLayout';
export {
  clearPuzzleRevealSeen,
  ensurePuzzleRevealBaseline,
  listUnseenCompletedPuzzleIndices,
  markPuzzleRevealSeen,
  resetPuzzleRevealSeenForTests
} from './lib/puzzleRevealSeen';
export {
  PUZZLE_HISTORY_DURATIONS,
  PUZZLE_HISTORY_TARGETS,
  usePuzzleHistoryStore
} from './model';
export type {
  PuzzleDailyRecord,
  PuzzleHistory,
  PuzzleHistoryDuration,
  PuzzleHistoryPersistedState,
  PuzzleHistoryStatus,
  PuzzleHistoryStoreState,
  PuzzleHistoryTarget,
  PuzzlePieceRecord
} from './model';

