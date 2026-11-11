import * as fs from 'expo-file-system/legacy';
import { Image } from 'react-native';

// Rebuildable previews live outside Documents/backups. Serialize decoding so
// opening a photo grid cannot decode dozens of full-resolution originals at once.
const jobs = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
const root = () => `${fs.cacheDirectory}hero-previews-v1/`;
export function photoPreview(uri: string, maxEdge = 512): Promise<string> {
  const jobKey = `${maxEdge}:${uri}`;
  const existing = jobs.get(jobKey);
  if (existing) return existing;
  const job = queue.catch(() => undefined).then(async () => {
    if (!fs.cacheDirectory) return uri;
    // Uploaded photos already have unique names and existing cached previews.
    // Restored files may share a basename across backup folders.
    const parts = uri.split('/');
    const name = parts[parts.length - 2] === 'hero-photos' ? parts[parts.length - 1] :
      encodeURIComponent(parts.slice(parts.includes('drive-backups') ? -3 : -2).join('/'));
    const cacheName = maxEdge === 512 ? name : `${encodeURIComponent(parts.slice(-4).join('/'))}-${maxEdge}`;
    const destination = `${root()}${cacheName}.webp`;
    if ((await fs.getInfoAsync(destination)).exists) return destination;
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const longest = Math.max(size.width, size.height);
    const result = await manipulateAsync(uri, longest > maxEdge ? [{ resize: size.width >= size.height ? { width: maxEdge } : { height: maxEdge } }] : [], { format: SaveFormat.WEBP, compress: 0.88 });
    try {
      await fs.makeDirectoryAsync(root(), { intermediates: true });
      await fs.moveAsync({ from: result.uri, to: destination });
      // Bound rebuildable disk storage to 32 MB, oldest previews first.
      const files = await Promise.all((await fs.readDirectoryAsync(root())).map(async file => ({ uri: root() + file, info: await fs.getInfoAsync(root() + file) })));
      let total = files.reduce((sum, file) => sum + (file.info.exists ? file.info.size : 0), 0);
      files.sort((a, b) => (a.info.exists ? a.info.modificationTime : 0) - (b.info.exists ? b.info.modificationTime : 0));
      for (const file of files) {
        if (total <= 32 * 1024 * 1024) break;
        if (file.uri === destination || !file.info.exists) continue;
        await fs.deleteAsync(file.uri, { idempotent: true });
        total -= file.info.size;
      }
      return destination;
    } finally { await fs.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined); }
  }).catch(() => uri);
  queue = job;
  jobs.set(jobKey, job);
  void job.finally(() => jobs.delete(jobKey));
  return job;
}

export async function clearHeroPhotoPreviews() {
  await queue;
  if (fs.cacheDirectory) await fs.deleteAsync(root(), { idempotent: true });
}
