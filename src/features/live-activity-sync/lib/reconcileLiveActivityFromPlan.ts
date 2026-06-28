import { useDayPlanStore } from '@entities/day-plan';

import { buildLiveActivityPayloadForBlock } from './buildLiveActivityPayloadForBlock';
import { endPokitLiveActivity, upsertPokitLiveActivity } from './liveActivityClient';

/**
 * 오늘 일정 중 **빠른 메모(잠금화면 메모)** 블록만 Live Activity와 동기화한다.
 * 우선순위(담기) 루틴 목록 Live Activity는 사용하지 않는다.
 */
export function reconcileLiveActivityFromPlan(): void {
  useDayPlanStore.getState().hydrate();

  const plan = useDayPlanStore.getState();
  const { blocks, completedBlockIds, skippedBlockIds } = plan;
  const done = new Set([...completedBlockIds, ...skippedBlockIds]);

  const pendingQuickMemo = blocks.filter(
    (b) => !done.has(b.id) && b.blockOrigin === 'quickMemo',
  );

  if (pendingQuickMemo.length === 0) {
    void endPokitLiveActivity();
    return;
  }

  const block = pendingQuickMemo[0]!;
  const payload = buildLiveActivityPayloadForBlock({
    blockId: block.id,
    status: 'active',
  });

  if (payload?.planMode === 'quickMemo') {
    void upsertPokitLiveActivity(payload);
    return;
  }

  void endPokitLiveActivity();
}
