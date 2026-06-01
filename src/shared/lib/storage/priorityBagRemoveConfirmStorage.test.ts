import { localStorageClient } from './localStorageClient';
import {
  loadPriorityBagRemoveConfirmSkip,
  savePriorityBagRemoveConfirmSkip,
} from './priorityBagRemoveConfirmStorage';
import { StorageKeys } from './storageKeys';

describe('priorityBagRemoveConfirmStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.priorityBagRemoveConfirmSkip);
  });

  it('defaults to false', () => {
    expect(loadPriorityBagRemoveConfirmSkip()).toBe(false);
  });

  it('persists skip flag', () => {
    savePriorityBagRemoveConfirmSkip(true);
    expect(loadPriorityBagRemoveConfirmSkip()).toBe(true);
  });
});
