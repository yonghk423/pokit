import { NativeModules } from 'react-native';

import { loadDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';

import { buildWidgetDayPlanPayload } from './widgetDayPlanPayload';
import { syncDayPlanToWidget, syncWidgetTimelineFromStorage } from './widgetDayPlanSync';

jest.mock('@shared/lib/storage/dayPlanDraftStorage', () => ({
  loadDayPlanDraft: jest.fn(),
}));

jest.mock('@shared/lib/storage/dayPlanStorage', () => ({
  loadDayPlan: jest.fn(() => null),
}));

describe('widgetDayPlanPayload', () => {
  beforeEach(() => {
    jest.mocked(loadDayPlanDraft).mockReturnValue(null);
  });

  it('builds priorityRoutineItems from priorityCategoryOrder with catalog icons', () => {
    jest.mocked(loadDayPlanDraft).mockReturnValue({
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: ['water'],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2026-06-28',
      priorityPlanDateKeyEnd: '2026-06-28',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '06:00',
      priorityEnd: '23:00',
      priorityCategoryOrder: ['water', 'reading', 'customFlow:builtin_hobby_photo'],
      quickMemoDraft: '',
    });

    const payload = buildWidgetDayPlanPayload({
      dateKey: '2026-06-28',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });

    expect(payload.priorityCategoryKeys).toEqual([
      'water',
      'reading',
      'customFlow:builtin_hobby_photo',
    ]);
    expect(payload.priorityRoutineItems).toEqual([
      { categoryKey: 'water', iconName: 'drop.fill', isCompleted: true },
      { categoryKey: 'reading', iconName: 'book.fill', isCompleted: false },
      {
        categoryKey: 'customFlow:builtin_hobby_photo',
        iconName: 'camera.fill',
        isCompleted: false,
      },
    ]);
  });

  it('builds priorityRoutineItems from blocks when bag list is empty', () => {
    const payload = buildWidgetDayPlanPayload({
      dateKey: '2026-06-28',
      blocks: [
        {
          id: 'b1',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 540,
          endMinutes: 600,
          order: 0,
        },
        {
          id: 'b2',
          title: '노트',
          category: '노트',
          categoryKey: 'work',
          startMinutes: 600,
          endMinutes: 660,
          order: 1,
        },
      ],
      completedBlockIds: ['b1'],
      skippedBlockIds: [],
    });

    expect(payload.priorityRoutineItems).toEqual([
      { categoryKey: 'reading', iconName: 'book.fill', isCompleted: true },
      { categoryKey: 'work', iconName: 'bag.fill', isCompleted: false },
    ]);
  });
});

describe('widgetDayPlanSync', () => {
  beforeEach(() => {
    delete (NativeModules as { PokitWidgetSync?: unknown }).PokitWidgetSync;
    jest.mocked(loadDayPlanDraft).mockReturnValue(null);
  });

  it('pushes priorityRoutineItems to native widget sync', () => {
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
      priorityCategoryOrder: ['water', 'reading'],
      quickMemoDraft: '',
    });

    syncDayPlanToWidget({
      dateKey: '2026-06-28',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });

    expect(sync).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(sync.mock.calls[0]?.[0]));
    expect(payload.priorityRoutineItems).toEqual([
      { categoryKey: 'water', iconName: 'drop.fill', isCompleted: false },
      { categoryKey: 'reading', iconName: 'book.fill', isCompleted: false },
    ]);
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
