import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export const HERO_CARD_EDIT_HINT_KEY = 'pokit:hero-card-edit-hint:v1';
const listeners = new Set<() => void>();

/** Run after storage hydration and before first-run defaults are saved. */
export function initializeHeroCardEditHint() {
  if (localStorageClient.getItemRaw(HERO_CARD_EDIT_HINT_KEY) !== null) return;
  const existingUser = [
    StorageKeys.welcomeIntro, StorageKeys.dayPlan, StorageKeys.appReviewPrompt,
    'pokit:comic-diaries:v1', 'pokit:service-tutorial-v2', 'pokit:tutorial-media-v1',
  ].some(key => localStorageClient.getItemRaw(key) !== null)
    || localStorageClient.listKeys('pokit:comic-day:').length > 0;
  localStorageClient.setItemRaw(HERO_CARD_EDIT_HINT_KEY, existingUser ? 'done' : 'pending');
  listeners.forEach(listener => listener());
}
export const isHeroCardEditHintPending = () => localStorageClient.getItemRaw(HERO_CARD_EDIT_HINT_KEY) === 'pending';
export function subscribeHeroCardEditHint(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function completeHeroCardEditHint() {
  localStorageClient.setItemRaw(HERO_CARD_EDIT_HINT_KEY, 'done');
  listeners.forEach(listener => listener());
}
