export type LockFlowLiveActivityStatus = 'active' | 'paused';

export type LockFlowLiveActivityPayload = {
  blockId: string;
  title: string;
  category: string;
  timeRangeLabel: string;
  totalSeconds: number;
  pausedRemainingSeconds: number | null;
  endsAtIso: string | null;
  status: LockFlowLiveActivityStatus;
};
