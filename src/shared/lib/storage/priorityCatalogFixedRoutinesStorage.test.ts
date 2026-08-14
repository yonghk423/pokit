import * as fixedFlowSetsStorage from './fixedFlowSetsStorage';
import { loadFixedFlowSetsState } from './fixedFlowSetsStorage';
import { localStorageClient } from './localStorageClient';
import {
  appendRoutineCatalogSelectionKeys,
  loadPriorityCatalogFixedRoutineKeys,
  loadRoutineCatalogSelectionKeys,
  removeRoutineCatalogSelectionKey,
  savePriorityCatalogFixedRoutineKeys,
} from './priorityCatalogFixedRoutinesStorage';
import { StorageKeys } from './storageKeys';

describe('priorityCatalogFixedRoutinesStorage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
  });

  it('appends routine catalog selection keys without duplicates', () => {
    appendRoutineCatalogSelectionKeys(['reading']);
    appendRoutineCatalogSelectionKeys(['work', 'reading']);
    expect(loadRoutineCatalogSelectionKeys()).toEqual(['reading', 'work']);
  });

  it('does not treat legacy fixed-routine keys as manual today selections', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['reading', 'work'],
    });

    expect(loadRoutineCatalogSelectionKeys()).toEqual([]);
  });

  it('removes a routine catalog selection key', () => {
    appendRoutineCatalogSelectionKeys(['reading', 'work']);
    removeRoutineCatalogSelectionKey('reading');
    expect(loadRoutineCatalogSelectionKeys()).toEqual(['work']);
  });

  it('saves and loads active fixed routine keys', () => {
    savePriorityCatalogFixedRoutineKeys(['reading', 'water', 'reading']);
    const keys = loadPriorityCatalogFixedRoutineKeys();
    expect(keys).toContain('reading');
    expect(keys).toContain('water');
  });

  it('migrates legacy categoryKeys when fixed flow sets are empty', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['study', 'planning'],
    });
    const keys = loadPriorityCatalogFixedRoutineKeys();
    expect(keys).toContain('study');
    expect(keys).toContain('planning');
    const migratedManualSet = loadFixedFlowSetsState().sets.find((set) => set.id === 'default');
    expect(migratedManualSet?.items.map((x) => x.categoryKey)).toEqual([
      'study',
      'planning',
    ]);
  });

  it('normalizes invalid legacy keys on migrate', () => {
    localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
      categoryKeys: ['', '  ', 'reading', 'reading', 42, null],
    });
    expect(loadPriorityCatalogFixedRoutineKeys()).toContain('reading');
  });

  it('skips legacy migration when normalized keys are empty', () => {
    const loadMock = jest
      .spyOn(fixedFlowSetsStorage, 'loadFixedFlowSetsState')
      .mockReturnValueOnce({ activeSetIds: [], sets: [] });
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
      .mockReturnValueOnce({ activeSetIds: [], sets: [] });
    const saveMock = jest.spyOn(fixedFlowSetsStorage, 'saveFixedFlowSetsState');
    loadPriorityCatalogFixedRoutineKeys();
    expect(saveMock).toHaveBeenCalledWith({
      activeSetIds: ['default'],
      sets: [
        {
          id: 'default',
          name: '예시 세트',
          applyRule: 'manual',
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
      activeSetIds: ['orphan'],
      sets: [{ id: 'set_a', name: '주중', applyRule: 'manual', items: [{ categoryKey: 'reading', enabled: true }] }],
    });
    const saveSpy = jest.spyOn(fixedFlowSetsStorage, 'saveFixedFlowSetsState');
    savePriorityCatalogFixedRoutineKeys(['water', '']);
    expect(saveSpy).toHaveBeenCalledWith({
      activeSetIds: ['orphan'],
      sets: [
        { id: 'set_a', name: '주중', applyRule: 'manual', items: [{ categoryKey: 'water', enabled: true }] },
      ],
    });
  });

  it('updates existing active set name when saving keys', () => {
    localStorageClient.setJson(StorageKeys.fixedFlowSets, {
      activeSetIds: ['set_a'],
      sets: [{ id: 'set_a', name: '주중', applyRule: 'manual', items: [{ categoryKey: 'reading', enabled: true }] }],
    });
    savePriorityCatalogFixedRoutineKeys(['water']);
    const active = loadFixedFlowSetsState().sets.find((s) => s.id === 'set_a');
    expect(active?.name).toBe('주중');
    expect(active?.items.map((x) => x.categoryKey)).toEqual(['water']);
  });

  it('preserves multiple active set ids when saving keys', () => {
    jest.spyOn(fixedFlowSetsStorage, 'loadFixedFlowSetsState').mockReturnValue({
      activeSetIds: ['set_a', 'set_b'],
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual', items: [{ categoryKey: 'reading', enabled: true }] },
        { id: 'set_b', name: 'B', applyRule: 'manual', items: [{ categoryKey: 'water', enabled: true }] },
      ],
    });
    const saveSpy = jest.spyOn(fixedFlowSetsStorage, 'saveFixedFlowSetsState');
    savePriorityCatalogFixedRoutineKeys(['water']);
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSetIds: ['set_a', 'set_b'],
      }),
    );
  });
});
