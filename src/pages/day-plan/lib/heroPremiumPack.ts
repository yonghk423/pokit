import { Asset } from 'expo-asset';
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
const sceneRevision = 'detail-restoration-v6-release';
let downloading: Promise<{ id: string; uri: string }[]> | undefined;
/** Replace the existing canonical file so saved diary references also receive the restored scene. */
export function downloadPremiumPack(): Promise<{ id: string; uri: string }[]> {
  if (downloading) return downloading;
  downloading = (async () => {
    const token = await getHeroAiAccessToken();
    const { data, error } = await getHeroAiAuthClient().functions.invoke('character-pack', { body: { action: 'download' }, headers: { Authorization: 'Bearer ' + token } });
    if (error) throw error;
    const file = data?.files?.find((entry: { name: string; url: string }) => entry.name === 'p7-01.webp');
    if (!file || !file.url.startsWith('https://') || !decodeURIComponent(new URL(file.url).pathname).endsWith('/protagonist-7/card-960/p7-01.webp')) throw new Error('invalid_pack');
    const directory = folder();
    await fs.makeDirectoryAsync(directory, { intermediates: true });
    const uri = directory + 'p7-01.webp';
    const temporary = uri + '.part';
    try {
      const result = await fs.downloadAsync(file.url, temporary, { headers: { 'Cache-Control': 'no-store' } });
      const info = await fs.getInfoAsync(temporary);
      const mime = Object.entries(result.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1];
      if (result.status !== 200 || !info.exists || !info.size || !mime?.startsWith('image/webp')) throw new Error('invalid_pack');
      await fs.moveAsync({ from: temporary, to: uri });
      await fs.writeAsStringAsync(directory + 'manifest.json', JSON.stringify(['p7-01.webp']));
      await fs.writeAsStringAsync(directory + 'revision.txt', sceneRevision);
      return [{ id: 'p7-01', uri }];
    } finally { await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined); }
  })().finally(() => { downloading = undefined; });
  return downloading;
}
/** Saved diary references survive removing the pack manifest. */
export async function ensurePremiumScene(): Promise<boolean> {
  try {
    const revision = await fs.readAsStringAsync(folder() + 'revision.txt').catch(() => '');
    const info = await fs.getInfoAsync(folder() + 'p7-01.webp');
    if (revision === sceneRevision && info.exists && !info.isDirectory && info.size > 0) return true;
    return (await downloadPremiumPack()).length > 0;
  } catch { return false; }
}
export async function loadPremiumPackPreview(): Promise<Pack> {
  const asset = Asset.fromModule(require('../../../../assets/store-previews/premium-scene.webp'));
  await asset.downloadAsync();
  return { count: 1, files: [{ name: 'p7-01.webp', url: asset.localUri ?? asset.uri }] };
}
export async function loadPremiumPack(): Promise<{ id: string; uri: string }[]> {
  try {
    const manifest = JSON.parse(await fs.readAsStringAsync(folder() + 'manifest.json'));
    if (!Array.isArray(manifest) || !manifest.length || !manifest.every(name => typeof name === 'string' && /^p7-\d+\.webp$/.test(name))) return [];
    const images = await Promise.all(manifest.slice(0, 1).map(async name => { const uri = folder() + name; const info = await fs.getInfoAsync(uri); return info.exists && !info.isDirectory && info.size > 0 ? { id: name.slice(0, -5), uri } : null; }));
    if (!images.every(Boolean)) return [];
    const revision = await fs.readAsStringAsync(folder() + 'revision.txt').catch(() => '');
    return revision === sceneRevision ? images as { id: string; uri: string }[] : await downloadPremiumPack();
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
