import { useDayPlanRuntimeStore, useDayPlanStore } from '@entities/day-plan';

import { buildLiveActivityPayloadForBlock } from './buildLiveActivityPayloadForBlock';
import { upsertPokitLiveActivity } from './liveActivityClient';

/**
 * 예약 시작 시각이 지난 뒤 활성 페이로드로 Live Activity를 맞춥니다.
 * (시작 전이면 noop — standby는 `reconcileLiveActivityFromPlan`이 맡음)
 */
export async function upsertActiveLiveActivityForBlockId(blockId: string): Promise<void> {
  if (!blockId) return;

  useDayPlanStore.getState().hydrate();
  const plan = useDayPlanStore.getState();
  const runtime = useDayPlanRuntimeStore.getState();
  if (
    !plan.dateKey ||
    runtime.sessionDateKey !== plan.dateKey ||
    !runtime.timelineByBlockId[blockId]
  ) {
    if (plan.dateKey && plan.blocks.length > 0) {
      runtime.buildTimelineFromBlocks({ dateKey: plan.dateKey, blocks: plan.blocks });
    }
  }

  const timing = useDayPlanRuntimeStore.getState().timelineByBlockId[blockId];
  if (!timing || Date.now() < timing.startAtMs) return;

  const payload = buildLiveActivityPayloadForBlock({ blockId, status: 'active' });
  if (payload) await upsertPokitLiveActivity(payload);
}
