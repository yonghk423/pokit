import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const TARGETS = [1, 10, 20, 50, 100] as const;
const LEGACY_DURATIONS = [7, 14, 21, 30] as const;

export type PuzzleHistoryTargetRow = (typeof TARGETS)[number];
/** @deprecated */
export type PuzzleHistoryDurationRow = PuzzleHistoryTargetRow;
export type PuzzleHistoryStatusRow = 'active' | 'completed';

export type PuzzlePieceRow = {
  puzzleIndex: number;
  completed: boolean;
  completedAt?: string;
};

/** @deprecated */
export type PuzzleDailyRecordRow = PuzzlePieceRow & { dateKey?: string };

export type PuzzleHistoryRow = {
  id: string;
  title: string;
  imageUri: string;
  thumbnailUri?: string;
  targetCount: PuzzleHistoryTargetRow;
  totalPieces: number;
  completedCount: number;
  status: PuzzleHistoryStatusRow;
  pieces: PuzzlePieceRow[];
  linkedCategoryKeys?: string[];
  completionBaseline: number;
  completionBaselineByCategory?: Record<string, number>;
  createdAt: string;
  completedAt?: string;
};

export type PuzzleHistoryStateRow = {
  schemaVersion: 2;
  histories: PuzzleHistoryRow[];
  activeHistoryId: string | null;
};

type PersistedV2 = { v: 2; state: PuzzleHistoryStateRow };
type PersistedV1 = {
  v: 1;
  state: {
    schemaVersion: 1;
    histories: Array<Record<string, unknown>>;
    activeHistoryId: string | null;
  };
};

const EMPTY: PuzzleHistoryStateRow = {
  schemaVersion: 2,
  histories: [],
  activeHistoryId: null,
};

function isTarget(value: unknown): value is PuzzleHistoryTargetRow {
  return typeof value === 'number' && (TARGETS as readonly number[]).includes(value);
}

function mapLegacyDurationToTarget(duration: number): PuzzleHistoryTargetRow {
  if (duration <= 10) return 10;
  if (duration <= 20) return 20;
  if (duration <= 50) return 50;
  return 100;
}

function isStatus(value: unknown): value is PuzzleHistoryStatusRow {
  return value === 'active' || value === 'completed';
}

function normalizePiece(raw: Partial<PuzzlePieceRow> | null | undefined): PuzzlePieceRow | null {
  if (!raw) return null;
  const puzzleIndex = Math.floor(Number(raw.puzzleIndex));
  if (!Number.isFinite(puzzleIndex) || puzzleIndex < 0) return null;
  return {
    puzzleIndex,
    completed: Boolean(raw.completed),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  };
}

