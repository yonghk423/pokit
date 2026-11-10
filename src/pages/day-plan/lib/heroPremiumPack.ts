import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import * as fs from 'expo-file-system/legacy';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';

export function premiumSceneTitle(id: string): string {
  const titles: Record<string, string> = {
    'p7-01': '햇살 아래 버스 정류장',
    'p7-02': '책방에서 고르는 이야기',
    'p7-03': '기차를 기다리는 오후',
    'p7-04': '빨래를 정리하는 시간',
    'p7-05': '카페에서 잠깐의 여유',
    'p7-06': '비 오는 거리 산책',
    'p7-07': '여름밤의 축제',
    'p7-08': '꽃집 앞에서',
    'p7-09': '노을빛 바닷가',
  };
  return titles[id] ?? '일상의 한 장면';
}

export const PREMIUM_CHARACTER_ID = 'protagonist-7';
type Pack = { count: number; files: { name: string; url: string }[] };
const folder = () => { if (!fs.documentDirectory) throw new Error('storage_unavailable'); return `${fs.documentDirectory}character-packs/protagonist-7/`; };
async function requestPack(action: 'preview' | 'download'): Promise<Pack> {
  await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke('character-pack', { body: { action } });
  if (error || !data?.files?.length) throw new Error('pack_unavailable');
  if (!data.files.every((file: { name: string; url: string }) => /^p7-\d+\.webp$/.test(file.name) && file.url.startsWith('https://'))) throw new Error('invalid_pack');
  return { count: 1, files: data.files.slice(0, 1) };
}
export const loadPremiumPackPreview = () => requestPack('preview');
export async function loadPremiumPack(): Promise<{ id: string; uri: string }[]> {
  try {
    const manifest = JSON.parse(await fs.readAsStringAsync(folder() + 'manifest.json'));
    if (!Array.isArray(manifest) || !manifest.length || !manifest.every(name => typeof name === 'string' && /^p7-\d+\.webp$/.test(name))) return [];
    const images = await Promise.all(manifest.slice(0, 1).map(async name => { const uri = folder() + name; const info = await fs.getInfoAsync(uri); return info.exists && !info.isDirectory && info.size > 0 ? { id: name.slice(0, -5), uri } : null; }));
    return images.every(Boolean) ? images as { id: string; uri: string }[] : [];
  } catch { return []; }
}
let deleting = false;
/** Remove the installed pack, retaining files already used by saved diaries. */
export async function deletePremiumPack() {
  if (deleting) return;
  deleting = true;
  try {
    const library = localStorageClient.getJson<{ diaries?: { scenes?: { artworkUri?: string }[] }[] }>('pokit:comic-diaries:v1');
    const used = new Set((library?.diaries ?? []).flatMap(diary => (diary.scenes ?? []).map(scene => scene.artworkUri).filter((uri): uri is string => !!uri && uri.includes('/character-packs/protagonist-7/')).map(uri => uri.split('/').pop())));
    const directory = folder();
    const info = await fs.getInfoAsync(directory);
    if (!info.exists) return;
    const names = await fs.readDirectoryAsync(directory);
    for (const name of names) {
      if (/^p7-[0-9]+[.]webp([.]part)?$/.test(name) && !used.has(name)) await fs.deleteAsync(directory + name, { idempotent: true });
    }
    await fs.deleteAsync(directory + 'manifest.json', { idempotent: true });
  } finally { deleting = false; }
}
