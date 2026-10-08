export const PUZZLE_HISTORY_TARGETS = [1, 10, 20, 50, 100] as const;

export type PuzzleHistoryTarget = (typeof PUZZLE_HISTORY_TARGETS)[number];

/** @deprecated 완료 횟수 모델로 이전 — PUZZLE_HISTORY_TARGETS 사용 */
export const PUZZLE_HISTORY_DURATIONS = PUZZLE_HISTORY_TARGETS;
/** @deprecated PuzzleHistoryTarget 사용 */
export type PuzzleHistoryDuration = PuzzleHistoryTarget;

export type PuzzleHistoryStatus = 'active' | 'completed';

/** 완료 1회 ↔ 퍼즐 조각 1:1 */
export type PuzzlePieceRecord = {
  puzzleIndex: number;
  completed: boolean;
  completedAt?: string;
};

/** @deprecated PuzzlePieceRecord 사용 */
export type PuzzleDailyRecord = PuzzlePieceRecord & {
  dateKey?: string;
};

export type PuzzleHistory = {
  id: string;
  title: string;
  /** 앱 문서 디렉터리에 저장된 정사각 대표 이미지 */
  imageUri: string;
  /** Album 썸네일(없으면 imageUri 사용) */
  thumbnailUri?: string;
  /** 목표 완료 횟수 */
  targetCount: PuzzleHistoryTarget;
  totalPieces: number;
  completedCount: number;
  status: PuzzleHistoryStatus;
  pieces: PuzzlePieceRecord[];
  /**
   * 이 Puzzle에 묶인 루틴 categoryKey.
   * 연결된 루틴의 완료가 각각 +1씩 조각을 연다(여러 루틴 → 한 사진 가능).
   */
  linkedCategoryKeys?: string[];
  /**
   * 시작 시점의 연결 루틴 누적 완료 합.
   * (현재 누적 − baseline) 만큼만 새 조각으로 인정(sticky).
   */
  completionBaseline: number;
  /**
   * 시작 시점의 루틴별 누적 완료.
   * 상세 화면 기여 횟수 = 현재 − 이 baseline (루틴 키별).
   */
  completionBaselineByCategory?: Record<string, number>;
  createdAt: string;
  completedAt?: string;

  /** @deprecated targetCount */
  duration?: PuzzleHistoryTarget;
  /** @deprecated totalPieces */
  totalDays?: number;
  /** @deprecated completedCount */
  completedDays?: number;
  /** @deprecated pieces */
  dailyRecords?: PuzzlePieceRecord[];
  startDateKey?: string;
  endDateKey?: string;
};

export type PuzzleHistoryPersistedState = {
  schemaVersion: 2;
  histories: PuzzleHistory[];
  /** 동시에 하나만 활성 */
  activeHistoryId: string | null;
};