/** dateKey(YYYY-MM-DD) 또는 ISO → 로컬 noon 기준 N일 이동 후 ISO */
function shiftCompletedAt(baseIso: string, dayOffset: number): string {
  const trimmed = baseIso.trim();
  const base = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T12:00:00`)
    : new Date(trimmed);
  if (Number.isNaN(base.getTime())) return baseIso;
  base.setDate(base.getDate() + dayOffset);
  return base.toISOString();
}

function buildPieces(
  targetCount: PuzzleHistoryTargetRow,
  rawPieces: unknown,
  completedHint: number,
  /** 조각에 completedAt이 없을 때 — 최근 완료일·생성일 기준으로 날짜별 보정 */
  fallbackCompletedAt?: string,
): PuzzlePieceRow[] {
  const fromRaw = Array.isArray(rawPieces)
    ? rawPieces
        .map((r) => normalizePiece(r as Partial<PuzzlePieceRow>))
        .filter((r): r is PuzzlePieceRow => r != null)
        .sort((a, b) => a.puzzleIndex - b.puzzleIndex)
    : [];

  const cappedHint = Math.max(0, Math.min(targetCount, Math.floor(completedHint)));
  const pieces: PuzzlePieceRow[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const existing = fromRaw.find((p) => p.puzzleIndex === i);
    const completed = existing?.completed ?? i < cappedHint;
    let completedAt = existing?.completedAt;
    if (completed && !completedAt && fallbackCompletedAt) {
      /** 마지막 조각이 fallback 날짜, 그 이전은 하루씩 앞섬 */
      const lastIndex = Math.max(0, cappedHint - 1);
      completedAt = shiftCompletedAt(fallbackCompletedAt, i - lastIndex);
    }
    pieces.push({
      puzzleIndex: i,
      completed,
      completedAt: completed ? completedAt : undefined,
    });
  }
  return pieces;
}

function normalizeHistory(raw: Record<string, unknown> | null | undefined): PuzzleHistoryRow | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (!isStatus(raw.status)) return null;
  const imageUri = typeof raw.imageUri === 'string' ? raw.imageUri.trim() : '';
  if (!imageUri) return null;

  let targetCount: PuzzleHistoryTargetRow | null = null;
  if (isTarget(raw.targetCount)) targetCount = raw.targetCount;
  else if (typeof raw.duration === 'number') {
    if (isTarget(raw.duration)) targetCount = raw.duration;
    else if ((LEGACY_DURATIONS as readonly number[]).includes(raw.duration)) {
      targetCount = mapLegacyDurationToTarget(raw.duration);
    }
  }
  if (!targetCount) return null;

  const linkedCategoryKeys = Array.isArray(raw.linkedCategoryKeys)
    ? [
        ...new Set(
          raw.linkedCategoryKeys
            .filter((k): k is string => typeof k === 'string')
            .map((k) => k.trim())
            .filter(Boolean),
        ),
      ]
    : undefined;

  let completionBaselineByCategory: Record<string, number> | undefined;
  if (
    raw.completionBaselineByCategory &&
    typeof raw.completionBaselineByCategory === 'object' &&
    !Array.isArray(raw.completionBaselineByCategory)
  ) {
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(
      raw.completionBaselineByCategory as Record<string, unknown>,
    )) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      out[trimmed] = Math.max(0, Math.floor(Number(value) || 0));
    }
    if (Object.keys(out).length > 0) completionBaselineByCategory = out;
  }

  const legacyCompleted = Array.isArray(raw.dailyRecords)
    ? raw.dailyRecords.filter((r) => Boolean((r as { completed?: boolean })?.completed)).length
    : 0;
  const completedHint = Math.max(
    0,
    Math.floor(Number(raw.completedCount) || 0),
    Math.floor(Number(raw.completedDays) || 0),
    legacyCompleted,
  );

  const statusHint: PuzzleHistoryStatusRow =
    raw.status === 'completed' ? 'completed' : 'active';
  /** 완료 상태면 조각·횟수를 목표까지 채운 것으로 본다 (목업·레거시 불일치 보정) */
  const fillHint =
    statusHint === 'completed' ? Math.max(completedHint, targetCount) : completedHint;
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const historyCompletedAt =
    typeof raw.completedAt === 'string' ? raw.completedAt : undefined;
  const pieces = buildPieces(
    targetCount,
    raw.pieces ?? raw.dailyRecords,
    fillHint,
    historyCompletedAt ?? createdAt,
  );
  const completedCount = pieces.filter((p) => p.completed).length;
  const status: PuzzleHistoryStatusRow =
    completedCount >= targetCount ? 'completed' : statusHint;

  return {
    id: raw.id.trim(),
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim()
        : createdAt.slice(0, 10),
    imageUri,
    thumbnailUri:
      typeof raw.thumbnailUri === 'string' && raw.thumbnailUri.trim()
        ? raw.thumbnailUri.trim()
        : undefined,
    targetCount,
    totalPieces: targetCount,
    completedCount,
    status,
    pieces,
    linkedCategoryKeys:
      linkedCategoryKeys && linkedCategoryKeys.length > 0 ? linkedCategoryKeys : undefined,
    completionBaseline: Math.max(0, Math.floor(Number(raw.completionBaseline) || 0)),
    completionBaselineByCategory,
    createdAt,
    completedAt: historyCompletedAt,
  };
}

function toDomainHistory(row: PuzzleHistoryRow): PuzzleHistoryRow & {
  duration: PuzzleHistoryTargetRow;
  totalDays: number;
  completedDays: number;
  dailyRecords: PuzzlePieceRow[];
} {
  return {
    ...row,
    duration: row.targetCount,
    totalDays: row.totalPieces,
    completedDays: row.completedCount,
    dailyRecords: row.pieces,
  };
}

function normalizeState(raw: unknown): PuzzleHistoryStateRow {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const state = raw as {
    schemaVersion?: number;
    histories?: unknown;
    activeHistoryId?: unknown;
  };
  if (!Array.isArray(state.histories)) return { ...EMPTY };

  const histories = state.histories
    .map((h) => normalizeHistory(h as Record<string, unknown>))
    .filter((h): h is PuzzleHistoryRow => h != null)
    .map((h) => toDomainHistory(h));

  const activeCandidates = histories.filter((h) => h.status === 'active');
  let activeHistoryId =
    typeof state.activeHistoryId === 'string' && state.activeHistoryId
      ? state.activeHistoryId
      : null;
  if (activeHistoryId && !activeCandidates.some((h) => h.id === activeHistoryId)) {
    activeHistoryId = activeCandidates[0]?.id ?? null;
  }
  if (!activeHistoryId && activeCandidates.length > 0) {
    activeHistoryId = activeCandidates[0]!.id;
  }

  return {
    schemaVersion: 2,
    histories,
    activeHistoryId,
  };
}

export function loadPuzzleHistoryState(): PuzzleHistoryStateRow {
  const raw = localStorageClient.getJson<PersistedV2 | PersistedV1>(StorageKeys.puzzleHistory);
  if (!raw || (raw.v !== 1 && raw.v !== 2)) return { ...EMPTY };
  return normalizeState(raw.state);
}

export function savePuzzleHistoryState(state: PuzzleHistoryStateRow): void {
  const normalized = normalizeState(state);
  localStorageClient.setJson<PersistedV2>(StorageKeys.puzzleHistory, {
    v: 2,
    state: normalized,
  });
}

export function clearPuzzleHistoryStorage(): void {
  localStorageClient.removeItem(StorageKeys.puzzleHistory);
}
