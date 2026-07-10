import { create } from 'zustand';

import { filterDayPlanFlowBlocks, migrateSpineTimelineBlockOrigins } from '@entities/day-plan/lib/dayPlanFlowBlock';
import { reorderSpineTimelineBlocks as applySpineTimelineReorder } from '@entities/day-plan/lib/reorderSpineTimelineBlocks';
import { isBlockEndInPastForDateKey } from '@entities/day-plan/lib/dayPlanRuntimeTime';
import {
  findOverlappingDayPlanBlock,
  findOverlappingDayPlanBlocks,
  getFirstPendingBlock,
  sortDayPlanBlocks,
} from '@entities/day-plan/lib/dayPlanTime';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { DayPlanBlock, DayPlanQuickMemo } from '@entities/day-plan/model/types';
import { loadDayPlan, saveDayPlan } from '@shared/lib/storage/dayPlanStorage';
import { syncDayPlanToWidget } from '../lib/widgetDayPlanSync';
import { registerDayPlanSyncTodayTabAccessors } from '../lib/runSyncTodayTabWithFixedRoutineApply';

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
  quickMemos?: DayPlanQuickMemo[];
}): {
  dateKey: string;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
  quickMemos: DayPlanQuickMemo[];
} {
  const today = getLocalDateKey();
  const dk = persisted.dateKey;

  if (dk === today) {
    const qm = persisted.quickMemos;
    return {
      dateKey: dk,
      blocks: persisted.blocks,
      completedBlockIds: persisted.completedBlockIds,
      skippedBlockIds: persisted.skippedBlockIds,
      quickMemos: Array.isArray(qm) ? qm : [],
    };
  }

  /** 미래 날짜에 잡아 둔 일정은 그대로 복원 (날짜·블록 유지) */
  if (dk > today) {
    const qm = persisted.quickMemos;
    return {
      dateKey: dk,
      blocks: Array.isArray(persisted.blocks) ? persisted.blocks : [],
      completedBlockIds: Array.isArray(persisted.completedBlockIds) ? persisted.completedBlockIds : [],
      skippedBlockIds: Array.isArray(persisted.skippedBlockIds) ? persisted.skippedBlockIds : [],
      quickMemos: Array.isArray(qm) ? qm : [],
    };
  }

  /** 과거 스냅샷 → 오늘 기준으로 초기화 */
  return {
    dateKey: today,
    blocks: [],
    completedBlockIds: [],
    skippedBlockIds: [],
    quickMemos: [],
  };
}

export type AddBlockResult =
  | { ok: true; blockId: string }
  | { ok: false; reason: 'overlap'; conflicting: DayPlanBlock }
  | { ok: false; reason: 'invalid_range' }
  | { ok: false; reason: 'in_the_past' };

export type UpdateBlockResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'empty_title' }
  | { ok: false; reason: 'overlap'; conflicting: DayPlanBlock }
  | { ok: false; reason: 'invalid_range' }
  | { ok: false; reason: 'in_the_past' };

export type DayPlanStoreState = {
  dateKey: string;
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
  /** 잠금화면 체크리스트에서 강조할 블록(null이면 세션 블록 등 기본 규칙). */
  liveActivityChecklistFocusBlockId: string | null;
  quickMemos: DayPlanQuickMemo[];
  isHydrated: boolean;

  hydrate: () => void;
  resetTodayProgress: () => void;
  /** 오늘 기준 종료 시각이 지난 블록을 자동 정리 */
  prunePastEndedBlocks: () => void;
  setLiveActivityChecklistFocusBlockId: (blockId: string | null) => void;

  completeBlock: (blockId: string) => void;
  uncompleteBlock: (blockId: string) => void;
  /** 여러 블록을 한 번에 완료 처리 (단일 set + persist) */
  completeBlocks: (blockIds: string[]) => void;
  skipBlock: (blockId: string) => void;

  setBlocks: (blocks: DayPlanBlock[]) => void;

  addQuickMemo: (text: string) => void;
  updateQuickMemoText: (id: string, text: string) => void;
  removeQuickMemo: (id: string) => void;
  toggleQuickMemoDone: (id: string) => void;

  /**
   * 새 타임라인 블록 추가. order는 기존 최대값+1.
   * endMinutes는 시작보다 커야 함 (같은 날 0~1440 분).
   * `replaceOverlapping`: true면 겹치는 기존 블록을 제거한 뒤 추가 (새 플로우로 덮어쓰기).
   */
  addBlock: (input: {
    title: string;
    category: string;
    categoryKey?: string;
    startMinutes: number;
    endMinutes: number;
    /** true면 `endMinutes`는 익일 0~1440 시각 */
    endsNextCalendarDay?: boolean;
    replaceOverlapping?: boolean;
    blockOrigin?: 'quickMemo' | 'prioritySession' | 'spineTimeline';
    /** 지정 시 해당 날짜 기준으로 종료 시각 검증·스토어 dateKey 정렬 (우선순위 플로우 등) */
    planDateKey?: string;
  }) => AddBlockResult;

  /** 블록 제거 + 완료/건너뛰기 id 정리 */
  removeBlock: (blockId: string) => void;

  /** 기존 타임라인 블록 수정 (제목·시작·종료). 겹침 검증은 blockOrigin scope 기준. */
  updateBlock: (
    blockId: string,
    patch: {
      title?: string;
      startMinutes?: number;
      endMinutes?: number;
      endsNextCalendarDay?: boolean;
      category?: string;
      categoryKey?: string | null;
    },
  ) => UpdateBlockResult;

  /** 스파인 타임라인 블록 순서 변경 (시간 슬롯 유지) */
  reorderSpineTimelineBlocks: (fromIndex: number, toIndex: number) => void;
};

