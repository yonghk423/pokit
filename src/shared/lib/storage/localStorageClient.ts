type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

// React Native/웹 혼합 환경에서 `localStorage`가 없을 수 있어 안전하게 폴백합니다.
// - native: 아직은 메모리 폴백(향후 AsyncStorage 연동 가능)
// - web: 실제 localStorage 사용
const memoryStorage = new Map<string, string>();

function getStorage(): StorageLike {
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

  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
}

const storage = getStorage();

export const localStorageClient = {
  getItemRaw(key: string): string | null {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },

  setItemRaw(key: string, value: string): void {
    try {
      storage.setItem(key, value);
    } catch {
      // ignore
    }
  },

  removeItem(key: string): void {
    try {
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

