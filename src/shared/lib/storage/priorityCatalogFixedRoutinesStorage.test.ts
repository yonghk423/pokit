import { localStorageClient } from './localStorageClient';
import * as fixedFlowSetsStorage from './fixedFlowSetsStorage';
import { loadFixedFlowSetsState } from './fixedFlowSetsStorage';
import {
  loadPriorityCatalogFixedRoutineKeys,
  savePriorityCatalogFixedRoutineKeys,
} from './priorityCatalogFixedRoutinesStorage';
import { StorageKeys } from './storageKeys';

describe('priorityCatalogFixedRoutinesStorage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
  });

  it('saves and loads active fixed routine keys', () => {
    savePriorityCatalogFixedRoutineKeys(['reading', 'water', 'reading']);
    expect(loadPriorityCatalogFixedRoutineKeys()).toEqual(['reading', 'water']);
  });

  it('migrates legacy categoryKeys when fixed flow sets are empty', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['study', 'planning'],
    });
    expect(loadPriorityCatalogFixedRoutineKeys()).toEqual(['study', 'planning']);
    expect(loadFixedFlowSetsState().sets[0]?.items.map((x) => x.categoryKey)).toEqual([
      'study',
      'planning',
    ]);
  });

  it('normalizes invalid legacy keys on migrate', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['', '  ', 'reading', 'reading', 42, null],
    });
    expect(loadPriorityCatalogFixedRoutineKeys()).toEqual(['reading']);
  });

  it('skips legacy migration when normalized keys are empty', () => {
    const loadMock = jest
      .spyOn(fixedFlowSetsStorage, 'loadFixedFlowSetsState')
      .mockReturnValueOnce({ activeSetId: null, sets: [] });
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: [null, '', '   '],
    });
    loadPriorityCatalogFixedRoutineKeys();
    expect(loadMock).toHaveBeenCalled();
    loadMock.mockRestore();
  });

  it('migrates legacy keys through ensureMigratedFromLegacy', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['study', 'planning'],
    });
    const loadMock = jest
      .spyOn(fixedFlowSetsStorage, 'loadFixedFlowSetsState')
      .mockReturnValueOnce({ activeSetId: null, sets: [] });
    const saveMock = jest.spyOn(fixedFlowSetsStorage, 'saveFixedFlowSetsState');
    loadPriorityCatalogFixedRoutineKeys();
    expect(saveMock).toHaveBeenCalledWith({
      activeSetId: 'default',
      sets: [
        {
          id: 'default',
          name: '기본 세트',
          items: [
            { categoryKey: 'study', enabled: true },
            { categoryKey: 'planning', enabled: true },
          ],
        },
      ],
    });
    loadMock.mockRestore();
    saveMock.mockRestore();
  });

  it('appends active set when saved id is missing from sets', () => {
    jest.spyOn(fixedFlowSetsStorage, 'loadFixedFlowSetsState').mockReturnValue({
      activeSetId: 'orphan',
      sets: [{ id: 'set_a', name: '주중', items: [{ categoryKey: 'reading', enabled: true }] }],
    });
    const saveSpy = jest.spyOn(fixedFlowSetsStorage, 'saveFixedFlowSetsState');
    savePriorityCatalogFixedRoutineKeys(['water', '']);
    expect(saveSpy).toHaveBeenCalledWith({
      activeSetId: 'orphan',
      sets: [
        { id: 'set_a', name: '주중', items: [{ categoryKey: 'reading', enabled: true }] },
        {
          id: 'orphan',
          name: '기본 세트',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
    });
  });

  it('updates existing active set name when saving keys', () => {
    localStorageClient.setJson(StorageKeys.fixedFlowSets, {
      activeSetId: 'set_a',
      sets: [{ id: 'set_a', name: '주중', items: [{ categoryKey: 'reading', enabled: true }] }],
    });
    savePriorityCatalogFixedRoutineKeys(['water']);
    const active = loadFixedFlowSetsState().sets.find((s) => s.id === 'set_a');
    expect(active?.name).toBe('주중');
    expect(active?.items.map((x) => x.categoryKey)).toEqual(['water']);
  });
});
