import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import { completeHeroCardEditHint, HERO_CARD_EDIT_HINT_KEY, initializeHeroCardEditHint, isHeroCardEditHintPending, subscribeHeroCardEditHint } from './heroCardEditHintStorage';

const keys = [HERO_CARD_EDIT_HINT_KEY, StorageKeys.welcomeIntro, StorageKeys.dayPlan, StorageKeys.appReviewPrompt,
  'pokit:comic-diaries:v1', 'pokit:service-tutorial-v2', 'pokit:tutorial-media-v1', 'pokit:comic-day:2026-10-27'];
beforeEach(() => keys.forEach(key => localStorageClient.removeItem(key)));
afterEach(() => keys.forEach(key => localStorageClient.removeItem(key)));

it('opts in a new installation and preserves eligibility after first-run defaults appear', () => {
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(true);
  localStorageClient.setJson(StorageKeys.welcomeIntro, { completed: true });
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(true);
});
it.each(keys.filter(key => key !== HERO_CARD_EDIT_HINT_KEY))('excludes existing users with saved usage at %s', key => {
  localStorageClient.setJson(key, {});
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(false);
  expect(localStorageClient.getItemRaw(HERO_CARD_EDIT_HINT_KEY)).toBe('done');
});
it('stops all mounted hints on the first edit and stays completed after initialization', () => {
  initializeHeroCardEditHint();
  const update = jest.fn();
  const unsubscribe = subscribeHeroCardEditHint(update);
  completeHeroCardEditHint();
  expect(update).toHaveBeenCalledTimes(1);
  expect(isHeroCardEditHintPending()).toBe(false);
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(false);
  unsubscribe();
  completeHeroCardEditHint();
  expect(update).toHaveBeenCalledTimes(1);
});
it('does not opt in old or invalid hint records again', () => {
  localStorageClient.setItemRaw(HERO_CARD_EDIT_HINT_KEY, 'old-value');
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(false);
});
