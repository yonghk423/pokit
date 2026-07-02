import { localStorageClient } from './localStorageClient';
import { loadDayPlanDraft, saveDayPlanDraft } from './dayPlanDraftStorage';
import { StorageKeys } from './storageKeys';

describe('dayPlanDraftStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
  });

  it('returns null when draft is missing', () => {
    expect(loadDayPlanDraft()).toBeNull();
  });

  it('persists draft payload', () => {
    const draft = {
      planMode: 'priority' as const,
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: '2025-05-26',
      priorityPlanDateKeyEnd: '2025-05-26',
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '09:00',
      priorityEnd: '18:00',
      priorityCategoryOrder: ['reading'],
      quickMemoDraft: '',
    };
    saveDayPlanDraft(draft);
    expect(loadDayPlanDraft()).toEqual(draft);
  });
});
