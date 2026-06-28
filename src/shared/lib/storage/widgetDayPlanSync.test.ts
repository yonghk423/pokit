import { NativeModules } from 'react-native';

import { loadDayPlanDraft } from './dayPlanDraftStorage';
import {
  buildWidgetDayPlanPayload,
  syncDayPlanToWidget,
  syncWidgetTimelineFromStorage,
} from './widgetDayPlanSync';

jest.mock('./dayPlanDraftStorage', () => ({
  loadDayPlanDraft: jest.fn(),
}));

jest.mock('./dayPlanStorage', () => ({
  loadDayPlan: jest.fn(() => null),
}));

describe('widgetDayPlanSync', () => {
  beforeEach(() => {
    delete (NativeModules as { PokitWidgetSync?: unknown }).PokitWidgetSync;
    jest.mocked(loadDayPlanDraft).mockReturnValue(null);
  });

  it('includes priorityCategoryOrder in widget payload', () => {
    const sync = jest.fn();
    NativeModules.PokitWidgetSync = { syncDayPlanJson: sync };
    jest.mocked(loadDayPlanDraft).mockReturnValue({
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2026-06-28',
      priorityPlanDateKeyEnd: '2026-06-28',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '06:00',
      priorityEnd: '23:00',
      priorityCategoryOrder: ['water', 'stretching', 'reading', 'planning', 'deepwork'],
      quickMemoDraft: '',
    });

    syncDayPlanToWidget({
      dateKey: '2026-06-28',
      blocks: [{ id: '1' } as never],
      completedBlockIds: [],
      skippedBlockIds: [],
    });

    expect(sync).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(sync.mock.calls[0]?.[0]));
    expect(payload.priorityCategoryKeys).toEqual([
      'water',
      'stretching',
      'reading',
      'planning',
      'deepwork',
    ]);
    expect(payload.completedFocusCategoryKeys).toEqual([]);
    expect(payload.quickMemoDraft).toBe('');
  });

  it('buildWidgetDayPlanPayload prefers draft order over blocks', () => {
    jest.mocked(loadDayPlanDraft).mockReturnValue({
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2026-06-28',
      priorityPlanDateKeyEnd: '2026-06-28',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '06:00',
      priorityEnd: '23:00',
      priorityCategoryOrder: ['water', 'reading'],
      quickMemoDraft: '',
    });

    const payload = buildWidgetDayPlanPayload({
      dateKey: '2026-06-28',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    expect(payload.priorityCategoryKeys).toEqual(['water', 'reading']);
  });

  it('includes completed focus keys and quick memo draft', () => {
    jest.mocked(loadDayPlanDraft).mockReturnValue({
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: ['water', 'reading'],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2026-06-28',
      priorityPlanDateKeyEnd: '2026-06-28',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '06:00',
      priorityEnd: '23:00',
      priorityCategoryOrder: ['water', 'reading', 'deepwork'],
      quickMemoDraft: '오늘 할 일',
    });

    const payload = buildWidgetDayPlanPayload({
      dateKey: '2026-06-28',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    expect(payload.completedFocusCategoryKeys).toEqual(['water', 'reading']);
    expect(payload.quickMemoDraft).toBe('오늘 할 일');
  });

  it('no-ops when native module is missing', () => {
    expect(() =>
      syncDayPlanToWidget({
        dateKey: '2026-06-28',
        blocks: [],
        completedBlockIds: [],
        skippedBlockIds: [],
      }),
    ).not.toThrow();
    expect(() => syncWidgetTimelineFromStorage()).not.toThrow();
  });
});
