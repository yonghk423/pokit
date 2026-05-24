import { buildLiveActivityPayloadForBlock } from './buildLiveActivityPayloadForBlock';
import { upsertPokitLiveActivity } from './liveActivityClient';

export async function upsertFinishedLiveActivityForBlockId(blockId: string): Promise<void> {
  if (!blockId) return;
  const payload = buildLiveActivityPayloadForBlock({ blockId, status: 'finished' });
  if (payload) await upsertPokitLiveActivity(payload);
}

