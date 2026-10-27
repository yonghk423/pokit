import { localStorageClient } from './localStorageClient';
import { completeHeroCardEditHint, HERO_CARD_EDIT_HINT_KEY } from './heroCardEditHintStorage';
import { completeHeroCharacterNameHint, HERO_CHARACTER_NAME_HINT_KEY, initializeHeroCharacterNameHint, isHeroCharacterNameHintPending, subscribeHeroCharacterNameHint } from './heroCharacterNameHintStorage';

beforeEach(() => {
  localStorageClient.removeItem(HERO_CHARACTER_NAME_HINT_KEY);
  localStorageClient.setItemRaw(HERO_CARD_EDIT_HINT_KEY, 'pending');
});
afterEach(() => {
  localStorageClient.removeItem(HERO_CHARACTER_NAME_HINT_KEY);
  localStorageClient.removeItem(HERO_CARD_EDIT_HINT_KEY);
});
it('preserves a new user name hint even after the separate pencil hint is completed', () => {
  initializeHeroCharacterNameHint();
  completeHeroCardEditHint();
  initializeHeroCharacterNameHint();
  expect(isHeroCharacterNameHintPending()).toBe(true);
});
it('persists completion and notifies mounted names without completing the pencil hint', () => {
  initializeHeroCharacterNameHint();
  const changed = jest.fn();
  const unsubscribe = subscribeHeroCharacterNameHint(changed);
  completeHeroCharacterNameHint();
  expect(changed).toHaveBeenCalledTimes(1);
  expect(isHeroCharacterNameHintPending()).toBe(false);
  expect(localStorageClient.getItemRaw(HERO_CARD_EDIT_HINT_KEY)).toBe('pending');
  initializeHeroCharacterNameHint();
  expect(isHeroCharacterNameHintPending()).toBe(false);
  unsubscribe();
});
it('does not opt existing installations into the first-user animation', () => {
  localStorageClient.setItemRaw(HERO_CARD_EDIT_HINT_KEY, 'done');
  initializeHeroCharacterNameHint();
  expect(isHeroCharacterNameHintPending()).toBe(false);
});
