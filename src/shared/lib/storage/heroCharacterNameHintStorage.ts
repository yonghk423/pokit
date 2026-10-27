import { localStorageClient } from './localStorageClient';
import { isHeroCardEditHintPending } from './heroCardEditHintStorage';

export const HERO_CHARACTER_NAME_HINT_KEY = 'pokit:hero-character-name-hint:v1';
const listeners = new Set<() => void>();

/** Initialize after the card hint has classified the installation, before defaults are saved. */
export function initializeHeroCharacterNameHint() {
  if (localStorageClient.getItemRaw(HERO_CHARACTER_NAME_HINT_KEY) !== null) return;
  localStorageClient.setItemRaw(HERO_CHARACTER_NAME_HINT_KEY, isHeroCardEditHintPending() ? 'pending' : 'done');
  listeners.forEach(listener => listener());
}
export const isHeroCharacterNameHintPending = () => localStorageClient.getItemRaw(HERO_CHARACTER_NAME_HINT_KEY) === 'pending';
export function subscribeHeroCharacterNameHint(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function completeHeroCharacterNameHint() {
  localStorageClient.setItemRaw(HERO_CHARACTER_NAME_HINT_KEY, 'done');
  listeners.forEach(listener => listener());
}
