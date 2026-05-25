import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { DayPlanBlock } from '@entities/day-plan/model/types';
import { loadDayPlan, saveDayPlan } from '@shared/lib/storage/dayPlanStorage';

import { selectFirstPendingBlock, useDayPlanStore } from './dayPlanStore';

jest.mock('@shared/lib/storage/dayPlanStorage', () => ({
  loadDayPlan: jest.fn(),
  saveDayPlan: jest.fn(),
}));

jest.mock('@shared/lib/storage/widgetDayPlanSync', () => ({
  syncDayPlanToWidget: jest.fn(),
}));

const mockedLoad = loadDayPlan as jest.MockedFunction<typeof loadDayPlan>;
const mockedSave = saveDayPlan as jest.MockedFunction<typeof saveDayPlan>;

function block(partial: Partial<DayPlanBlock> & Pick<DayPlanBlock, 'id'>): DayPlanBlock {
  return {
    title: '테스트',
    category: '독서',
    startMinutes: 14 * 60,
    endMinutes: 15 * 60,
    order: 0,
    ...partial,
  };
}

function resetStore(overrides: Partial<ReturnType<typeof useDayPlanStore.getState>> = {}) {
  useDayPlanStore.setState({
    dateKey: '2099-06-01',
    blocks: [],
    completedBlockIds: [],
    skippedBlockIds: [],
    quickMemos: [],
    liveActivityChecklistFocusBlockId: null,
    isHydrated: true,
    ...overrides,
  });
}

describe('dayPlanStore', () => {
  beforeEach(() => {
    mockedLoad.mockReturnValue(null);
    mockedSave.mockClear();
    resetStore();
  });

  it('hydrates from storage', () => {
    const today = getLocalDateKey();
    mockedLoad.mockReturnValue({
      dateKey: today,
      blocks: [block({ id: 'h1', order: 0 })],
      completedBlockIds: [],
      skippedBlockIds: [],
      quickMemos: [],
    });
    resetStore({ isHydrated: false });
    useDayPlanStore.getState().hydrate();
    expect(useDayPlanStore.getState().isHydrated).toBe(true);
    expect(useDayPlanStore.getState().blocks).toHaveLength(1);
    expect(mockedSave).toHaveBeenCalled();
  });

  it('adds block when range is valid', () => {
    const result = useDayPlanStore.getState().addBlock({
      title: '독서',
      category: '독서',
      categoryKey: 'reading',
      startMinutes: 14 * 60,
      endMinutes: 15 * 60,
      planDateKey: '2099-06-01',
    });
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(useDayPlanStore.getState().blocks).toHaveLength(1);
  });

  it('rejects invalid range', () => {
    const result = useDayPlanStore.getState().addBlock({
      title: 'x',
      category: 'x',
      startMinutes: 15 * 60,
      endMinutes: 14 * 60,
      planDateKey: '2099-06-01',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_range' });
  });

  it('rejects overlapping block', () => {
    resetStore({
      blocks: [block({ id: 'a', startMinutes: 14 * 60, endMinutes: 15 * 60 })],
    });
    const result = useDayPlanStore.getState().addBlock({
      title: '겹침',
      category: '명상',
      startMinutes: 14 * 60 + 30,
      endMinutes: 15 * 60 + 30,
      planDateKey: '2099-06-01',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('overlap');
  });

  it('completes and skips blocks', () => {
    resetStore({ blocks: [block({ id: 'a' }), block({ id: 'b', order: 1 })] });
    useDayPlanStore.getState().completeBlock('a');
    expect(useDayPlanStore.getState().completedBlockIds).toContain('a');
    useDayPlanStore.getState().skipBlock('b');
    expect(useDayPlanStore.getState().skippedBlockIds).toContain('b');
  });

  it('manages quick memos', () => {
    useDayPlanStore.getState().addQuickMemo('  메모  ');
    expect(useDayPlanStore.getState().quickMemos).toHaveLength(1);
    const id = useDayPlanStore.getState().quickMemos[0]!.id;
    useDayPlanStore.getState().toggleQuickMemoDone(id);
    expect(useDayPlanStore.getState().quickMemos[0]!.isDone).toBe(true);
    useDayPlanStore.getState().removeQuickMemo(id);
    expect(useDayPlanStore.getState().quickMemos).toHaveLength(0);
  });
});

describe('selectFirstPendingBlock', () => {
  it('ignores quickMemo blocks and completed ids', () => {
    const state = useDayPlanStore.getState();
    const pending = selectFirstPendingBlock({
      ...state,
      blocks: [
        block({ id: 'memo', blockOrigin: 'quickMemo', order: 0 }),
        block({ id: 'flow', order: 1 }),
      ],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    expect(pending?.id).toBe('flow');
  });
});
