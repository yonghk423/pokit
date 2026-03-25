import { create } from 'zustand';

import {
  findOverlappingDayPlanBlock,
  getFirstPendingBlock,
  getLocalMinutesOfDayNow,
  sortDayPlanBlocks,
} from '@entities/day-plan/lib/dayPlanTime';
import type { DayPlanBlock } from '@entities/day-plan/model/types';
import { loadDayPlan, saveDayPlan } from '@shared/lib/storage/dayPlanStorage';

function getLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function createBlockId(): string {
  const cryptoAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const u = cryptoAny.crypto?.randomUUID?.();
  if (u) return u;
  return `dpb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizePersisted(persisted: {
  dateKey: string;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
}): {
  dateKey: string;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
} {
  const today = getLocalDateKey();
  if (persisted.dateKey !== today) {
    return {
      dateKey: today,
      blocks: persisted.blocks.length > 0 ? persisted.blocks : [],
      completedBlockIds: [],
      skippedBlockIds: [],
    };
  }
  return persisted;
}

export type AddBlockResult =
  | { ok: true }
  | { ok: false; reason: 'overlap'; conflicting: DayPlanBlock }
  | { ok: false; reason: 'invalid_range' }
  | { ok: false; reason: 'in_the_past' };

export type DayPlanStoreState = {
  dateKey: string;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
  isHydrated: boolean;

  hydrate: () => void;
  resetTodayProgress: () => void;

  completeBlock: (blockId: string) => void;
  skipBlock: (blockId: string) => void;

  setBlocks: (blocks: DayPlanBlock[]) => void;

  /**
   * 새 타임라인 블록 추가. order는 기존 최대값+1.
   * endMinutes는 시작보다 커야 함 (같은 날 0~1440 분).
   */
  addBlock: (input: {
    title: string;
    category: string;
    startMinutes: number;
    endMinutes: number;
  }) => AddBlockResult;

  /** 블록 제거 + 완료/건너뛰기 id 정리 */
  removeBlock: (blockId: string) => void;
};

export const useDayPlanStore = create<DayPlanStoreState>((set, get) => {
  const persist = () => {
    const s = get();
    saveDayPlan({
      dateKey: s.dateKey,
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
    });
  };

  return {
    dateKey: getLocalDateKey(),
    blocks: [],
    completedBlockIds: [],
    skippedBlockIds: [],
    isHydrated: false,

    hydrate: () => {
      if (get().isHydrated) return;

      const raw = loadDayPlan<DayPlanBlock>();
      let dateKey = getLocalDateKey();
      let blocks: DayPlanBlock[] = [];
      let completedBlockIds: string[] = [];
      let skippedBlockIds: string[] = [];

      if (raw && Array.isArray(raw.blocks) && raw.blocks.length > 0) {
        const n = normalizePersisted({
          dateKey: raw.dateKey ?? dateKey,
          blocks: raw.blocks,
          completedBlockIds: Array.isArray(raw.completedBlockIds) ? raw.completedBlockIds : [],
          skippedBlockIds: Array.isArray(raw.skippedBlockIds) ? raw.skippedBlockIds : [],
        });
        dateKey = n.dateKey;
        blocks = sortDayPlanBlocks(n.blocks);
        completedBlockIds = n.completedBlockIds;
        skippedBlockIds = n.skippedBlockIds;
      }

      set({
        dateKey,
        blocks,
        completedBlockIds,
        skippedBlockIds,
        isHydrated: true,
      });
      persist();
    },

    resetTodayProgress: () => {
      set({
        completedBlockIds: [],
        skippedBlockIds: [],
      });
      persist();
    },

    completeBlock: (blockId) => {
      const { completedBlockIds, skippedBlockIds } = get();
      if (completedBlockIds.includes(blockId)) return;

      const nextCompleted = [...completedBlockIds, blockId];
      const nextSkipped = skippedBlockIds.filter((id) => id !== blockId);
      set({
        completedBlockIds: nextCompleted,
        skippedBlockIds: nextSkipped,
      });
      persist();
    },

    skipBlock: (blockId) => {
      const { completedBlockIds, skippedBlockIds } = get();
      if (skippedBlockIds.includes(blockId) || completedBlockIds.includes(blockId)) return;

      set({
        skippedBlockIds: [...skippedBlockIds, blockId],
      });
      persist();
    },

    setBlocks: (blocks) => {
      set({ blocks: sortDayPlanBlocks(blocks) });
      persist();
    },

    addBlock: (input) => {
      const start = Math.max(0, Math.min(Math.floor(input.startMinutes), 24 * 60 - 1));
      let end = Math.floor(input.endMinutes);
      end = Math.max(0, Math.min(end, 24 * 60));

      if (end <= start) {
        return { ok: false, reason: 'invalid_range' };
      }

      const nowMin = getLocalMinutesOfDayNow();
      if (end <= nowMin) {
        return { ok: false, reason: 'in_the_past' };
      }

      const current = get().blocks;
      const conflicting = findOverlappingDayPlanBlock(current, start, end);
      if (conflicting) {
        return { ok: false, reason: 'overlap', conflicting };
      }

      const maxOrder = current.reduce((acc, b) => Math.max(acc, b.order), -1);

      const block: DayPlanBlock = {
        id: createBlockId(),
        title: input.title.trim(),
        category: input.category.trim(),
        startMinutes: start,
        endMinutes: end,
        order: maxOrder + 1,
      };

      const next = sortDayPlanBlocks([...current, block]);
      set({ blocks: next });
      persist();
      return { ok: true };
    },

    removeBlock: (blockId) => {
      const { blocks, completedBlockIds, skippedBlockIds } = get();
      const nextBlocks = blocks.filter((b) => b.id !== blockId);
      if (nextBlocks.length === blocks.length) return;

      set({
        blocks: nextBlocks,
        completedBlockIds: completedBlockIds.filter((id) => id !== blockId),
        skippedBlockIds: skippedBlockIds.filter((id) => id !== blockId),
      });
      persist();
    },
  };
});

export function selectFirstPendingBlock(state: DayPlanStoreState): DayPlanBlock | null {
  return getFirstPendingBlock(state.blocks, state.completedBlockIds, state.skippedBlockIds);
}
