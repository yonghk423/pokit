jest.mock('@shared/lib/storage', () => ({
  ...jest.requireActual('@shared/lib/storage'),
  loadDayPlanDraft: jest.fn(),
  saveDayPlanDraft: jest.fn(),
  syncWidgetTimelineFromStorage: jest.fn(),
}));

jest.mock('../lib/localDateKey', () => ({
  getLocalDateKey: () => '2025-05-26',
  addDaysToLocalDateKey: jest.requireActual('../lib/localDateKey').addDaysToLocalDateKey,
}));

import { loadDayPlanDraft, saveDayPlanDraft } from '@shared/lib/storage';

import {
  appendPriorityCategoryKeysIfMissing,
  useDayPlanDraftStore,
} from './dayPlanDraftStore';

const mockLoadDayPlanDraft = loadDayPlanDraft as jest.MockedFunction<typeof loadDayPlanDraft>;
const mockSaveDayPlanDraft = saveDayPlanDraft as jest.MockedFunction<typeof saveDayPlanDraft>;

function resetDraftStore() {
  useDayPlanDraftStore.setState({
    ...useDayPlanDraftStore.getState(),
    isHydrated: false,
    planMode: 'priority',
    priorityPlanDateKey: '2025-05-26',
    priorityPlanDateKeyEnd: '2025-05-26',
    priorityPlanExplicitMultiDay: false,
    priorityOvernightEndAuto: false,
    priorityStart: '09:00',
    priorityEnd: '18:00',
    priorityCategoryOrder: [],
    routineHistoryPendingByDate: {},
    routineHistoryPlannedKeysByDate: {},
    completedFocusCategoryKeys: [],
    planCompletionDismissedKeys: [],
    quickMemoDraft: '',
  });
}

