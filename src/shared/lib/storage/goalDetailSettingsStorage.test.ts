import { localStorageClient } from './localStorageClient';
import {
  appendGoalDetailCommittedCategoryKeys,
  hasGoalDetailCommittedCategory,
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';
import { StorageKeys } from './storageKeys';

describe('goalDetailSettingsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  });

  it('saves and loads category config', () => {
    saveGoalDetailCategoryConfig('reading', { pages: 10 });
    expect(loadGoalDetailCategoryConfig('reading')).toEqual({ pages: 10 });
    expect(listGoalDetailCategoryConfigKeys()).toContain('reading');
  });

  it('tracks committed categories', () => {
    appendGoalDetailCommittedCategoryKeys(['reading', 'water']);
    expect(hasGoalDetailCommittedCategory('reading')).toBe(true);
    expect(hasGoalDetailCommittedCategory('study')).toBe(false);
    appendGoalDetailCommittedCategoryKeys(['reading']);
    expect(hasGoalDetailCommittedCategory('reading')).toBe(true);
  });

  it('removes category config and committed key', () => {
    saveGoalDetailCategoryConfig('reading', { pages: 5 });
    appendGoalDetailCommittedCategoryKeys(['reading']);
    removeGoalDetailCategoryConfig('reading');
    expect(loadGoalDetailCategoryConfig('reading')).toBeNull();
    expect(hasGoalDetailCommittedCategory('reading')).toBe(false);
  });

  it('saves and loads per-block config', () => {
    saveGoalDetailBlockConfig('block-1', { note: '세션 메모' });
    expect(loadGoalDetailBlockConfig('block-1')).toEqual({ note: '세션 메모' });
    expect(loadGoalDetailBlockConfig('')).toBeNull();
    expect(loadGoalDetailBlockConfig('missing')).toBeNull();
  });

  it('no-ops block save when id is empty', () => {
    saveGoalDetailBlockConfig('', { note: 'x' });
    expect(loadGoalDetailBlockConfig('')).toBeNull();
  });
});
