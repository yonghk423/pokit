import { create } from 'zustand';

import {
  loadPuzzleHistoryState,
  savePuzzleHistoryState,
} from '@shared/lib/storage/puzzleHistoryStorage';

import {
  applyCompletedPieceCount,
  createPuzzleHistoryInput,
} from '../lib/puzzleHistoryDomain';
import type {
  PuzzleHistory,
  PuzzleHistoryPersistedState,
  PuzzleHistoryTarget,
} from './types';

function persist(state: Pick<PuzzleHistoryStoreState, 'histories' | 'activeHistoryId'>) {
  const payload: PuzzleHistoryPersistedState = {
    schemaVersion: 2,
    histories: state.histories,
    activeHistoryId: state.activeHistoryId,
  };
  savePuzzleHistoryState(payload as Parameters<typeof savePuzzleHistoryState>[0]);
}

function newId(): string {
  return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickFocusedActiveId(histories: PuzzleHistory[], preferredId: string | null): string | null {
  const actives = histories.filter((h) => h.status === 'active');
  if (actives.length === 0) return null;
  if (preferredId && actives.some((h) => h.id === preferredId)) return preferredId;
  return [...actives].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? null;
}

export type PuzzleHistoryStoreState = {
  histories: PuzzleHistory[];
  /** 포커스용(가장 최근 시작·보고 있는 진행 중 Puzzle). 동시에 여러 active 가능. */
  activeHistoryId: string | null;
  isHydrated: boolean;

  hydrate: () => void;
  reloadFromStorage: () => void;

  getActiveHistory: () => PuzzleHistory | null;
  listActiveHistories: () => PuzzleHistory[];
  listAlbumHistories: () => PuzzleHistory[];

  startHistory: (input: {
    title?: string;
    imageUri: string;
    thumbnailUri?: string;
    targetCount: PuzzleHistoryTarget;
    /** @deprecated */
    duration?: PuzzleHistoryTarget;
    linkedCategoryKeys?: string[];
    completionBaseline?: number;
    completionBaselineByCategory?: Record<string, number>;
  }) => PuzzleHistory | null;

  removeHistory: (historyId: string) => void;

  renameHistory: (historyId: string, title: string) => void;

  replaceHistoryImage: (
    historyId: string,
    imageUri: string,
    thumbnailUri?: string,
  ) => void;

  /** @deprecated replaceHistoryImage */
  replaceActiveImage: (imageUri: string, thumbnailUri?: string) => void;

  /** sticky: 특정 Puzzle의 완료 조각 수 */
  syncCompletedPieceCountForHistory: (historyId: string, desiredCompleted: number) => void;

  /** @deprecated syncCompletedPieceCountForHistory */
  syncCompletedPieceCount: (desiredCompleted: number) => void;

  /** @deprecated */
  syncCompletedDateKeys: (dateKeys: Iterable<string>) => void;

  /** @deprecated */
  markDayCompleted: (dateKey: string) => void;
};

export const usePuzzleHistoryStore = create<PuzzleHistoryStoreState>((set, get) => ({
  histories: [],
  activeHistoryId: null,
  isHydrated: false,

  reloadFromStorage: () => {
    const loaded = loadPuzzleHistoryState();
    const histories = loaded.histories as PuzzleHistory[];
    set({
      histories,
      activeHistoryId: pickFocusedActiveId(histories, loaded.activeHistoryId),
      isHydrated: true,
    });
  },

  hydrate: () => {
    get().reloadFromStorage();
  },

  getActiveHistory: () => {
    const { histories, activeHistoryId } = get();
    if (!activeHistoryId) return null;
    return histories.find((h) => h.id === activeHistoryId && h.status === 'active') ?? null;
  },

  listActiveHistories: () => {
    return get()
      .histories.filter((h) => h.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listAlbumHistories: () => {
    return get()
      .histories.filter((h) => h.status === 'completed')
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  },

  startHistory: (input) => {
    const imageUri = input.imageUri.trim();
    if (!imageUri) return null;
    const targetCount = input.targetCount ?? input.duration;
    if (!targetCount) return null;

    const created = createPuzzleHistoryInput({
      id: newId(),
      title: input.title?.trim() || '',
      imageUri,
      thumbnailUri: input.thumbnailUri,
      targetCount,
      linkedCategoryKeys: input.linkedCategoryKeys,
      completionBaseline: input.completionBaseline,
      completionBaselineByCategory: input.completionBaselineByCategory,
    });

    const histories = [...get().histories, created];
    const next = { histories, activeHistoryId: created.id };
    set({ ...next, isHydrated: true });
    persist(next);
    return created;
  },

  removeHistory: (historyId) => {
    const id = historyId.trim();
    if (!id) return;
    const histories = get().histories.filter((h) => h.id !== id);
    const next = {
      histories,
      activeHistoryId: pickFocusedActiveId(histories, get().activeHistoryId),
    };
    set(next);
    persist(next);
  },

  renameHistory: (historyId, title) => {
    const id = historyId.trim();
    const nextTitle = title.trim().slice(0, 24);
    if (!id || !nextTitle) return;
    let changed = false;
    const histories = get().histories.map((h) => {
      if (h.id !== id || h.title === nextTitle) return h;
      changed = true;
      return { ...h, title: nextTitle };
    });
    if (!changed) return;
    const next = {
      histories,
      activeHistoryId: pickFocusedActiveId(histories, get().activeHistoryId),
    };
    set(next);
    persist(next);
  },

  replaceHistoryImage: (historyId, imageUri, thumbnailUri) => {
    const trimmed = imageUri.trim();
    if (!trimmed || !historyId) return;
    const histories = get().histories.map((h) => {
      if (h.id !== historyId) return h;
      return {
        ...h,
        imageUri: trimmed,
        thumbnailUri: thumbnailUri?.trim() || h.thumbnailUri,
      };
    });
    const next = {
      histories,
      activeHistoryId: pickFocusedActiveId(histories, get().activeHistoryId),
    };
    set(next);
    persist(next);
  },

  replaceActiveImage: (imageUri, thumbnailUri) => {
    const activeId = get().activeHistoryId;
    if (!activeId) return;
    get().replaceHistoryImage(activeId, imageUri, thumbnailUri);
  },

  syncCompletedPieceCountForHistory: (historyId, desiredCompleted) => {
    const current = get().histories.find((h) => h.id === historyId);
    if (!current || current.status !== 'active') return;
    const updated = applyCompletedPieceCount(current, desiredCompleted);
    if (updated === current) return;

    const histories = get().histories.map((h) => (h.id === historyId ? updated : h));
    const next = {
      histories,
      activeHistoryId: pickFocusedActiveId(histories, get().activeHistoryId),
    };
    set(next);
    persist(next);
  },

  syncCompletedPieceCount: (desiredCompleted) => {
    const active = get().getActiveHistory();
    if (!active) return;
    get().syncCompletedPieceCountForHistory(active.id, desiredCompleted);
  },

  syncCompletedDateKeys: (dateKeys) => {
    get().syncCompletedPieceCount([...dateKeys].length);
  },

  markDayCompleted: (_dateKey) => {
    const active = get().getActiveHistory();
    if (!active) return;
    const current = active.completedCount ?? active.completedDays ?? 0;
    get().syncCompletedPieceCountForHistory(active.id, current + 1);
  },
}));
