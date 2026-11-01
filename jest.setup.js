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

// Native video playback is exercised through its public player lifecycle in JS tests.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VideoView: View,
    useVideoPlayer: (source, setup) => {
      const player = React.useMemo(() => {
        const listeners = new Map();
        const value = {
          source, currentTime: 0, status: 'readyToPlay',
          replay: jest.fn(() => { value.currentTime = 0; value.play(); }),
          play: jest.fn(() => listeners.get('playingChange')?.({ isPlaying: true })),
          pause: jest.fn(() => listeners.get('playingChange')?.({ isPlaying: false })),
          replaceAsync: jest.fn(async () => undefined), release: jest.fn(),
          addListener: jest.fn((name, handler) => { listeners.set(name, handler); return { remove: () => listeners.delete(name) }; }),
        };
        setup?.(value);
        return value;
      }, [source]);
      React.useEffect(() => () => player.release(), [player]);
      return player;
    },
  };
});
