import type { ReadingLiveActivityConfig } from '@entities/day-plan';

export type LockFlowLiveActivityStatus = 'active' | 'paused';

export type LockFlowLiveActivityPayload = {
  blockId: string;
  title: string;
  category: string;
  categoryKey: string | null;
  timeRangeLabel: string;
  totalSeconds: number;
  pausedRemainingSeconds: number | null;
  endsAtIso: string | null;
  status: LockFlowLiveActivityStatus;
  readingDataConfig: ReadingLiveActivityConfig | null;
};
