import { buildLiveActivityPayloadForBlock } from './buildLiveActivityPayloadForBlock';
import { upsertLockFlowLiveActivity } from './liveActivityClient';

export async function upsertFinishedLiveActivityForBlockId(blockId: string): Promise<void> {
  if (!blockId) return;
  const payload = buildLiveActivityPayloadForBlock({ blockId, status: 'finished' });
  if (payload) await upsertLockFlowLiveActivity(payload);
}

