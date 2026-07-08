import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { migrateLegacyStorageKeys } from './migrateLegacyStorageKeys';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStorage = new Map<string, string>();
const isWeb = Platform.OS === 'web';
let nativeCacheReady = false;
let nativeInitPromise: Promise<void> | null = null;
const pendingNativeWrites = new Set<Promise<void>>();
/** 초기화 이후 늦게 끝나는 쓰기가 디스크를 덮어쓰지 않도록 세대를 올린다. */
let storageResetGeneration = 0;

function isPokitStorageKey(key: string): boolean {
  return key.startsWith('pokit:') || key.startsWith('lockflow:');
}

function scheduleNativeSetItem(key: string, value: string): void {
  const generationAtWrite = storageResetGeneration;
  const task = AsyncStorage.setItem(key, value)
    .then(async () => {
      if (generationAtWrite !== storageResetGeneration) {
        await AsyncStorage.removeItem(key).catch(() => undefined);
      }
    })
    .catch(() => undefined);
  trackNativeWrite(task);
}

function scheduleNativeRemoveItem(key: string): void {
  const task = AsyncStorage.removeItem(key).catch(() => undefined);
  trackNativeWrite(task);
}

/** 메모리·디스크의 pokit/lockflow 키를 비우고, 이후 완료되는 이전 쓰기를 무효화한다. */
export async function clearPokitLocalStorage(): Promise<void> {
  storageResetGeneration += 1;

  let diskKeysToClear: string[] = [];
  if (!storage) {
    try {
      const diskKeys = await AsyncStorage.getAllKeys();
      diskKeysToClear = diskKeys.filter(isPokitStorageKey);
    } catch {
      diskKeysToClear = [];
    }
  }

  const memoryKeys = [...memoryStorage.keys()].filter(isPokitStorageKey);
  const allKeys = new Set([...memoryKeys, ...diskKeysToClear]);
  for (const key of allKeys) {
    memoryStorage.delete(key);
    storage?.removeItem(key);
  }

  if (!storage && diskKeysToClear.length > 0) {
    try {
      await AsyncStorage.multiRemove([...allKeys]);
    } catch {
      // ignore
    }
  }
}

function trackNativeWrite(promise: Promise<void>): void {
  pendingNativeWrites.add(promise);
  promise.finally(() => {
    pendingNativeWrites.delete(promise);
  });
}

function getBrowserStorage(): StorageLike | null {
  const maybeLocalStorage = (globalThis as unknown as { localStorage?: unknown }).localStorage;
  const casted = maybeLocalStorage as Partial<StorageLike> | null | undefined;
  if (
    casted &&
    typeof casted.getItem === 'function' &&
    typeof casted.setItem === 'function' &&
    typeof casted.removeItem === 'function'
  ) {
    return casted as StorageLike;
  }
  return null;
}

const browserStorage = getBrowserStorage();
const storage = browserStorage;

export async function initLocalStorageClient(): Promise<void> {
  if (isWeb || storage) {
    nativeCacheReady = true;
    return;
  }
  if (nativeCacheReady) return;
  if (nativeInitPromise) return nativeInitPromise;

  nativeInitPromise = (async () => {
    try {
      await migrateLegacyStorageKeys();
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        const rows = await AsyncStorage.multiGet(keys);
        for (const [key, value] of rows) {
          if (typeof value === 'string') {
            memoryStorage.set(key, value);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      nativeCacheReady = true;
      nativeInitPromise = null;
    }
  })();

  return nativeInitPromise;
}

export async function flushLocalStorageClientWrites(): Promise<void> {
  if (pendingNativeWrites.size === 0) return;
  await Promise.allSettled([...pendingNativeWrites]);
}

export const localStorageClient = {
  getItemRaw(key: string): string | null {
    try {
      if (!storage) {
        return memoryStorage.get(key) ?? null;
      }
      return storage.getItem(key);
    } catch {
      return null;
    }
  },

  setItemRaw(key: string, value: string): void {
    try {
      if (!storage) {
        memoryStorage.set(key, value);
        if (!isWeb) {
          scheduleNativeSetItem(key, value);
        }
        return;
      }
      storage.setItem(key, value);
    } catch {
      // ignore
    }
  },

  removeItem(key: string): void {
    try {
      if (!storage) {
        memoryStorage.delete(key);
        if (!isWeb) {
          scheduleNativeRemoveItem(key);
        }
        return;
      }
      storage.removeItem(key);
    } catch {
      // ignore
    }
  },

  getJson<T>(key: string): T | null {
    const raw = localStorageClient.getItemRaw(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJson<T>(key: string, value: T): void {
    try {
      localStorageClient.setItemRaw(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
};

