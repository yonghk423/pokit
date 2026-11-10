import * as fs from 'expo-file-system/legacy';
import { Image } from 'react-native';

// Rebuildable previews live outside Documents/backups. Serialize decoding so
// opening a photo grid cannot decode dozens of full-resolution originals at once.
const jobs = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
const root = () => `${fs.cacheDirectory}hero-previews-v1/`;
export function photoPreview(uri: string): Promise<string> {
  const existing = jobs.get(uri);
  if (existing) return existing;
  const job = queue.catch(() => undefined).then(async () => {
    if (!fs.cacheDirectory) return uri;
    const name = uri.split('/').pop()!;
    const destination = `${root()}${name}.webp`;
    if ((await fs.getInfoAsync(destination)).exists) return destination;
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const longest = Math.max(size.width, size.height);
    const result = await manipulateAsync(uri, longest > 512 ? [{ resize: size.width >= size.height ? { width: 512 } : { height: 512 } }] : [], { format: SaveFormat.WEBP, compress: 0.88 });
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
  jobs.set(uri, job);
  void job.finally(() => jobs.delete(uri));
  return job;
}
