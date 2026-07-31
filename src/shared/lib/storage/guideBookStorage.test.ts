import { localStorageClient } from './localStorageClient';
import { loadGuideBookSeen, markGuideBookSeen } from './guideBookStorage';
import { StorageKeys } from './storageKeys';

describe('guideBookStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.guideBook);
  });

  it('defaults to not seen', () => {
    expect(loadGuideBookSeen()).toBe(false);
  });

  it('marks seen', () => {
    markGuideBookSeen();
    expect(loadGuideBookSeen()).toBe(true);
  });
});
