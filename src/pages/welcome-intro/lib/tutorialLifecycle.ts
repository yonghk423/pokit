import { localStorageClient, flushLocalStorageClientWrites } from '@shared/lib/storage/localStorageClient';
import { loadAppReviewPrompt, saveAppReviewPrompt } from '@shared/lib/storage/appReviewPromptStorage';
import { requestSystemAppReview } from '@shared/lib/support/requestAppReviewIfDue';
const KEY = 'pokit:tutorial-media-v1';
type Flags = { introSeen?: boolean; reviewRequested?: boolean };
const flags = () => localStorageClient.getJson<Flags>(KEY) ?? {};
export function hasSeenTutorialIntro() { return flags().introSeen === true; }
export function markTutorialIntroSeen() {
  localStorageClient.setJson(KEY, { ...flags(), introSeen: true });
  void flushLocalStorageClientWrites();
}
let autoOpened = false;
/** The first-run tutorial opens automatically at most once per app session, whichever entry point gets there first. */
export function claimTutorialAutoOpen(): boolean {
  if (autoOpened) return false;
  autoOpened = true;
  return true;
}
let pendingReview: Promise<boolean> | null = null;
/** Completion asks once; explicitly ending a tutorial can request again on its ending screen. */
export function requestTutorialReviewOnce(completed: boolean, options: { explicitEnd?: boolean } = {}): Promise<boolean> {
  if (!completed || (flags().reviewRequested && !options.explicitEnd)) return Promise.resolve(false);
  if (pendingReview) return pendingReview;
  pendingReview = (async () => {
    const requested = await requestSystemAppReview();
    if (requested) {
      localStorageClient.setJson(KEY, { ...flags(), reviewRequested: true });
      const now = new Date().toISOString();
      const prior = loadAppReviewPrompt();
      saveAppReviewPrompt({ firstOpenedAt: prior?.firstOpenedAt ?? now, requestedAt: now });
      await flushLocalStorageClientWrites();
    }
    return requested;
  })().finally(() => { pendingReview = null; });
  return pendingReview;
}
