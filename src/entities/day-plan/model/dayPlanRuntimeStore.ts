import { create } from 'zustand';

import type { DayPlanBlock } from './types';
import { toRuntimeTiming, type DayPlanRuntimeTiming } from '../lib/dayPlanRuntimeTime';

type RuntimeTimelineByBlockId = Record<string, DayPlanRuntimeTiming>;

export type DayPlanRuntimeStoreState = {
  nowMs: number;
  sessionDateKey: string | null;
  timelineByBlockId: RuntimeTimelineByBlockId;
  activeBlockId: string | null;
  tickerRunning: boolean;

  syncNow: (nowMs?: number) => void;
  buildTimelineFromBlocks: (input: { dateKey: string; blocks: DayPlanBlock[] }) => void;
  setActiveBlockId: (blockId: string | null) => void;
  startTicker: () => void;
  stopTicker: () => void;
  clearRuntime: () => void;
};

let runtimeTicker: ReturnType<typeof setInterval> | null = null;

export const useDayPlanRuntimeStore = create<DayPlanRuntimeStoreState>((set, get) => ({
  nowMs: Date.now(),
  sessionDateKey: null,
  timelineByBlockId: {},
  activeBlockId: null,
  tickerRunning: false,

  syncNow: (nowMs = Date.now()) => {
    set({ nowMs });
  },

  buildTimelineFromBlocks: ({ dateKey, blocks }) => {
    const timelineByBlockId: RuntimeTimelineByBlockId = {};
    for (const block of blocks) {
      const timing = toRuntimeTiming(dateKey, block);
      if (!timing) continue;
      timelineByBlockId[block.id] = timing;
    }
    set({
      sessionDateKey: dateKey,
      timelineByBlockId,
    });
  },

  setActiveBlockId: (blockId) => {
    set({ activeBlockId: blockId });
  },

  startTicker: () => {
    if (runtimeTicker) return;
    set({ tickerRunning: true, nowMs: Date.now() });
    runtimeTicker = setInterval(() => {
      get().syncNow(Date.now());
    }, 1000);
  },

  stopTicker: () => {
    if (runtimeTicker) {
      clearInterval(runtimeTicker);
      runtimeTicker = null;
    }
    set({ tickerRunning: false });
  },

  clearRuntime: () => {
    set({
      sessionDateKey: null,
      timelineByBlockId: {},
      activeBlockId: null,
    });
  },
}));