export const useDayPlanStore = create<DayPlanStoreState>((set, get) => {
  const persist = () => {
    const s = get();
    const payload = {
      dateKey: s.dateKey,
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
      liveActivityChecklistFocusBlockId: s.liveActivityChecklistFocusBlockId,
      quickMemos: s.quickMemos,
    };
    saveDayPlan(payload);
    syncDayPlanToWidget(payload);
  };

  return {
    dateKey: getLocalDateKey(),
    blocks: [],
    completedBlockIds: [],
    skippedBlockIds: [],
    liveActivityChecklistFocusBlockId: null,
    quickMemos: [],
    isHydrated: false,

    hydrate: () => {
      if (get().isHydrated) return;

      const raw = loadDayPlan<DayPlanBlock>();
      let dateKey = getLocalDateKey();
      let blocks: DayPlanBlock[] = [];
      let completedBlockIds: string[] = [];
      let skippedBlockIds: string[] = [];
      let quickMemos: DayPlanQuickMemo[] = [];
      let liveActivityChecklistFocusBlockId: string | null = null;

      if (raw) {
        const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : [];
        const n = normalizePersisted({
          dateKey: raw.dateKey ?? dateKey,
          blocks: blocksRaw,
          completedBlockIds: Array.isArray(raw.completedBlockIds) ? raw.completedBlockIds : [],
          skippedBlockIds: Array.isArray(raw.skippedBlockIds) ? raw.skippedBlockIds : [],
          quickMemos: raw.quickMemos,
        });
        dateKey = n.dateKey;
        blocks = sortDayPlanBlocks(migrateSpineTimelineBlockOrigins(n.blocks));
        completedBlockIds = n.completedBlockIds;
        skippedBlockIds = n.skippedBlockIds;
        quickMemos = n.quickMemos;
        const savedFocus =
          typeof raw.liveActivityChecklistFocusBlockId === 'string'
            ? raw.liveActivityChecklistFocusBlockId
            : null;
        if (
          savedFocus &&
          blocks.some((b) => b.id === savedFocus) &&
          !completedBlockIds.includes(savedFocus) &&
          !skippedBlockIds.includes(savedFocus)
        ) {
          liveActivityChecklistFocusBlockId = savedFocus;
        }
      }

      set({
        dateKey,
        blocks,
        completedBlockIds,
        skippedBlockIds,
        liveActivityChecklistFocusBlockId,
        quickMemos,
        isHydrated: true,
      });
      persist();
    },

    resetTodayProgress: () => {
      set({
        completedBlockIds: [],
        skippedBlockIds: [],
        liveActivityChecklistFocusBlockId: null,
      });
      persist();
    },

    prunePastEndedBlocks: () => {
      const {
        dateKey,
        blocks,
        completedBlockIds,
        skippedBlockIds,
        liveActivityChecklistFocusBlockId,
      } = get();
      if (blocks.length === 0) return;

      const expiredIds = new Set(
        blocks
          .filter((b) =>
            isBlockEndInPastForDateKey(dateKey, {
              endMinutes: b.endMinutes,
              endsNextCalendarDay: b.endsNextCalendarDay,
            }),
          )
          .map((b) => b.id),
      );
      if (expiredIds.size === 0) return;

      const done = new Set([...completedBlockIds, ...skippedBlockIds]);
      const expiredPendingFlowIds = filterDayPlanFlowBlocks(blocks)
        .filter((b) => expiredIds.has(b.id) && !done.has(b.id))
        .map((b) => b.id);

      const allCompleted = expiredPendingFlowIds.length > 0
        ? [...completedBlockIds, ...expiredPendingFlowIds]
        : completedBlockIds;

      set({
        blocks: blocks.filter((b) => !expiredIds.has(b.id)),
        completedBlockIds: allCompleted.filter((id) => !expiredIds.has(id)),
        skippedBlockIds: skippedBlockIds.filter((id) => !expiredIds.has(id)),
        liveActivityChecklistFocusBlockId:
          liveActivityChecklistFocusBlockId && expiredIds.has(liveActivityChecklistFocusBlockId)
            ? null
            : liveActivityChecklistFocusBlockId,
      });
      persist();
    },

    setLiveActivityChecklistFocusBlockId: (blockId) => {
      set({ liveActivityChecklistFocusBlockId: blockId });
      persist();
    },

    completeBlock: (blockId) => {
      const { completedBlockIds, skippedBlockIds, liveActivityChecklistFocusBlockId } = get();
      if (completedBlockIds.includes(blockId)) return;

      const nextCompleted = [...completedBlockIds, blockId];
      const nextSkipped = skippedBlockIds.filter((id) => id !== blockId);
      set({
        completedBlockIds: nextCompleted,
        skippedBlockIds: nextSkipped,
        liveActivityChecklistFocusBlockId:
          liveActivityChecklistFocusBlockId === blockId
            ? null
            : liveActivityChecklistFocusBlockId,
      });
      persist();
    },

    uncompleteBlock: (blockId) => {
      const { completedBlockIds, skippedBlockIds } = get();
      const nextCompleted = completedBlockIds.filter((id) => id !== blockId);
      const nextSkipped = skippedBlockIds.filter((id) => id !== blockId);
      if (
        nextCompleted.length === completedBlockIds.length &&
        nextSkipped.length === skippedBlockIds.length
      ) {
        return;
      }
      set({
        completedBlockIds: nextCompleted,
        skippedBlockIds: nextSkipped,
      });
      persist();
    },

    completeBlocks: (blockIds) => {
      if (blockIds.length === 0) return;
      const { completedBlockIds, skippedBlockIds, liveActivityChecklistFocusBlockId } = get();
      const existing = new Set(completedBlockIds);
      const newIds = blockIds.filter((id) => !existing.has(id));
      if (newIds.length === 0) return;

      const nextCompleted = [...completedBlockIds, ...newIds];
      const newSet = new Set(newIds);
      const nextSkipped = skippedBlockIds.filter((id) => !newSet.has(id));
      set({
        completedBlockIds: nextCompleted,
        skippedBlockIds: nextSkipped,
        liveActivityChecklistFocusBlockId:
          liveActivityChecklistFocusBlockId != null && newSet.has(liveActivityChecklistFocusBlockId)
            ? null
            : liveActivityChecklistFocusBlockId,
      });
      persist();
    },

    skipBlock: (blockId) => {
      const { completedBlockIds, skippedBlockIds, liveActivityChecklistFocusBlockId } = get();
      if (skippedBlockIds.includes(blockId) || completedBlockIds.includes(blockId)) return;

      set({
        skippedBlockIds: [...skippedBlockIds, blockId],
        liveActivityChecklistFocusBlockId:
          liveActivityChecklistFocusBlockId === blockId
            ? null
            : liveActivityChecklistFocusBlockId,
      });
      persist();
    },

    setBlocks: (blocks) => {
      const sorted = sortDayPlanBlocks(blocks);
      const { liveActivityChecklistFocusBlockId } = get();
      const focusOk =
        liveActivityChecklistFocusBlockId != null &&
        sorted.some((b) => b.id === liveActivityChecklistFocusBlockId);
      set({
        blocks: sorted,
        liveActivityChecklistFocusBlockId: focusOk ? liveActivityChecklistFocusBlockId : null,
      });
      persist();
    },

    addQuickMemo: (text) => {
      const t = text.trim();
      if (!t) return;
      const memo: DayPlanQuickMemo = {
        id: createBlockId(),
        text: t,
        createdAt: Date.now(),
        isDone: false,
      };
      set({ quickMemos: [...get().quickMemos, memo] });
      persist();
    },

    updateQuickMemoText: (id, text) => {
      set({
        quickMemos: get().quickMemos.map((m) => (m.id === id ? { ...m, text } : m)),
      });
      persist();
    },

    removeQuickMemo: (id) => {
      set({ quickMemos: get().quickMemos.filter((m) => m.id !== id) });
      persist();
    },

    toggleQuickMemoDone: (id) => {
      set({
        quickMemos: get().quickMemos.map((m) =>
          m.id === id ? { ...m, isDone: !m.isDone } : m,
        ),
      });
      persist();
    },

    addBlock: (input) => {
      const start = Math.max(0, Math.min(Math.floor(input.startMinutes), 24 * 60 - 1));
      let end = Math.floor(input.endMinutes);
      end = Math.max(0, Math.min(end, 24 * 60));
      const endsNext = Boolean(input.endsNextCalendarDay);

      if (!endsNext) {
        if (end <= start) {
          return { ok: false, reason: 'invalid_range' };
        }
      } else {
        if (end >= 24 * 60) {
          return { ok: false, reason: 'invalid_range' };
        }
        const spanMin = 24 * 60 - start + end;
        if (spanMin < 1) {
          return { ok: false, reason: 'invalid_range' };
        }
      }

      if (input.planDateKey && input.planDateKey !== get().dateKey) {
        set({
          dateKey: input.planDateKey,
          blocks: [],
          completedBlockIds: [],
          skippedBlockIds: [],
        });
        persist();
      }

      const dateKeyForBlock = get().dateKey;
      if (isBlockEndInPastForDateKey(dateKeyForBlock, { endMinutes: end, endsNextCalendarDay: endsNext })) {
        return { ok: false, reason: 'in_the_past' };
      }

      let { blocks: current, completedBlockIds, skippedBlockIds } = get();

      const isSpineTimeline = input.blockOrigin === 'spineTimeline';
      const overlapScope = isSpineTimeline
        ? current.filter((b) => b.blockOrigin === 'spineTimeline')
        : current.filter((b) => b.blockOrigin !== 'spineTimeline');

      if (input.replaceOverlapping) {
        const overlapping = findOverlappingDayPlanBlocks(
          overlapScope,
          start,
          end,
          undefined,
          endsNext,
        );
        if (overlapping.length > 0) {
          const removeIds = new Set(overlapping.map((b) => b.id));
          current = current.filter((b) => !removeIds.has(b.id));
          completedBlockIds = completedBlockIds.filter((id) => !removeIds.has(id));
          skippedBlockIds = skippedBlockIds.filter((id) => !removeIds.has(id));
        }
      } else if (!isSpineTimeline) {
        const conflicting = findOverlappingDayPlanBlock(
          overlapScope,
          start,
          end,
          undefined,
          endsNext,
        );
        if (conflicting) {
          return { ok: false, reason: 'overlap', conflicting };
        }
      }

      const maxOrder = current.reduce((acc, b) => Math.max(acc, b.order), -1);

      const ck =
        typeof input.categoryKey === 'string' && input.categoryKey.trim().length > 0
          ? input.categoryKey.trim()
          : undefined;

      const block: DayPlanBlock = {
        id: createBlockId(),
        title: input.title.trim(),
        category: input.category.trim(),
        startMinutes: start,
        endMinutes: end,
        order: maxOrder + 1,
        ...(endsNext ? { endsNextCalendarDay: true as const } : {}),
        ...(input.blockOrigin ? { blockOrigin: input.blockOrigin } : {}),
        ...(ck ? { categoryKey: ck } : {}),
      };

      const next = sortDayPlanBlocks([...current, block]);
      set({ blocks: next, completedBlockIds, skippedBlockIds });
      persist();
      return { ok: true, blockId: block.id };
    },

    removeBlock: (blockId) => {
      const { blocks, completedBlockIds, skippedBlockIds, liveActivityChecklistFocusBlockId } =
        get();
      const nextBlocks = blocks.filter((b) => b.id !== blockId);
      if (nextBlocks.length === blocks.length) return;

      set({
        blocks: nextBlocks,
        completedBlockIds: completedBlockIds.filter((id) => id !== blockId),
        skippedBlockIds: skippedBlockIds.filter((id) => id !== blockId),
        liveActivityChecklistFocusBlockId:
          liveActivityChecklistFocusBlockId === blockId
            ? null
            : liveActivityChecklistFocusBlockId,
      });
      persist();
    },

    updateBlock: (blockId, patch) => {
      const existing = get().blocks.find((b) => b.id === blockId);
      if (!existing) {
        return { ok: false, reason: 'not_found' };
      }

      const title =
        patch.title !== undefined ? patch.title.trim() : existing.title.trim();
      if (!title) {
        return { ok: false, reason: 'empty_title' };
      }

      const start = Math.max(
        0,
        Math.min(
          Math.floor(patch.startMinutes ?? existing.startMinutes),
          24 * 60 - 1,
        ),
      );
      let end = Math.floor(patch.endMinutes ?? existing.endMinutes);
      end = Math.max(0, Math.min(end, 24 * 60));
      const endsNext =
        patch.endsNextCalendarDay !== undefined
          ? Boolean(patch.endsNextCalendarDay)
          : Boolean(existing.endsNextCalendarDay);

      if (!endsNext) {
        if (end <= start) {
          return { ok: false, reason: 'invalid_range' };
        }
      } else {
        if (end >= 24 * 60) {
          return { ok: false, reason: 'invalid_range' };
        }
        const spanMin = 24 * 60 - start + end;
        if (spanMin < 1) {
          return { ok: false, reason: 'invalid_range' };
        }
      }

      const dateKeyForBlock = get().dateKey;
      if (
        isBlockEndInPastForDateKey(dateKeyForBlock, {
          endMinutes: end,
          endsNextCalendarDay: endsNext,
        })
      ) {
        return { ok: false, reason: 'in_the_past' };
      }

      const overlapScope =
        existing.blockOrigin === 'spineTimeline'
          ? get().blocks.filter(
              (b) => b.blockOrigin === 'spineTimeline' && b.id !== blockId,
            )
          : get().blocks.filter(
              (b) => b.blockOrigin !== 'spineTimeline' && b.id !== blockId,
            );

      if (existing.blockOrigin !== 'spineTimeline') {
        const conflicting = findOverlappingDayPlanBlock(
          overlapScope,
          start,
          end,
          undefined,
          endsNext,
        );
        if (conflicting) {
          return { ok: false, reason: 'overlap', conflicting };
        }
      }

      const nextBlocks = sortDayPlanBlocks(
        get().blocks.map((b) => {
          if (b.id !== blockId) return b;
          const nextCategoryKey =
            patch.categoryKey !== undefined
              ? patch.categoryKey?.trim() || undefined
              : b.categoryKey;
          const nextCategory =
            patch.category !== undefined ? patch.category.trim() : b.category;
          return {
            ...b,
            title,
            startMinutes: start,
            endMinutes: end,
            ...(endsNext ? { endsNextCalendarDay: true as const } : { endsNextCalendarDay: undefined }),
            category: nextCategory,
            ...(nextCategoryKey ? { categoryKey: nextCategoryKey } : { categoryKey: undefined }),
          };
        }),
      );
      set({ blocks: nextBlocks });
      persist();
      return { ok: true };
    },

    reorderSpineTimelineBlocks: (fromIndex, toIndex) => {
      const next = applySpineTimelineReorder(get().blocks, fromIndex, toIndex);
      if (next === get().blocks) return;
      set({ blocks: next });
      persist();
    },
  };
});

registerDayPlanSyncTodayTabAccessors(
  () => ({
    isHydrated: useDayPlanStore.getState().isHydrated,
    blocks: useDayPlanStore.getState().blocks,
  }),
  (blocks) => {
    const sorted = sortDayPlanBlocks(blocks);
    useDayPlanStore.setState({ blocks: sorted });
    const s = useDayPlanStore.getState();
    const payload = {
      dateKey: s.dateKey,
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
      liveActivityChecklistFocusBlockId: s.liveActivityChecklistFocusBlockId,
      quickMemos: s.quickMemos,
    };
    saveDayPlan(payload);
    syncDayPlanToWidget(payload);
  },
);

export function selectFirstPendingBlock(state: DayPlanStoreState): DayPlanBlock | null {
  const flowBlocks = filterDayPlanFlowBlocks(state.blocks);
  return getFirstPendingBlock(flowBlocks, state.completedBlockIds, state.skippedBlockIds);
}
