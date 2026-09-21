import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  dismissAllCounterPresets,
  dismissCounterPresetId,
  isCounterPresetDismissed,
  loadDismissedCounterPresetIds,
} from './counterPresetDismissStorage';

describe('counterPresetDismissStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dismissedCounterPresets);
  });

  it('tracks dismissed counter presets', () => {
    expect(loadDismissedCounterPresetIds()).toEqual([]);
    dismissCounterPresetId('pushup');
    expect(isCounterPresetDismissed('pushup')).toBe(true);
    expect(loadDismissedCounterPresetIds()).toEqual(['pushup']);
    dismissCounterPresetId('pushup');
    expect(loadDismissedCounterPresetIds()).toEqual(['pushup']);
  });

  it('dismisses all presets at once', () => {
    dismissAllCounterPresets(['pushup', 'read', 'walk']);
    expect(loadDismissedCounterPresetIds().sort()).toEqual(['pushup', 'read', 'walk'].sort());
  });
});
