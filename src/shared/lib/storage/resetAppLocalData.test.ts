import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fs from 'expo-file-system/legacy';
import { clearPokitLocalStorage, flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { resetAppLocalData } from './resetAppLocalData';
import { completeHeroCardEditHint, HERO_CARD_EDIT_HINT_KEY, initializeHeroCardEditHint, isHeroCardEditHintPending, subscribeHeroCardEditHint } from './heroCardEditHintStorage';
import { StorageKeys } from './storageKeys';
import { completeHeroInfoHint, isHeroInfoHintPending, subscribeHeroInfoHint } from './heroInfoHintStorage';
import { HERO_THUMBNAIL_STRIP_KEY, isHeroThumbnailStripCollapsed, setHeroThumbnailStripCollapsed } from './heroThumbnailStripStorage';
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///Documents/', deleteAsync: jest.fn(async () => undefined) }));

beforeEach(async () => { await clearPokitLocalStorage(); jest.clearAllMocks(); });
afterEach(async () => { await flushLocalStorageClientWrites(); await clearPokitLocalStorage(); });

it('preserves AI illustrations, captions and previous deletions while clearing diaries and pending requests', async () => {
  const preservedKeys = ['pokit:hero-ai-caption:hero-test-0.png', 'pokit:hero-ai-library-deleted:v1', 'pokit:comic-character-name:generated-illustrations'];
  for (const key of preservedKeys) localStorageClient.setJson(key, { value: 'keep' });
  localStorageClient.setJson('pokit:hero-ai-pending-v1', { value: 'clear' });
  localStorageClient.setJson('pokit:comic-diaries:v1', { diaries: [{ createdAt: 123, scenes: [{ artworkUri: 'file:///old/hero-ai/hero-old-0.png', title: '하루', memo: '추억' }, { artworkUri: 'file:///old/hero-ai/hero-test-0.png', title: 'changed' }] }] });
  await flushLocalStorageClientWrites();
  await resetAppLocalData();
  expect(fs.deleteAsync).not.toHaveBeenCalled();
  for (const key of preservedKeys) {
    expect(localStorageClient.getJson(key)).toEqual({ value: 'keep' });
    expect(JSON.parse((await AsyncStorage.getItem(key))!)).toEqual({ value: 'keep' });
  }
  expect(localStorageClient.getJson('pokit:hero-ai-caption:hero-old-0.png')).toEqual({ title: '하루', memo: '추억', createdAt: 123 });
  expect(await AsyncStorage.getItem('pokit:hero-ai-pending-v1')).toBeNull();
  expect(localStorageClient.getJson('pokit:comic-diaries:v1')).toBeNull();
});

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
