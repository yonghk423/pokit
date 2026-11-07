import * as fs from 'expo-file-system/legacy';

/** iOS can move the app container during installation; Documents contents survive. */
export function resolveHeroArtworkUri(uri: string): string {
  if (!fs.documentDirectory || !uri.startsWith('file://')) return uri;
  const photo = /\/Documents\/(hero-photos\/photo-[a-zA-Z0-9-]+\.(?:jpe?g|png|heic|heif|webp|gif|avif))$/i.exec(uri);
  if (photo) return `${fs.documentDirectory}${photo[1]}`;
  const restored = /\/Documents\/(drive-backups\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)$/.exec(uri);
  if (restored && !restored[1].split('/').some(part => part === '.' || part === '..')) return `${fs.documentDirectory}${restored[1]}`;
  const match = /\/Documents\/hero-ai\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.png)$/.exec(uri);
  return match ? `${fs.documentDirectory}hero-ai/${match[1]}` : uri;
}
