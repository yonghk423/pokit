import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { DayPlanBlock } from '@entities/day-plan/model/types';
import { loadDayPlan, saveDayPlan } from '@shared/lib/storage/dayPlanStorage';

import { selectFirstPendingBlock, useDayPlanStore } from './dayPlanStore';

jest.mock('@shared/lib/storage/dayPlanStorage', () => ({
  loadDayPlan: jest.fn(),
  saveDayPlan: jest.fn(),
}));

jest.mock('../lib/widgetDayPlanSync', () => ({
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

  it('allows overlapping spine timeline blocks', () => {
    resetStore({
      blocks: [
        block({
          id: 'spine-a',
          startMinutes: 17 * 60 + 52,
          endMinutes: 18 * 60 + 7,
          blockOrigin: 'spineTimeline',
        }),
      ],
    });
    const result = useDayPlanStore.getState().addBlock({
      title: '겹침',
      category: '명상',
      startMinutes: 18 * 60,
      endMinutes: 18 * 60 + 7,
      planDateKey: '2099-06-01',
      blockOrigin: 'spineTimeline',
    });
    expect(result.ok).toBe(true);
    expect(useDayPlanStore.getState().blocks).toHaveLength(2);
  });

  it('allows updating spine timeline block into overlap', () => {
    resetStore({
      blocks: [
        block({
          id: 'spine-a',
          startMinutes: 17 * 60 + 52,
          endMinutes: 18 * 60 + 7,
          blockOrigin: 'spineTimeline',
        }),
        block({
          id: 'spine-b',
          title: '두 번째',
          startMinutes: 18 * 60 + 30,
          endMinutes: 18 * 60 + 45,
          order: 1,
          blockOrigin: 'spineTimeline',
        }),
      ],
    });
    const result = useDayPlanStore.getState().updateBlock('spine-b', {
      startMinutes: 18 * 60,
      endMinutes: 18 * 60 + 7,
    });
    expect(result).toEqual({ ok: true });
    const updated = useDayPlanStore.getState().blocks.find((b) => b.id === 'spine-b');
    expect(updated?.startMinutes).toBe(18 * 60);
    expect(updated?.endMinutes).toBe(18 * 60 + 7);
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

  it('replaces overlapping blocks when requested', () => {
    resetStore({
      blocks: [block({ id: 'old', startMinutes: 14 * 60, endMinutes: 15 * 60 })],
    });
    const result = useDayPlanStore.getState().addBlock({
      title: '새 일정',
      category: '독서',
      startMinutes: 14 * 60 + 15,
      endMinutes: 15 * 60 + 15,
      planDateKey: '2099-06-01',
      replaceOverlapping: true,
    });
    expect(result.ok).toBe(true);
    expect(useDayPlanStore.getState().blocks).toHaveLength(1);
    expect(useDayPlanStore.getState().blocks[0]?.title).toBe('새 일정');
  });

  it('resets today progress', () => {
    resetStore({
      blocks: [block({ id: 'a' })],
      completedBlockIds: ['a'],
      skippedBlockIds: [],
      liveActivityChecklistFocusBlockId: 'a',
    });
    useDayPlanStore.getState().resetTodayProgress();
    expect(useDayPlanStore.getState().completedBlockIds).toEqual([]);
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBeNull();
  });

  it('completes multiple blocks at once', () => {
    resetStore({ blocks: [block({ id: 'a' }), block({ id: 'b', order: 1 })] });
    useDayPlanStore.getState().completeBlocks(['a', 'b']);
    expect(useDayPlanStore.getState().completedBlockIds).toEqual(['a', 'b']);
  });

  it('manages quick memos', () => {
    useDayPlanStore.getState().addQuickMemo('  메모  ');
    expect(useDayPlanStore.getState().quickMemos).toHaveLength(1);
    const id = useDayPlanStore.getState().quickMemos[0]!.id;
    useDayPlanStore.getState().toggleQuickMemoDone(id);
    expect(useDayPlanStore.getState().quickMemos[0]!.isDone).toBe(true);
    useDayPlanStore.getState().updateQuickMemoText(id, '수정');
    expect(useDayPlanStore.getState().quickMemos[0]!.text).toBe('수정');
    useDayPlanStore.getState().removeQuickMemo(id);
    expect(useDayPlanStore.getState().quickMemos).toHaveLength(0);
  });

  it('hydrates future plan without resetting blocks', () => {
    const future = addDaysToLocalDateKey(getLocalDateKey(), 3);
    mockedLoad.mockReturnValue({
      dateKey: future,
      blocks: [block({ id: 'f1', order: 0 })],
      completedBlockIds: ['f1'],
      skippedBlockIds: [],
      quickMemos: [{ id: 'm1', text: '메모', createdAt: 1, isDone: false }],
    });
    resetStore({ isHydrated: false });
    useDayPlanStore.getState().hydrate();
    expect(useDayPlanStore.getState().dateKey).toBe(future);
    expect(useDayPlanStore.getState().blocks).toHaveLength(1);
    expect(useDayPlanStore.getState().quickMemos).toHaveLength(1);
  });

  it('resets past snapshot to today on hydrate', () => {
    const past = addDaysToLocalDateKey(getLocalDateKey(), -5);
    mockedLoad.mockReturnValue({
      dateKey: past,
      blocks: [block({ id: 'old', order: 0 })],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    resetStore({ isHydrated: false });
    useDayPlanStore.getState().hydrate();
    expect(useDayPlanStore.getState().dateKey).toBe(getLocalDateKey());
    expect(useDayPlanStore.getState().blocks).toEqual([]);
  });

  it('restores checklist focus id when block is still pending', () => {
    mockedLoad.mockReturnValue({
      dateKey: getLocalDateKey(),
      blocks: [block({ id: 'focus', order: 0 })],
      completedBlockIds: [],
      skippedBlockIds: [],
      liveActivityChecklistFocusBlockId: 'focus',
    });
    resetStore({ isHydrated: false });
    useDayPlanStore.getState().hydrate();
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBe('focus');
  });

  it('prunes past-ended flow blocks and auto-completes pending ones', () => {
    const today = getLocalDateKey();
    resetStore({
      dateKey: today,
      blocks: [
        block({ id: 'expired', startMinutes: 0, endMinutes: 1 }),
        block({ id: 'later', startMinutes: 23 * 60, endMinutes: 23 * 60 + 30 }),
      ],
      liveActivityChecklistFocusBlockId: 'expired',
    });
    useDayPlanStore.getState().prunePastEndedBlocks();
    expect(useDayPlanStore.getState().blocks.map((b) => b.id)).toEqual(['later']);
    expect(useDayPlanStore.getState().completedBlockIds).not.toContain('expired');
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBeNull();
  });

  it('keeps past-ended spine timeline blocks when pruning', () => {
    const today = getLocalDateKey();
    resetStore({
      dateKey: today,
      blocks: [
        block({
          id: 'spine-past',
          startMinutes: 0,
          endMinutes: 1,
          blockOrigin: 'spineTimeline',
        }),
        block({ id: 'bag-past', startMinutes: 0, endMinutes: 1 }),
      ],
    });
    useDayPlanStore.getState().prunePastEndedBlocks();
    expect(useDayPlanStore.getState().blocks.map((b) => b.id)).toEqual(['spine-past']);
  });

  it('removes block and clears related ids', () => {
    resetStore({
      blocks: [block({ id: 'rm' })],
      completedBlockIds: ['rm'],
      skippedBlockIds: [],
      liveActivityChecklistFocusBlockId: 'rm',
    });
    useDayPlanStore.getState().removeBlock('rm');
    expect(useDayPlanStore.getState().blocks).toHaveLength(0);
    expect(useDayPlanStore.getState().completedBlockIds).toEqual([]);
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBeNull();
  });

  it('updates block title and time without spine overlap', () => {
    resetStore({
      blocks: [
        block({
          id: 'spine-a',
          title: '독서',
          startMinutes: 10 * 60,
          endMinutes: 10 * 60 + 30,
          blockOrigin: 'spineTimeline',
        }),
      ],
    });
    const result = useDayPlanStore.getState().updateBlock('spine-a', {
      title: '운동',
      startMinutes: 11 * 60,
      endMinutes: 11 * 60 + 20,
    });
    expect(result).toEqual({ ok: true });
    const updated = useDayPlanStore.getState().blocks[0];
    expect(updated?.title).toBe('운동');
    expect(updated?.startMinutes).toBe(11 * 60);
    expect(updated?.endMinutes).toBe(11 * 60 + 20);
  });

  it('allows updating an existing block whose end is already in the past', () => {
    const today = getLocalDateKey();
    resetStore({
      dateKey: today,
      blocks: [
        block({
          id: 'spine-past',
          title: '아침',
          startMinutes: 0,
          endMinutes: 1,
          blockOrigin: 'spineTimeline',
        }),
      ],
    });
    const result = useDayPlanStore.getState().updateBlock('spine-past', {
      title: '아침 완료',
      startMinutes: 0,
      endMinutes: 1,
    });
    expect(result).toEqual({ ok: true });
    expect(useDayPlanStore.getState().blocks[0]?.title).toBe('아침 완료');
  });

  it('rejects update with empty title', () => {
    resetStore({ blocks: [block({ id: 'a' })] });
    const result = useDayPlanStore.getState().updateBlock('a', { title: '   ' });
    expect(result).toEqual({ ok: false, reason: 'empty_title' });
  });

  it('setBlocks drops invalid checklist focus', () => {
    resetStore({
      blocks: [block({ id: 'a' })],
      liveActivityChecklistFocusBlockId: 'missing',
    });
    useDayPlanStore.getState().setBlocks([block({ id: 'b', order: 0 })]);
    expect(useDayPlanStore.getState().blocks[0]?.id).toBe('b');
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBeNull();
  });

  it('adds overnight block and rejects past end', () => {
    const today = getLocalDateKey();
    resetStore({ dateKey: today });
    const overnight = useDayPlanStore.getState().addBlock({
      title: '야간',
      category: '독서',
      startMinutes: 22 * 60,
      endMinutes: 6 * 60,
      endsNextCalendarDay: true,
      planDateKey: today,
    });
    expect(overnight.ok).toBe(true);

    const past = useDayPlanStore.getState().addBlock({
      title: '지남',
      category: '독서',
      startMinutes: 0,
      endMinutes: 1,
      planDateKey: today,
    });
    expect(past).toEqual({ ok: false, reason: 'in_the_past' });
  });

  it('allows endsNext block when end is after start', () => {
    resetStore({ dateKey: '2099-06-01' });
    const result = useDayPlanStore.getState().addBlock({
      title: '다음날 긴 구간',
      category: '독서',
      startMinutes: 3 * 60,
      endMinutes: 4 * 60,
      endsNextCalendarDay: true,
      planDateKey: '2099-06-01',
    });
    expect(result.ok).toBe(true);
    const added = useDayPlanStore.getState().blocks[0];
    expect(added?.endsNextCalendarDay).toBe(true);
  });

  it('updates block and toggles endsNext flag', () => {
    resetStore({
      dateKey: '2099-06-01',
      blocks: [block({ id: 'toggle', startMinutes: 22 * 60, endMinutes: 23 * 60 })],
    });
    const result = useDayPlanStore.getState().updateBlock('toggle', {
      startMinutes: 22 * 60,
      endMinutes: 3 * 60,
      endsNextCalendarDay: true,
    });
    expect(result).toEqual({ ok: true });
    const updated = useDayPlanStore.getState().blocks.find((b) => b.id === 'toggle');
    expect(updated?.endsNextCalendarDay).toBe(true);
    expect(updated?.endMinutes).toBe(3 * 60);
  });

  it('switches date when adding block for another plan day', () => {
    const future = addDaysToLocalDateKey(getLocalDateKey(), 2);
    const result = useDayPlanStore.getState().addBlock({
      title: '미래',
      category: '독서',
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      planDateKey: future,
    });
    expect(result.ok).toBe(true);
    expect(useDayPlanStore.getState().dateKey).toBe(future);
  });

  it('skips idempotent complete/skip paths', () => {
    resetStore({
      blocks: [block({ id: 'x' }), block({ id: 'y', order: 1 })],
      completedBlockIds: ['x'],
      skippedBlockIds: ['y'],
      liveActivityChecklistFocusBlockId: 'y',
    });
    useDayPlanStore.getState().completeBlock('x');
    useDayPlanStore.getState().skipBlock('x');
    useDayPlanStore.getState().skipBlock('y');
    expect(useDayPlanStore.getState().skippedBlockIds).toEqual(['y']);
    useDayPlanStore.getState().setLiveActivityChecklistFocusBlockId('x');
    expect(useDayPlanStore.getState().liveActivityChecklistFocusBlockId).toBe('x');
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
