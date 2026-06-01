import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  flushLocalStorageClientWrites,
  initLocalStorageClient,
  localStorageClient,
} from './localStorageClient';

describe('localStorageClient (native memory cache)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    localStorageClient.removeItem('pokit:test-key');
    localStorageClient.removeItem('pokit:bad-json');
  });

  it('reads and writes raw values in memory', () => {
    localStorageClient.setItemRaw('pokit:test-key', 'hello');
    expect(localStorageClient.getItemRaw('pokit:test-key')).toBe('hello');
    localStorageClient.removeItem('pokit:test-key');
    expect(localStorageClient.getItemRaw('pokit:test-key')).toBeNull();
  });

  it('round-trips json and returns null for invalid json', () => {
    localStorageClient.setJson('pokit:test-key', { count: 2 });
    expect(localStorageClient.getJson<{ count: number }>('pokit:test-key')).toEqual({ count: 2 });
    localStorageClient.setItemRaw('pokit:bad-json', '{not-json');
    expect(localStorageClient.getJson('pokit:bad-json')).toBeNull();
    expect(localStorageClient.getJson('pokit:missing')).toBeNull();
  });

  it('flushes pending native writes to AsyncStorage', async () => {
    localStorageClient.setItemRaw('pokit:test-key', 'sync-me');
    await flushLocalStorageClientWrites();
    await expect(AsyncStorage.getItem('pokit:test-key')).resolves.toBe('sync-me');
  });
});

describe('initLocalStorageClient', () => {
  it('hydrates memory cache from AsyncStorage on native', async () => {
    jest.resetModules();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('pokit:boot', 'loaded');

    let mod: typeof import('./localStorageClient');
    jest.isolateModules(() => {
      mod = require('./localStorageClient');
    });
    await mod!.initLocalStorageClient();
    expect(mod!.localStorageClient.getItemRaw('pokit:boot')).toBe('loaded');
    await mod!.initLocalStorageClient();
  });

  it('marks ready immediately on web without reading AsyncStorage', async () => {
    jest.resetModules();
    let mod: typeof import('./localStorageClient');
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));
      mod = require('./localStorageClient');
    });
    await mod!.initLocalStorageClient();
    mod!.localStorageClient.setItemRaw('pokit:web-only', 'x');
    expect(mod!.localStorageClient.getItemRaw('pokit:web-only')).toBe('x');
  });
});
