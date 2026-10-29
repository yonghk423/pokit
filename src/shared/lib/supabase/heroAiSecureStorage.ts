import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Store = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
type Manifest = { revision: string; count: number };

/** Small Keychain items plus an atomic manifest keep large auth sessions readable during token rotation. */
export function createChunkedAuthStorage(secure: Store, legacy: Store, namespace: string): Store {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const prefix = (key: string) => `${namespace}.${Array.from(key).map(char => char.codePointAt(0)!.toString(16)).join('-')}`;
  const manifest = async (base: string): Promise<Manifest | null> => {
    const raw = await secure.getItem(base);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Manifest;
    if (typeof value.revision !== 'string' || !/^[a-zA-Z0-9-]+$/.test(value.revision) || !Number.isInteger(value.count) || value.count < 0 || value.count > 256) throw new Error('auth_storage_invalid');
    return value;
  };
  const cleanup = async (base: string, old: Manifest | null) => {
    if (old) await Promise.all(Array.from({ length: old.count }, (_, index) => secure.removeItem(`${base}.${old.revision}.${index}`).catch(() => undefined)));
  };
  const write = async (key: string, value: string | null) => {
    const base = prefix(key), old = await manifest(base);
    const chars = Array.from(value ?? '');
    const count = value === null ? 0 : Math.max(1, Math.ceil(chars.length / 500)); // <= 2,000 UTF-8 bytes, including non-ASCII metadata.
    if (count > 256) throw new Error('auth_storage_too_large');
    const revision = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    for (let index = 0; index < count; index++) await secure.setItem(`${base}.${revision}.${index}`, chars.slice(index * 500, (index + 1) * 500).join(''));
    // Publish only after every chunk is saved. A zero-count tombstone prevents old plaintext revival.
    await secure.setItem(base, JSON.stringify({ revision, count }));
    await legacy.removeItem(key).catch(() => undefined);
    await cleanup(base, old);
  };
  return {
    getItem: key => serial(async () => {
      const base = prefix(key), stored = await manifest(base);
      if (stored) {
        if (!stored.count) return null;
        const chunks = await Promise.all(Array.from({ length: stored.count }, (_, index) => secure.getItem(`${base}.${stored.revision}.${index}`)));
        if (chunks.some(chunk => chunk === null)) throw new Error('auth_storage_incomplete');
        await legacy.removeItem(key).catch(() => undefined);
        return chunks.join('');
      }
      const previous = await legacy.getItem(key);
      if (previous !== null) await write(key, previous);
      return previous;
    }),
    setItem: (key, value) => serial(() => write(key, value)),
    removeItem: key => serial(() => write(key, null)),
  };
}

const nativeStores = new Map<string, Store>();
export function createHeroAiAuthStorage(projectUrl: string): Store {
  if (Platform.OS === 'web') return AsyncStorage;
  const cached = nativeStores.get(projectUrl);
  if (cached) return cached;
  // Loading on first AI use also lets older native builds open the rest of the app safely.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const secure = require('expo-secure-store') as typeof import('expo-secure-store');
  const options = { keychainService: 'pokit.hero-ai-auth.v1', keychainAccessible: secure.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY, requireAuthentication: false };
  const namespace = `hero-auth-v1.${new URL(projectUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
  const storage = createChunkedAuthStorage({
    getItem: key => secure.getItemAsync(key, options),
    setItem: (key, value) => secure.setItemAsync(key, value, options),
    removeItem: key => secure.deleteItemAsync(key, options),
  }, AsyncStorage, namespace);
  nativeStores.set(projectUrl, storage);
  return storage;
}

/** Migrate an existing identity at launch, without creating an account or sending a network request. */
export async function migrateHeroAiAuthSession(projectUrl: string | null) {
  if (projectUrl && Platform.OS !== 'web') await createHeroAiAuthStorage(projectUrl).getItem('pokit:hero-ai-auth-v1');
}

