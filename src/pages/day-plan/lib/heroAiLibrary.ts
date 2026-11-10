import { cleanupDeletedHeroArtwork, clearLegacyHeroImageCache } from './heroArtworkCleanup';
import { resolveHeroArtworkUri } from './heroArtworkUri';
import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import type { PendingHeroAiJob, HeroAiResult } from './heroAiClient';

export type HeroAiLibraryImage = HeroAiResult & { title?: string; memo?: string; createdAt?: number };
const metadataKey = (uri: string) => `pokit:hero-ai-caption:${uri.split('/').pop()}`;
const deletedKey = 'pokit:hero-ai-library-deleted:v1';
/** Hide immediately, then reclaim the file when no diary or other saved record uses it. */
export function deleteHeroAiLibraryImages(uris: readonly string[]) {
  const deleted = new Set(localStorageClient.getJson<string[]>(deletedKey) ?? []);
  uris.forEach(uri => { const filename = uri.split('/').pop(); if (filename) deleted.add(filename); });
  localStorageClient.setJson(deletedKey, [...deleted]);
  void cleanupDeletedHeroArtwork();
  notifyHeroAiLibraryChanged();
}
export function saveHeroAiLibraryMetadata(uri: string, job: PendingHeroAiJob) {
  localStorageClient.setJson(metadataKey(uri), { title: job.story?.title ?? '', memo: job.story?.text ?? '', createdAt: job.createdAt });
}
function metadataFor(uri: string): Partial<HeroAiLibraryImage> {
  const saved = localStorageClient.getJson<Partial<HeroAiLibraryImage>>(metadataKey(uri));
  if (saved) return saved;
  // Older generations predate the caption index. Recover only an exact artwork
  // filename match; never borrow text from the currently selected diary/card.
  const library = localStorageClient.getJson<{ diaries?: { createdAt?: number; scenes?: { artworkUri?: string; title?: string; memo?: string }[] }[] }>('pokit:comic-diaries:v1');
  for (const diary of library?.diaries ?? []) {
    const scene = diary.scenes?.find(item => item.artworkUri?.split('/').pop() === uri.split('/').pop());
    if (scene) return { title: scene.title, memo: scene.memo, createdAt: diary.createdAt };
  }
  return {};
}

/** Finished PNGs live in Documents independently of diaries and pending requests.
 * Scan the directory so older, already removed diary scenes are recoverable too.
 * Rebuild URIs from the current Documents path (iOS container paths may change).
 */
export async function loadHeroAiLibrary(): Promise<HeroAiLibraryImage[]> {
  if (!fs.documentDirectory) return [];
  void cleanupDeletedHeroArtwork();
  void clearLegacyHeroImageCache();
  const folder = `${fs.documentDirectory}hero-ai/`;
  const restored = (localStorageClient.getJson<{ images?: HeroAiLibraryImage[] }>('pokit:drive-gallery')?.images ?? []).filter(image => !deletedRestored(image.uri)).map(image => ({ ...image, uri: resolveHeroArtworkUri(image.uri) }));
  if (!(await fs.getInfoAsync(folder)).exists) return restored;
  const deleted = new Set(localStorageClient.getJson<string[]>(deletedKey) ?? []);
  const names = (await fs.readDirectoryAsync(folder)).filter(name => /^hero-[a-zA-Z0-9-]+-\d+\.png$/.test(name) && !deleted.has(name));
  const entries = await Promise.all(names.map(async name => {
    const uri = folder + name;
    const info = await fs.getInfoAsync(uri);
    return info.exists && !info.isDirectory && info.size > 0 ? { uri, modified: info.modificationTime } : null;
  }));
  const originals = entries.filter((item): item is { uri: string; modified: number } => item !== null)
    .sort((a, b) => b.modified - a.modified || b.uri.localeCompare(a.uri)).map(({ uri, modified }) => ({ uri, createdAt: modified * 1000, ...metadataFor(uri) }));
  return [...originals, ...restored.filter(image => !originals.some(original => original.uri === image.uri))];
}

function deletedRestored(uri: string) { return (localStorageClient.getJson<string[]>(deletedKey) ?? []).includes(uri.split('/').pop() ?? ''); }

const listeners = new Set<() => void>();
export function subscribeHeroAiLibrary(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyHeroAiLibraryChanged() { listeners.forEach(listener => listener()); }
