import type { DayPlanBlock, DayPlanRuntimeTiming } from '@entities/day-plan';
import { filterDayPlanFlowBlocks, useDayPlanRuntimeStore, useDayPlanStore } from '@entities/day-plan';

import { buildLiveActivityPayloadForBlock } from './buildLiveActivityPayloadForBlock';
import { endPokitLiveActivity, upsertPokitLiveActivity } from './liveActivityClient';
import type { PokitLiveActivityStatus } from '../model/types';

type PendingWithTiming = { block: DayPlanBlock; t: DayPlanRuntimeTiming };

/**
 * 오늘 일정 + 벽시계 + activeBlockId 기준으로 Live Activity 상태를 한 번에 맞춤.
 * (`standby` | `active` | `finished`) — 일시정지는 세션 화면 `useLiveActivitySync`가 담당.
 */
export function reconcileLiveActivityFromPlan(): void {
  useDayPlanStore.getState().hydrate();

  const plan = useDayPlanStore.getState();
  const { dateKey, blocks, completedBlockIds, skippedBlockIds } = plan;
  const flowBlocks = filterDayPlanFlowBlocks(blocks);

  if (!dateKey || blocks.length === 0) {
    void endPokitLiveActivity();
    return;
  }

  /** 빠른 메모만 있으면 일정 플로우 Live Activity는 건드리지 않는다(메모는 저장 시 전용 경로). */
  if (flowBlocks.length === 0) {
    return;
  }

  const runtime = useDayPlanRuntimeStore.getState();
  runtime.syncNow();

  if (runtime.sessionDateKey !== dateKey || Object.keys(runtime.timelineByBlockId).length === 0) {
    runtime.buildTimelineFromBlocks({ dateKey, blocks });
  }

  const now = Date.now();
  const done = new Set([...completedBlockIds, ...skippedBlockIds]);
  const timeline = useDayPlanRuntimeStore.getState().timelineByBlockId;

  const pending: PendingWithTiming[] = flowBlocks
    .filter((b) => !done.has(b.id))
    .map((b) => {
      const t = timeline[b.id];
      return t ? { block: b, t } : null;
    })
    .filter((x): x is PendingWithTiming => x != null);

  if (pending.length === 0) {
    const hasPendingQuickMemo = blocks.some(
      (b) => !done.has(b.id) && b.blockOrigin === 'quickMemo',
    );
    if (hasPendingQuickMemo) {
      return;
    }
    void endPokitLiveActivity();
    return;
  }

  let pick: PendingWithTiming | null = null;
  const activeId = useDayPlanRuntimeStore.getState().activeBlockId;
  if (activeId) {
    pick = pending.find((p) => p.block.id === activeId) ?? null;
  }

  if (!pick) {
    const inProgress = pending
      .filter((p) => now >= p.t.startAtMs && now < p.t.endAtMs)
      .sort((a, b) => a.block.order - b.block.order);
    pick = inProgress[0] ?? null;
  }

  if (!pick) {
    const upcoming = pending
      .filter((p) => now < p.t.startAtMs)
      .sort((a, b) => a.t.startAtMs - b.t.startAtMs);
    pick = upcoming[0] ?? null;
  }

  if (!pick) {
    const ended = pending
      .filter((p) => now >= p.t.endAtMs)
      .sort((a, b) => b.t.endAtMs - a.t.endAtMs);
    if (ended.length > 0) {
      const payload = buildLiveActivityPayloadForBlock({
        blockId: ended[0].block.id,
        status: 'finished',
      });
      if (payload) void upsertPokitLiveActivity(payload);
    } else {
      void endPokitLiveActivity();
    }
    return;
  }

  let status: PokitLiveActivityStatus;
  if (now >= pick.t.endAtMs) status = 'finished';
  else if (now < pick.t.startAtMs) status = 'standby';
  else status = 'active';

  const payload = buildLiveActivityPayloadForBlock({ blockId: pick.block.id, status });
  if (payload) void upsertPokitLiveActivity(payload);
}
