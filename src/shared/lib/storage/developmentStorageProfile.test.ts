import { localStorageClient as client, setDevelopmentStorageProfile, getDevelopmentStorageProfile, clearPokitLocalStorage, flushLocalStorageClientWrites } from './localStorageClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

afterEach(() => { setDevelopmentStorageProfile(null); });
it('isolates reads, writes, removals and key inventories across personal and language profiles', () => {
  client.setItemRaw('pokit:profile-check', 'personal');
  setDevelopmentStorageProfile('ko');
  expect(getDevelopmentStorageProfile()).toBe('ko');
  expect(client.getItemRaw('pokit:profile-check')).toBeNull();
  client.setItemRaw('pokit:profile-check', '한국어');
  expect(client.listKeys('pokit:profile-check')).toEqual(['pokit:profile-check']);
  setDevelopmentStorageProfile('en');
  expect(client.getItemRaw('pokit:profile-check')).toBeNull();
  expect(client.listKeys('pokit:profile-check')).toEqual([]);
  client.setItemRaw('pokit:profile-check', 'English');
  setDevelopmentStorageProfile('ko');
  expect(client.getItemRaw('pokit:profile-check')).toBe('한국어');
  client.removeItem('pokit:profile-check');
  setDevelopmentStorageProfile('en');
  expect(client.getItemRaw('pokit:profile-check')).toBe('English');
  setDevelopmentStorageProfile(null);
  expect(client.getItemRaw('pokit:profile-check')).toBe('personal');
  expect(client.listKeys().some(key => key.startsWith('pokit:dev-mock:'))).toBe(false);
});
it('resetting mock data cannot erase the personal profile or another mock language', async () => {
  client.setItemRaw('pokit:reset-check', 'personal');
  setDevelopmentStorageProfile('ja'); client.setItemRaw('pokit:reset-check', '日本語');
  setDevelopmentStorageProfile('en'); client.setItemRaw('pokit:reset-check', 'English');
  await clearPokitLocalStorage();
  expect(client.getItemRaw('pokit:reset-check')).toBeNull();
  setDevelopmentStorageProfile('ja'); expect(client.getItemRaw('pokit:reset-check')).toBe('日本語');
  setDevelopmentStorageProfile(null); expect(client.getItemRaw('pokit:reset-check')).toBe('personal');
  await flushLocalStorageClientWrites();
  await expect(AsyncStorage.getItem('pokit:reset-check')).resolves.toBe('personal');
});
