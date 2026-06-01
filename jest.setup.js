const mockAsyncStorageMap = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => mockAsyncStorageMap.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      mockAsyncStorageMap.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      mockAsyncStorageMap.delete(key);
    }),
    getAllKeys: jest.fn(async () => [...mockAsyncStorageMap.keys()]),
    multiGet: jest.fn(async (keys) =>
      keys.map((key) => [key, mockAsyncStorageMap.get(key) ?? null]),
    ),
    multiSet: jest.fn(async (pairs) => {
      for (const [key, value] of pairs) {
        if (value != null) mockAsyncStorageMap.set(key, value);
      }
    }),
    multiRemove: jest.fn(async (keys) => {
      for (const key of keys) mockAsyncStorageMap.delete(key);
    }),
    clear: jest.fn(async () => {
      mockAsyncStorageMap.clear();
    }),
  },
}));
