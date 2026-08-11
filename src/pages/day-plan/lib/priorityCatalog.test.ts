import {
  appendCustomFlowCatalogEntry,
  createCustomCatalogGroup,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
} from '@shared/lib/storage';
import { saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

import {
  buildAddablePriorityCatalogSections,
  buildPriorityCatalogRows,
  sortAddablePriorityCatalogRows,
} from './priorityCatalog';

describe('priorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
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
    const standardIdx = sorted.findIndex((row) => row.key === 'healthIntake');
    expect(userIdx).toBeGreaterThanOrEqual(0);
    expect(standardIdx).toBeGreaterThan(userIdx);
  });

  it('buildAddablePriorityCatalogSections mirrors routine tab groups and excludes set items', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:user-c', groupKey: 'health' });
    saveGoalDetailCategoryConfig('customFlow:user-c', { displayName: '건강 루틴', checklist: [] });

    const sections = buildAddablePriorityCatalogSections({
      excludedKeys: new Set(['water']),
      customFlowEntries: listAllCustomFlowCatalogEntries(),
      customGroups: listCustomCatalogGroups(),
    });

    const healthSection = sections.find((s) => s.groupKey === 'health');
    expect(healthSection?.title).toBeTruthy();
    expect(healthSection?.items.some((i) => i.key === 'customFlow:user-c')).toBe(true);
    expect(healthSection?.items.some((i) => i.key === 'water')).toBe(false);

    const productivitySection = sections.find((s) => s.groupKey === 'productivity');
    expect(productivitySection).toBeTruthy();
  });

  it('places user-created routine groups first in the add modal', () => {
    const group = createCustomCatalogGroup('주말 운동');
    expect(group).not.toBeNull();
    if (!group) return;

    appendCustomFlowCatalogEntry({
      id: 'customFlow:weekend-yoga',
      groupKey: group.key,
    });
    appendCustomFlowCatalogEntry({
      id: 'customFlow:weekend-cardio',
      groupKey: group.key,
    });
    saveGoalDetailCategoryConfig('customFlow:weekend-yoga', {
      displayName: '요가',
      checklist: [],
    });
    saveGoalDetailCategoryConfig('customFlow:weekend-cardio', {
      displayName: '카디오 & 러닝',
      checklist: [],
    });

    const sections = buildAddablePriorityCatalogSections({
      excludedKeys: new Set(),
      customFlowEntries: listAllCustomFlowCatalogEntries(),
      customGroups: listCustomCatalogGroups(),
    });

    expect(sections[0]?.title).toBe('주말 운동');
    expect(sections[0]?.items.map((item) => item.label)).toEqual([
      '요가',
      '카디오 & 러닝',
    ]);
  });

  it('dedupes catalog rows by key', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:dup', groupKey: 'productivity' });
    saveGoalDetailCategoryConfig('customFlow:dup', { displayName: '중복 테스트', checklist: [] });

    const rows = buildPriorityCatalogRows();
    const dupRows = rows.filter((row) => row.key === 'customFlow:dup');
    expect(dupRows).toHaveLength(1);
  });
});
