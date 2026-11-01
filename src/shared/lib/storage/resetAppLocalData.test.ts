import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPokitLocalStorage, flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { resetAppLocalData } from './resetAppLocalData';
import { completeHeroCardEditHint, HERO_CARD_EDIT_HINT_KEY, initializeHeroCardEditHint, isHeroCardEditHintPending, subscribeHeroCardEditHint } from './heroCardEditHintStorage';
import { StorageKeys } from './storageKeys';
import { completeHeroInfoHint, isHeroInfoHintPending, subscribeHeroInfoHint } from './heroInfoHintStorage';
import { HERO_THUMBNAIL_STRIP_KEY, isHeroThumbnailStripCollapsed, setHeroThumbnailStripCollapsed } from './heroThumbnailStripStorage';

beforeEach(async () => { await clearPokitLocalStorage(); jest.clearAllMocks(); });
afterEach(async () => { await flushLocalStorageClientWrites(); await clearPokitLocalStorage(); });

it.each([true, false])('preserves the thumbnail strip preference across data reset: collapsed=%s', async collapsed => {
  setHeroThumbnailStripCollapsed(collapsed);
  await resetAppLocalData();
  expect(isHeroThumbnailStripCollapsed()).toBe(collapsed);
  expect(await AsyncStorage.getItem(HERO_THUMBNAIL_STRIP_KEY)).toBe(collapsed ? 'collapsed' : 'expanded');
});

it('re-enables both information hints on reset and keeps their completion independent', async () => {
  completeHeroInfoHint('diary');
  expect(isHeroInfoHintPending('diary')).toBe(false);
  expect(isHeroInfoHintPending('ai')).toBe(true);
  completeHeroInfoHint('ai');
  const update = jest.fn();
  const unsubscribe = subscribeHeroInfoHint(update);
  await resetAppLocalData();
  expect(isHeroInfoHintPending('diary')).toBe(true);
  expect(isHeroInfoHintPending('ai')).toBe(true);
  expect(update).toHaveBeenCalledTimes(1);
  unsubscribe();
});

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
