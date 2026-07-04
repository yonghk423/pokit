jest.mock('@entities/day-plan', () => {
  const flow = jest.requireActual('@entities/day-plan/lib/dayPlanFlowBlock');
  const time = jest.requireActual('@entities/day-plan/lib/dayPlanTime');
  const title = jest.requireActual('@entities/day-plan/lib/priorityBlockTitle');
  return {
    filterDayPlanFlowBlocks: flow.filterDayPlanFlowBlocks,
    formatMinuteOfDayKo: time.formatMinuteOfDayKo,
    parseNumberedFlowLines: title.parseNumberedFlowLines,
    isPriorityCompoundBlockTitle: title.isPriorityCompoundBlockTitle,
    useDayPlanStore: { getState: jest.fn() },
  };
});

import { useDayPlanStore } from '@entities/day-plan';

import { buildLiveActivityChecklistRows } from './buildLiveActivityPayloadForBlock';

const mockPlanGetState = useDayPlanStore.getState as jest.MockedFunction<
  typeof useDayPlanStore.getState
>;

describe('buildLiveActivityChecklistRows', () => {
  beforeEach(() => {
    mockPlanGetState.mockReturnValue({
      blocks: [
        {
          id: 'b1',
          title: '독서',
          category: '독서',
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
          order: 0,
        },
        {
          id: 'b2',
          title: '공부',
          category: '공부',
          startMinutes: 10 * 60,
          endMinutes: 11 * 60,
          order: 1,
        },
        {
          id: 'memo',
          title: '잠금 메모',
          category: '사용자',
          startMinutes: 11 * 60,
          endMinutes: 12 * 60,
          order: 2,
          blockOrigin: 'quickMemo',
        },
      ],
      completedBlockIds: ['b1'],
      skippedBlockIds: [],
      liveActivityChecklistFocusBlockId: null,
    } as unknown as ReturnType<typeof useDayPlanStore.getState>);
  });

  it('summarizes remaining flow blocks excluding quick memo', () => {
    const result = buildLiveActivityChecklistRows({
      focusBlockId: 'b2',
      status: 'active',
    });

    expect(result.checklistTitle).toBe('오늘 루틴 목록');
    expect(result.checklistSummaryLine1).toBe('완료 1개 · 건너뜀 0개 · 남은 1개');
    expect(result.checklistSummaryLine2).toContain('공부');
    expect(result.checklistRows.some((row) => row.blockId === 'memo')).toBe(false);
  });

  it('marks focus block as current row', () => {
    const result = buildLiveActivityChecklistRows({
      focusBlockId: 'b2',
      status: 'paused',
    });
    const current = result.checklistRows.find((row) => row.blockId === 'b2');
    expect(current?.state).toBe('current');
    expect(current?.timeLabel).toBeTruthy();
  });
});
