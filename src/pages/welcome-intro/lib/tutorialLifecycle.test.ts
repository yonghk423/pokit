import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { saveAppReviewPrompt } from '@shared/lib/storage/appReviewPromptStorage';
import { requestSystemAppReview } from '@shared/lib/support/requestAppReviewIfDue';
import { hasSeenTutorialIntro, markTutorialIntroSeen, requestTutorialReviewOnce } from './tutorialLifecycle';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const data = new Map<string, unknown>();
  return { localStorageClient: { getJson: (key: string) => data.get(key), setJson: (key: string, value: unknown) => data.set(key, value) }, flushLocalStorageClientWrites: jest.fn().mockResolvedValue(undefined) };
});
jest.mock('@shared/lib/support/requestAppReviewIfDue', () => ({ requestSystemAppReview: jest.fn() }));
const request = jest.mocked(requestSystemAppReview);
beforeEach(() => {
  localStorageClient.setJson('pokit:tutorial-media-v1', {});
  request.mockReset(); request.mockResolvedValue(true);
});
it('plays the intro only until it has been watched or explicitly skipped', () => {
  expect(hasSeenTutorialIntro()).toBe(false);
  markTutorialIntroSeen(); expect(hasSeenTutorialIntro()).toBe(true);
  expect(hasSeenTutorialIntro()).toBe(true);
});
it('does not request review before both tutorials are complete', async () => {
  expect(await requestTutorialReviewOnce(false)).toBe(false);
  expect(request).not.toHaveBeenCalled();
});
it('requests review once after completion and preserves the seen-video flag', async () => {
  markTutorialIntroSeen();
  expect(await requestTutorialReviewOnce(true)).toBe(true);
  expect(await requestTutorialReviewOnce(true)).toBe(false);
  expect(request).toHaveBeenCalledTimes(1); expect(hasSeenTutorialIntro()).toBe(true);
});
it('coalesces simultaneous completion events', async () => {
  let finish!: (result: boolean) => void;
  request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const first = requestTutorialReviewOnce(true); const second = requestTutorialReviewOnce(true);
  finish(true);
  expect(await first).toBe(true); expect(await second).toBe(true); expect(request).toHaveBeenCalledTimes(1);
});
it('keeps the manual review path usable when native review is unavailable', async () => {
  request.mockResolvedValue(false);
  expect(await requestTutorialReviewOnce(true)).toBe(false);
  expect(localStorageClient.getJson<{ reviewRequested?: boolean }>('pokit:tutorial-media-v1')?.reviewRequested).not.toBe(true);
});

it('requests immediately after completion even on the first day of use', async () => {
  saveAppReviewPrompt({ firstOpenedAt: new Date().toISOString() });
  expect(await requestTutorialReviewOnce(true)).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
});

it('requests again for an explicit tutorial exit despite an earlier automatic request', async () => {
  localStorageClient.setJson('pokit:tutorial-media-v1', { introSeen: true, reviewRequested: true });
  expect(await requestTutorialReviewOnce(true)).toBe(false);
  expect(await requestTutorialReviewOnce(true, { explicitEnd: true })).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  expect(hasSeenTutorialIntro()).toBe(true);
});