describe('dayPlanDraftStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadDayPlanDraft.mockReturnValue(null);
    resetDraftStore();
  });

  it('migrates legacy weekly plan mode to priority on hydrate', () => {
    mockLoadDayPlanDraft.mockReturnValue({
      planMode: 'weekly' as never,
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: [],
      quickMemoDraft: '메모',
    });
    useDayPlanDraftStore.getState().hydrate();
    expect(useDayPlanDraftStore.getState().planMode).toBe('priority');
    expect(useDayPlanDraftStore.getState().quickMemoDraft).toBe('메모');
  });

  it('resets expired plan range to today on hydrate', () => {
    mockLoadDayPlanDraft.mockReturnValue({
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2025-05-01',
      priorityPlanDateKeyEnd: '2025-05-10',
      priorityPlanExplicitMultiDay: true,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: [],
      quickMemoDraft: '',
    });
    useDayPlanDraftStore.getState().hydrate();
    expect(useDayPlanDraftStore.getState().priorityPlanDateKey).toBe('2025-05-26');
    expect(useDayPlanDraftStore.getState().priorityPlanExplicitMultiDay).toBe(false);
  });

  it('extends end date for overnight single-day window', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityStart: '22:00',
      priorityEnd: '06:00',
    });
    useDayPlanDraftStore.getState().syncOvernightPriorityPlanDates();
    expect(useDayPlanDraftStore.getState().priorityPlanDateKeyEnd).toBe('2025-05-27');
    expect(useDayPlanDraftStore.getState().priorityOvernightEndAuto).toBe(true);
  });

  it('appends missing priority category keys', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityCategoryOrder: ['reading'],
    });
    appendPriorityCategoryKeysIfMissing(['water', 'reading']);
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).toEqual(['reading', 'water']);
  });

  it('applies explicit multi-day calendar range', () => {
    useDayPlanDraftStore.setState({ isHydrated: true });
    useDayPlanDraftStore.getState().applyPriorityPlanCalendarRange('2025-05-26', '2025-05-28');
    expect(useDayPlanDraftStore.getState().priorityPlanExplicitMultiDay).toBe(true);
    expect(useDayPlanDraftStore.getState().priorityPlanDateKeyEnd).toBe('2025-05-28');
  });

  it('rolls a past same-day window forward to today', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-05-25',
      priorityPlanDateKeyEnd: '2025-05-25',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: ['reading'],
      completedFocusCategoryKeys: ['reading'],
      isFocusStarted: true,
    });
    useDayPlanDraftStore
      .getState()
      .rollPriorityPlanForwardIfEnded({ nowKey: '2025-05-26', nowMin: 8 * 60 });
    const s = useDayPlanDraftStore.getState();
    expect(s.priorityPlanDateKey).toBe('2025-05-26');
    expect(s.priorityPlanDateKeyEnd).toBe('2025-05-26');
    expect(s.priorityCategoryOrder).toEqual([]);
    expect(s.completedFocusCategoryKeys).toEqual([]);
    expect(s.isFocusStarted).toBe(false);
  });

  it('rolls an overnight window forward and extends end to next day', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-05-25',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: true,
      priorityStart: '06:30',
      priorityEnd: '00:00',
      priorityCategoryOrder: ['reading'],
    });
    // 06:30~00:00 종료 시각(00:00)이 지난 오전 시점
    useDayPlanDraftStore
      .getState()
      .rollPriorityPlanForwardIfEnded({ nowKey: '2025-05-26', nowMin: 8 * 60 });
    const s = useDayPlanDraftStore.getState();
    expect(s.priorityPlanDateKey).toBe('2025-05-26');
    expect(s.priorityPlanDateKeyEnd).toBe('2025-05-27');
    expect(s.priorityOvernightEndAuto).toBe(true);
    expect(s.priorityCategoryOrder).toEqual([]);
  });

  it('does not roll forward while the window is still active', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: ['reading'],
    });
    useDayPlanDraftStore
      .getState()
      .rollPriorityPlanForwardIfEnded({ nowKey: '2025-05-26', nowMin: 12 * 60 });
    const s = useDayPlanDraftStore.getState();
    expect(s.priorityPlanDateKey).toBe('2025-05-26');
    expect(s.priorityCategoryOrder).toEqual(['reading']);
  });

  it('keeps a same-day window that ended earlier today (no date change)', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: ['reading'],
    });
    // 오늘 18:00 종료가 지난 20:00 — 날짜는 그대로(오늘), 담기 유지
    useDayPlanDraftStore
      .getState()
      .rollPriorityPlanForwardIfEnded({ nowKey: '2025-05-26', nowMin: 20 * 60 });
    const s = useDayPlanDraftStore.getState();
    expect(s.priorityPlanDateKey).toBe('2025-05-26');
    expect(s.priorityPlanDateKeyEnd).toBe('2025-05-26');
    expect(s.priorityCategoryOrder).toEqual(['reading']);
  });

  it('collapses overnight auto end when window becomes same-day', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-27',
      priorityOvernightEndAuto: true,
      priorityStart: '09:00',
      priorityEnd: '18:00',
    });
    useDayPlanDraftStore.getState().syncOvernightPriorityPlanDates();
    expect(useDayPlanDraftStore.getState().priorityPlanDateKeyEnd).toBe('2025-05-26');
    expect(useDayPlanDraftStore.getState().priorityOvernightEndAuto).toBe(false);
  });

  it('hydrates quick memo mode and migrates legacy monthly to priority', () => {
    mockLoadDayPlanDraft.mockReturnValue({
      planMode: 'monthly' as never,
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: [],
      quickMemoDraft: '',
    });
    useDayPlanDraftStore.getState().hydrate();
    expect(useDayPlanDraftStore.getState().planMode).toBe('priority');

    resetDraftStore();
    mockLoadDayPlanDraft.mockReturnValue({
      planMode: 'quickMemo',
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: [],
      quickMemoDraft: '잠금 메모',
    });
    useDayPlanDraftStore.getState().hydrate();
    expect(useDayPlanDraftStore.getState().planMode).toBe('quickMemo');
  });

  it('hydrates with empty draft', () => {
    mockLoadDayPlanDraft.mockReturnValue(null);
    useDayPlanDraftStore.getState().hydrate();
    expect(useDayPlanDraftStore.getState().isHydrated).toBe(true);
    expect(useDayPlanDraftStore.getState().planMode).toBe('priority');
  });

  it('toggles focus categories and filters order', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityCategoryOrder: ['reading', 'water'],
      completedFocusCategoryKeys: ['reading'],
    });
    useDayPlanDraftStore.getState().toggleFocusCategoryCompleted('reading');
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual([]);
    useDayPlanDraftStore.getState().addFocusCategoryCompleted('water');
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual(['water']);
    useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(['water']);
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual(['water']);
    useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(['water']);
    useDayPlanDraftStore.getState().clearCompletedFocusCategoryKeys();
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual([]);
  });

  it('drops completed focus keys outside priority order', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      completedFocusCategoryKeys: ['reading', 'water', 'study'],
    });
    useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(['water']);
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual(['water']);
  });

  it('keeps slot-scoped completed keys when category remains in priority order', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      completedFocusCategoryKeys: ['stretching@dinner', 'stretching@night', 'water'],
    });
    useDayPlanDraftStore.getState().filterCompletedFocusKeysToPriorityOrder(['stretching', 'water']);
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual([
      'stretching@dinner',
      'stretching@night',
      'water',
    ]);
  });

  it('migrates slot-scoped completion keys when a routine moves sections', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      completedFocusCategoryKeys: ['stretching@morning'],
      planCompletionDismissedKeys: [],
    });
    useDayPlanDraftStore.getState().migrateSectionCompletionOnSlotMove('stretching', 'morning', 'lunch');
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual(['stretching@lunch']);
  });

  it('updates priority plan date keys and water reminder epoch', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      waterReminderSyncEpoch: 1,
    });
    mockSaveDayPlanDraft.mockClear();
    useDayPlanDraftStore.getState().setPriorityPlanDateKey('2025-05-27');
    useDayPlanDraftStore.getState().setPriorityPlanDateKeyEnd('2025-05-28');
    useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
    expect(useDayPlanDraftStore.getState().priorityPlanDateKey).toBe('2025-05-27');
    expect(useDayPlanDraftStore.getState().priorityPlanDateKeyEnd).toBe('2025-05-28');
    expect(useDayPlanDraftStore.getState().waterReminderSyncEpoch).toBe(2);
    expect(mockSaveDayPlanDraft).toHaveBeenCalled();
  });

  it('persists on plan mode and priority time changes', () => {
    useDayPlanDraftStore.setState({ isHydrated: true });
    useDayPlanDraftStore.getState().setPlanMode('quickMemo');
    expect(mockSaveDayPlanDraft).toHaveBeenCalled();
    mockSaveDayPlanDraft.mockClear();
    useDayPlanDraftStore.getState().setPriorityStart('08:00');
    useDayPlanDraftStore.getState().setPriorityEnd('20:00');
    useDayPlanDraftStore.getState().setQuickMemoDraft('초안');
    expect(mockSaveDayPlanDraft).toHaveBeenCalled();
  });

  it('bumps category label epoch', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      categoryLabelEpoch: 2,
    });
    useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
    expect(useDayPlanDraftStore.getState().categoryLabelEpoch).toBe(3);
  });

  it('persists via subscribe when focus toggles', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      completedFocusCategoryKeys: [],
    });
    mockSaveDayPlanDraft.mockClear();
    useDayPlanDraftStore.getState().toggleFocusCategoryCompleted('reading');
    expect(useDayPlanDraftStore.getState().completedFocusCategoryKeys).toEqual(['reading']);
    expect(mockSaveDayPlanDraft).toHaveBeenCalled();
  });

  it('manages plan completion dismissed keys', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      planCompletionDismissedKeys: [],
    });
    useDayPlanDraftStore.getState().addPlanCompletionDismissedKey('reading');
    useDayPlanDraftStore.getState().addPlanCompletionDismissedKey('reading');
    expect(useDayPlanDraftStore.getState().planCompletionDismissedKeys).toEqual(['reading']);
    useDayPlanDraftStore.getState().clearPlanCompletionDismissedKeys();
    expect(useDayPlanDraftStore.getState().planCompletionDismissedKeys).toEqual([]);
  });

  it('updates priority category order with updater', () => {
    useDayPlanDraftStore.setState({
      isHydrated: true,
      priorityCategoryOrder: ['reading'],
    });
    useDayPlanDraftStore.getState().setPriorityCategoryOrder((prev) => [...prev, 'water']);
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).toEqual(['reading', 'water']);
  });

  it('persists focus started flag', () => {
    useDayPlanDraftStore.setState({ isHydrated: true, isFocusStarted: false });
    mockSaveDayPlanDraft.mockClear();
    useDayPlanDraftStore.getState().setIsFocusStarted(true);
    expect(useDayPlanDraftStore.getState().isFocusStarted).toBe(true);
    expect(mockSaveDayPlanDraft).toHaveBeenCalled();
  });
});
