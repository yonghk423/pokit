import {
  appendCustomFlowCatalogEntry,
  listAllCustomFlowCatalogEntries,
} from '@shared/lib/storage';
import { saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

import { buildPriorityCatalogRows, sortAddablePriorityCatalogRows } from './priorityCatalog';

describe('priorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  });

  it('includes user-created customFlow from catalog storage', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:user-a', groupKey: 'productivity' });
    saveGoalDetailCategoryConfig('customFlow:user-a', { displayName: '아침 루틴', checklist: [] });

    const rows = buildPriorityCatalogRows();
    expect(rows.some((row) => row.key === 'customFlow:user-a' && row.label === '아침 루틴')).toBe(true);
  });

  it('includes config-only customFlow missing from catalog', () => {
    saveGoalDetailCategoryConfig('customFlow:legacy-only', {
      displayName: '옛 플로우',
      checklist: [],
    });

    expect(listAllCustomFlowCatalogEntries().map((e) => e.id)).toContain('customFlow:legacy-only');

    const rows = buildPriorityCatalogRows();
    expect(rows.some((row) => row.key === 'customFlow:legacy-only' && row.label === '옛 플로우')).toBe(true);
  });

  it('sorts user custom flows before standard items for add modal', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:user-b', groupKey: 'health' });
    saveGoalDetailCategoryConfig('customFlow:user-b', { displayName: '내 루틴', checklist: [] });

    const sorted = sortAddablePriorityCatalogRows(buildPriorityCatalogRows());
    const userIdx = sorted.findIndex((row) => row.key === 'customFlow:user-b');
    const standardIdx = sorted.findIndex((row) => row.key === 'water');
    expect(userIdx).toBeGreaterThanOrEqual(0);
    expect(standardIdx).toBeGreaterThan(userIdx);
  });
});
