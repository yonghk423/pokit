import type { DayPlanBlock } from './types';

import { useDayPlanRuntimeStore } from './dayPlanRuntimeStore';

function resetRuntimeStore() {
  useDayPlanRuntimeStore.getState().stopTicker();
  useDayPlanRuntimeStore.getState().clearRuntime();
  useDayPlanRuntimeStore.setState({
    nowMs: Date.now(),
    tickerRunning: false,
  });
}

function block(partial: Partial<DayPlanBlock>): DayPlanBlock {
  return {
    id: 'b1',
    title: '독서',
    category: '독서',
    categoryKey: 'reading',
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    order: 0,
    ...partial,
  };
}

describe('dayPlanRuntimeStore', () => {
  beforeEach(() => {
    resetRuntimeStore();
  });

  afterEach(() => {
    resetRuntimeStore();
  });

  it('builds timeline from blocks', () => {
    useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
      dateKey: '2025-05-24',
      blocks: [block({ id: 'b1' })],
    });
    const state = useDayPlanRuntimeStore.getState();
    expect(state.sessionDateKey).toBe('2025-05-24');
    expect(state.timelineByBlockId.b1).toBeDefined();
    expect(state.timelineByBlockId.b1!.categoryKey).toBe('reading');
  });

  it('skips invalid timing blocks', () => {
    useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
      dateKey: '2025-05-24',
      blocks: [block({ id: 'bad', startMinutes: 10 * 60, endMinutes: 9 * 60 })],
    });
    expect(useDayPlanRuntimeStore.getState().timelineByBlockId.bad).toBeUndefined();
  });

  it('sets active block and clears runtime', () => {
    useDayPlanRuntimeStore.getState().setActiveBlockId('x');
    expect(useDayPlanRuntimeStore.getState().activeBlockId).toBe('x');
    useDayPlanRuntimeStore.getState().clearRuntime();
    expect(useDayPlanRuntimeStore.getState().activeBlockId).toBeNull();
    expect(useDayPlanRuntimeStore.getState().sessionDateKey).toBeNull();
  });

  it('syncNow updates timestamp', () => {
    const t = 1_700_000_000_000;
    useDayPlanRuntimeStore.getState().syncNow(t);
    expect(useDayPlanRuntimeStore.getState().nowMs).toBe(t);
  });

  it('starts and stops runtime ticker', () => {
    jest.useFakeTimers();
    const startMs = 1_700_000_000_000;
    jest.setSystemTime(startMs);

    useDayPlanRuntimeStore.getState().startTicker();
    expect(useDayPlanRuntimeStore.getState().tickerRunning).toBe(true);
    expect(useDayPlanRuntimeStore.getState().nowMs).toBe(startMs);

    useDayPlanRuntimeStore.getState().startTicker();
    jest.advanceTimersByTime(1000);
    expect(useDayPlanRuntimeStore.getState().nowMs).toBe(startMs + 1000);

    useDayPlanRuntimeStore.getState().stopTicker();
    expect(useDayPlanRuntimeStore.getState().tickerRunning).toBe(false);
    useDayPlanRuntimeStore.getState().stopTicker();

    jest.useRealTimers();
  });
});
