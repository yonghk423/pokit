import * as fs from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushLocalStorageClientWrites, localStorageClient } from '@shared/lib/storage/localStorageClient';

const collections = [
  { folder: 'hero-ai', deleted: 'pokit:hero-ai-library-deleted:v1', caption: 'pokit:hero-ai-caption:', pattern: /^hero-[a-zA-Z0-9-]+-\d+\.png$/ },
  { folder: 'hero-photos', deleted: 'pokit:original-photo-library-deleted:v1', caption: 'pokit:original-photo-caption:', pattern: /^photo-[a-zA-Z0-9-]+\.(jpe?g|png|heic|heif|webp|gif|avif)$/i },
];
let queue: Promise<void> = Promise.resolve();

/** Only explicitly deleted, unreferenced artwork is eligible. Never sweep live originals. */
export function cleanupDeletedHeroArtwork(): Promise<void> {
  queue = queue.catch(() => undefined).then(async () => {
    if (!fs.documentDirectory) return;
    await flushLocalStorageClientWrites();
    // Read the durable inventory too: incomplete hydration must not erase diary artwork.
    const keys = await AsyncStorage.getAllKeys();
    const rows = await AsyncStorage.multiGet(keys);
    const references = new Map(rows);
    for (const key of localStorageClient.listKeys()) references.set(key, localStorageClient.getItemRaw(key));
    const used = (name: string) => [...references].some(([key, value]) =>
      !collections.some(collection => key === collection.deleted || key.startsWith(collection.caption)) && value?.includes(name));
    for (const collection of collections) {
      const raw = references.get(collection.deleted);
      if (!raw) continue;
      const deleted: unknown = JSON.parse(raw);
      if (!Array.isArray(deleted)) continue;
      for (const name of deleted) {
        if (typeof name !== 'string' || !collection.pattern.test(name) || used(name)) continue;
        // Check current references again after each asynchronous deletion.
        if (localStorageClient.listKeys().some(key => !collections.some(c => key === c.deleted || key.startsWith(c.caption)) && localStorageClient.getItemRaw(key)?.includes(name))) continue;
        await fs.deleteAsync(`${fs.documentDirectory}${collection.folder}/${name}`, { idempotent: true });
        localStorageClient.removeItem(collection.caption + name);
      }
    }
  }).catch(() => { /* Fail closed; retry on the next library load or diary update. */ });
  return queue;
}

let clearingCache: Promise<void> | undefined;
export function clearLegacyHeroImageCache(): Promise<void> {
  if (localStorageClient.getItemRaw('pokit:hero-image-cache-cleaned:v1') === 'true') return Promise.resolve();
  return clearingCache ??= (async () => {
    const { Image } = await import('expo-image');
    if (await Image.clearDiskCache()) localStorageClient.setItemRaw('pokit:hero-image-cache-cleaned:v1', 'true');
  })().catch(() => undefined).finally(() => { clearingCache = undefined; });
}
