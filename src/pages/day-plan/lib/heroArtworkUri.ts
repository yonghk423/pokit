import * as fs from 'expo-file-system/legacy';

/** iOS can move the app container during installation; Documents contents survive. */
export function resolveHeroArtworkUri(uri: string): string {
  if (!fs.documentDirectory || !uri.startsWith('file://')) return uri;
  const match = /\/Documents\/hero-ai\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.png)$/.exec(uri);
  return match ? `${fs.documentDirectory}hero-ai/${match[1]}` : uri;
}
