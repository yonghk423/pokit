import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import { loadWelcomeIntroSeen, markWelcomeIntroSeen } from './welcomeIntroStorage';

describe('welcomeIntroStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.welcomeIntro);
  });

  it('defaults to unseen', () => {
    expect(loadWelcomeIntroSeen()).toBe(false);
  });

  it('marks intro as seen', () => {
    markWelcomeIntroSeen();
    expect(loadWelcomeIntroSeen()).toBe(true);
  });
});
