import { LogBox } from 'react-native';

// expo-notifications reads push-server registration from the Keychain on import.
// POKIT never registers a push server, so a Keychain entitlement failure here is harmless.
const IGNORED_ERROR_PATTERNS = ['[expo-notifications] Error reading persisted server registration info'];

const isIgnored = (args: unknown[]) =>
  typeof args[0] === 'string' && IGNORED_ERROR_PATTERNS.some((pattern) => (args[0] as string).includes(pattern));

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (isIgnored(args)) return;
  originalConsoleError(...args);
};

LogBox.ignoreLogs(IGNORED_ERROR_PATTERNS);
