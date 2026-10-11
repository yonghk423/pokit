import { localStorageClient } from './localStorageClient';
import { loadAppReviewPrompt, saveAppReviewPrompt } from './appReviewPromptStorage';
import { StorageKeys } from './storageKeys';

describe('appReviewPromptStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.appReviewPrompt);
  });

  it('round-trips the first open and the request time', () => {
    saveAppReviewPrompt({
      firstOpenedAt: '2026-10-10T00:00:00.000Z',
      requestedAt: '2026-10-11T00:00:00.000Z',
    });
    expect(loadAppReviewPrompt()).toEqual({
      firstOpenedAt: '2026-10-10T00:00:00.000Z',
      requestedAt: '2026-10-11T00:00:00.000Z',
    });
  });

  it('drops a row that has no usable first-open time', () => {
    localStorageClient.setJson(StorageKeys.appReviewPrompt, { v: 1, firstOpenedAt: 'soon' });
    expect(loadAppReviewPrompt()).toBeNull();
  });
});
