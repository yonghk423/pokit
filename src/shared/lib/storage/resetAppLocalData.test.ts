import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPokitLocalStorage, flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { resetAppLocalData } from './resetAppLocalData';
import { completeHeroCardEditHint, HERO_CARD_EDIT_HINT_KEY, initializeHeroCardEditHint, isHeroCardEditHintPending, subscribeHeroCardEditHint } from './heroCardEditHintStorage';
import { StorageKeys } from './storageKeys';

beforeEach(async () => { await clearPokitLocalStorage(); jest.clearAllMocks(); });
afterEach(async () => { await flushLocalStorageClientWrites(); await clearPokitLocalStorage(); });

it('re-enables the pencil hint after reset, before defaults are restored, and persists it for restart', async () => {
  localStorageClient.setJson(StorageKeys.dayPlan, { blocks: [] });
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(false);
  const update = jest.fn();
  const unsubscribe = subscribeHeroCardEditHint(update);
  await resetAppLocalData();
  expect(isHeroCardEditHintPending()).toBe(true);
  expect(update).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(HERO_CARD_EDIT_HINT_KEY)).toBe('pending');
  // Settings recreates the day plan after the reset returns.
  localStorageClient.setJson(StorageKeys.dayPlan, { blocks: [] });
  initializeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(true);
  completeHeroCardEditHint();
  expect(isHeroCardEditHintPending()).toBe(false);
  await resetAppLocalData();
  expect(isHeroCardEditHintPending()).toBe(true);
  unsubscribe();
});
