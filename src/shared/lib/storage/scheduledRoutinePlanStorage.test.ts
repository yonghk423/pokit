import { localStorageClient } from './localStorageClient';
import {
  getScheduledCategoryKeysForDate,
  loadScheduledRoutinePlan,
  normalizeScheduledRoutinePlan,
  saveScheduledRoutinePlan,
  setScheduledCategoryKeysForDate,
} from './scheduledRoutinePlanStorage';
import { StorageKeys } from './storageKeys';

describe('scheduledRoutinePlanStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.scheduledRoutinePlan);
  });

  it('normalizes date map and drops empty assignments', () => {
    const plan = normalizeScheduledRoutinePlan({
      assignmentsByDate: {
        '2026-03-15': { categoryKeys: ['laundry', 'laundry', '  ', 'reading'] },
        bad: { categoryKeys: ['x'] },
        '2026-03-16': { categoryKeys: [] },
      },
    });
    expect(plan.assignmentsByDate).toEqual({
      '2026-03-15': { categoryKeys: ['laundry', 'reading'] },
    });
  });

  it('persists and reads keys for a date', () => {
    saveScheduledRoutinePlan({
      assignmentsByDate: {
        '2026-04-01': { categoryKeys: ['customFlow:abc'] },
      },
    });
    const loaded = loadScheduledRoutinePlan();
    expect(getScheduledCategoryKeysForDate(loaded, '2026-04-01')).toEqual(['customFlow:abc']);
    expect(getScheduledCategoryKeysForDate(loaded, '2026-04-02')).toEqual([]);
  });

  it('clears a date when keys become empty', () => {
    const next = setScheduledCategoryKeysForDate(
      { assignmentsByDate: { '2026-05-01': { categoryKeys: ['reading'] } } },
      '2026-05-01',
      [],
    );
    expect(next.assignmentsByDate['2026-05-01']).toBeUndefined();
  });
});
