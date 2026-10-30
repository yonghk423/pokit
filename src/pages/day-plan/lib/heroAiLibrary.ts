import * as fs from 'expo-file-system/legacy';
import type { HeroAiResult } from './heroAiClient';

/** Finished PNGs live in Documents independently of diaries and pending requests.
 * Scan the directory so older, already removed diary scenes are recoverable too.
 * Rebuild URIs from the current Documents path (iOS container paths may change).
 */
export async function loadHeroAiLibrary(): Promise<HeroAiResult[]> {
  if (!fs.documentDirectory) return [];
  const folder = `${fs.documentDirectory}hero-ai/`;
  if (!(await fs.getInfoAsync(folder)).exists) return [];
  const names = (await fs.readDirectoryAsync(folder)).filter(name => /^hero-[a-zA-Z0-9-]+-\d+\.png$/.test(name));
  const entries = await Promise.all(names.map(async name => {
    const uri = folder + name;
    const info = await fs.getInfoAsync(uri);
    return info.exists && !info.isDirectory && info.size > 0 ? { uri, modified: info.modificationTime } : null;
  }));
  return entries.filter((item): item is { uri: string; modified: number } => item !== null)
    .sort((a, b) => b.modified - a.modified || b.uri.localeCompare(a.uri)).map(({ uri }) => ({ uri }));
}
