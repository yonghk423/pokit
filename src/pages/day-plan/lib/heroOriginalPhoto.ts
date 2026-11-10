import { cleanupDeletedHeroArtwork, clearLegacyHeroImageCache } from './heroArtworkCleanup';
import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { notifyHeroAiLibraryChanged } from './heroAiLibrary';

/** Keep the selected photo beyond the image picker's temporary cache lifetime. */
export async function saveHeroOriginalPhoto(uri: string, fileName?: string | null): Promise<string> {
  if (!fs.documentDirectory) throw new Error('photo_storage_unavailable');
  const format = /\.(jpe?g|png|heic|heif|webp|gif|avif)$/i;
  const extension = (format.exec(uri.split('?')[0]) ?? format.exec(fileName ?? ''))?.[1]?.toLowerCase() ?? 'jpg';
  const folder = `${fs.documentDirectory}hero-photos/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const destination = `${folder}photo-${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${extension}`;
  await fs.copyAsync({ from: uri, to: destination });
  return destination;
}

export type OriginalPhotoEntry = { uri: string; title?: string; memo?: string; createdAt?: number };

const captionKey = (uri: string) => `pokit:original-photo-caption:${uri.split('/').pop()}`;
const deletedKey = 'pokit:original-photo-library-deleted:v1';

export function saveHeroOriginalPhotoMetadata(image: OriginalPhotoEntry) {
  localStorageClient.setJson(captionKey(image.uri), { title: image.title, memo: image.memo, createdAt: image.createdAt ?? Date.now() });
  notifyHeroAiLibraryChanged();
}

/** Hide immediately and reclaim unreferenced originals, preserving existing diary cards. */
export function deleteHeroOriginalPhotoLibraryImages(uris: readonly string[]) {
  const deleted = new Set(localStorageClient.getJson<string[]>(deletedKey) ?? []);
  uris.forEach(uri => { const name = uri.split('/').pop(); if (name) deleted.add(name); });
  localStorageClient.setJson(deletedKey, [...deleted]);
  void cleanupDeletedHeroArtwork();
  notifyHeroAiLibraryChanged();
}

/** One collection backed by durable originals, including uploads predating the gallery. */
export async function loadHeroOriginalPhotoLibrary(): Promise<OriginalPhotoEntry[]> {
  if (!fs.documentDirectory) return [];
  void cleanupDeletedHeroArtwork();
  void clearLegacyHeroImageCache();
  const folder = `${fs.documentDirectory}hero-photos/`;
  const folderExists = (await fs.getInfoAsync(folder)).exists;
  const deleted = new Set(localStorageClient.getJson<string[]>(deletedKey) ?? []);
  const names = (folderExists ? await fs.readDirectoryAsync(folder) : []).filter(name => /^photo-[a-zA-Z0-9-]+\.(jpe?g|png|heic|heif|webp|gif|avif)$/i.test(name) && !deleted.has(name));
  const diaries = localStorageClient.getJson<{ diaries?: { scenes?: { artworkUri?: string; title?: string; memo?: string }[] }[] }>('pokit:comic-diaries:v1');
  const entries: (OriginalPhotoEntry | null)[] = await Promise.all(names.map(async name => {
    const uri = folder + name;
    const info = await fs.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || info.size <= 0) return null;
    const caption = localStorageClient.getJson<Omit<OriginalPhotoEntry, 'uri'>>(captionKey(uri));
    const scenes = diaries?.diaries?.flatMap(diary => diary.scenes ?? []) ?? [];
    const existing = scenes.find(scene => scene.artworkUri?.split('/').pop() === name);
    return { uri, title: caption?.title ?? existing?.title, memo: caption?.memo ?? existing?.memo, createdAt: caption?.createdAt ?? info.modificationTime * 1000 };
  }));
  const restored = localStorageClient.getJson<OriginalPhotoEntry[]>('pokit:drive-original-gallery:v1') ?? [];
  for (const image of restored) {
    if (deleted.has(image.uri.split('/').pop() ?? '')) continue;
    const info = await fs.getInfoAsync(image.uri);
    if (info.exists && !info.isDirectory && info.size > 0 && !entries.some(entry => entry?.uri === image.uri)) {
      const caption = localStorageClient.getJson<Omit<OriginalPhotoEntry, 'uri'>>(captionKey(image.uri));
      entries.push({ ...image, ...caption });
    }
  }
  return entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.uri.localeCompare(a.uri));
}
