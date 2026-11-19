import { restoredDiaryItems } from '../model/restoredDiaryItems';
import { highDefinitionDiaryItemIds } from '../model/diaryItemAssetRevision';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import * as fs from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { proDiaryCatalog } from '../model/proDiaryCatalog';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';

type PaperAsset = { revision: number; id: string; paper: string; edge: string; binding?: string };
const revisedItems = new Set<string>(proDiaryCatalog.map(item => item.id));
const photoWallIds = new Set<string>(proDiaryCatalog.filter(item => item.category === 'photoWall').map(item => item.id));
const assetFolder = (id: string) => restoredDiaryItems.has(id) ? 'diary-store-v6-release/' : highDefinitionDiaryItemIds.has(id) ? 'diary-store-v4/' : photoWallIds.has(id) ? 'diary-store-v5/' : 'diary-store-v2/';
const key = (id: string) => restoredDiaryItems.has(id) ? 'pokit:calendar-store:v6-release:' + id : highDefinitionDiaryItemIds.has(id) ? 'pokit:calendar-store:v4:' + id : photoWallIds.has(id) ? 'pokit:calendar-store:v5:' + id : (revisedItems.has(id) ? 'pokit:calendar-store:v2:' : 'pokit:calendar-store:v1:') + id;
export function installedPaper(id: string) {
  return localStorageClient.getJson<PaperAsset>(key(id));
}
async function requestAsset(id: string) {
  const token = await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke('calendar-store', { body: { id, format: 2 }, headers: { Authorization: 'Bearer ' + token } });
  if (error) {
    let code = 'download_unavailable';
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') code = body.error;
    } catch { /* Network failures may not include a JSON response. */ }
    throw new Error(code);
  }
  if (data?.id !== id || data.revision !== 1) throw new Error('download_unavailable');
  if (!data.files) return data;
  const entries = await Promise.all(Object.entries(data.files).map(async ([role, url]) => {
    if (typeof url !== 'string') throw new Error('invalid_asset');
    if ((revisedItems.has(id) || highDefinitionDiaryItemIds.has(id)) && Platform.OS !== 'web' && fs.documentDirectory) {
      if (!/^[a-z-]+$/.test(role)) throw new Error('invalid_asset');
      const folder = fs.documentDirectory + assetFolder(id) + id + '/';
      await fs.makeDirectoryAsync(folder, { intermediates: true });
      const destination = folder + role + '.webp';
      const temporary = destination + '.download';
      try {
        const result = await fs.downloadAsync(url, temporary);
        const info = await fs.getInfoAsync(temporary);
        const mime = Object.entries(result.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1];
        if (result.status !== 200 || !info.exists || !info.size || !mime?.startsWith('image/webp')) throw new Error('invalid_asset');
        await fs.moveAsync({ from: temporary, to: destination });
        return [role, destination];
      } finally { await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined); }
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('download_unavailable');
    const blob = await response.blob();
    if (!blob.size || blob.type.split(';')[0] !== 'image/webp') throw new Error('invalid_asset');
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('invalid_asset'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    return [role, uri];
  }));
  const images = Object.fromEntries(entries);
  return data.paper
    ? { id, revision: data.revision, paper: data.paper, edge: data.edge, binding: images.binding }
    : { id, revision: data.revision, images };
}
export async function installPaper(id: string) {
  if (installedPaper(id)) return;
  const data = await requestAsset(id);
  if (!/^#[0-9a-f]{6}$/i.test(data.paper) || !/^#[0-9a-f]{6}$/i.test(data.edge) ||
      (id === 'kraft-clip' && !data.binding?.startsWith('data:image/webp;base64,'))) {
    throw new Error('download_unavailable');
  }
  localStorageClient.setJson(key(id), data);
}

type DiaryImages = Record<string, string>;
const installed = new Map<string, DiaryImages>();
export function diaryImages(id: string) {
  const saved = installed.get(id);
  if (saved) return saved;
  const images = localStorageClient.getJson<DiaryImages>(key(id));
  if (images) installed.set(id, images);
  return images;
}
const installs = new Map<string, Promise<void>>();
export function installDiaryItem(id: string): Promise<void> {
  const pending = installs.get(id);
  if (pending) return pending;
  const job = installDiaryItemFiles(id).finally(() => installs.delete(id));
  installs.set(id, job);
  return job;
}
async function installDiaryItemFiles(id: string) {
  const cached = diaryImages(id);
  const themedBin = revisedItems.has(id) && id.endsWith('-trash');
  const names = id.startsWith('print-border-') ? ['image','tl','tr','bl','br','top','bottom','left','right'] : id.startsWith('trash-') ? ['empty', 'filled'] : themedBin ? ['image', 'filled'] : ['image'];
  const native = Platform.OS !== 'web' && !!fs.documentDirectory && (revisedItems.has(id) || highDefinitionDiaryItemIds.has(id));
  if (cached && (!themedBin || cached.filled)) {
    if (!native) return;
    const required = names;
    if (required.every(role => cached[role]?.startsWith('file://')) &&
        (await Promise.all(required.map(role => fs.getInfoAsync(cached[role])))).every(info => info.exists)) return;
    if (required.every(role => cached[role]?.startsWith('data:image/webp;base64,'))) {
      const folder = fs.documentDirectory + assetFolder(id) + id + '/';
      await fs.makeDirectoryAsync(folder, { intermediates: true });
      const migrated: DiaryImages = {};
      for (const role of required) {
        const uri = folder + role + '.webp';
        await fs.writeAsStringAsync(uri, cached[role].split(',')[1], { encoding: fs.EncodingType.Base64 });
        migrated[role] = uri;
      }
      localStorageClient.setJson(key(id), migrated);
      installed.set(id, migrated);
      return;
    }
  }
  const { images } = await requestAsset(id);
  if (!names.every(name => typeof images?.[name] === 'string' && (images[name].startsWith('data:image/webp;base64,') || (native && images[name].startsWith(fs.documentDirectory! + assetFolder(id) + id + '/'))))) throw new Error('invalid_asset');
  localStorageClient.setJson(key(id), images);
  installed.set(id, images);
  if (restoredDiaryItems.has(id) || photoWallIds.has(id) || highDefinitionDiaryItemIds.has(id)) {
    if (photoWallIds.has(id)) {
      localStorageClient.removeItem('pokit:calendar-store:v3:' + id);
      if (native) await fs.deleteAsync(fs.documentDirectory + 'diary-store-v3/' + id + '/', { idempotent: true }).catch(() => undefined);
    }
    if (highDefinitionDiaryItemIds.has(id)) localStorageClient.removeItem('pokit:calendar-store:v1:' + id);
    localStorageClient.removeItem('pokit:calendar-store:v2:' + id);
    if (native) await fs.deleteAsync(fs.documentDirectory + 'diary-store-v2/' + id + '/', { idempotent: true }).catch(() => undefined);
  }
}
export function diaryImage(id: string, name: string, fallback: number) {
  const uri = diaryImages(id)?.[name];
  return uri ? { uri } : fallback;
}

export function storeDownloadErrorMessage(error: unknown, korean = true) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'subscription_required') return translateUiText("Pro 구독 정보를 확인하지 못했어요. 구매 복원 후 다시 시도해주세요.");
  if (code === 'subscription_verification_unavailable') return translateUiText("구독 확인 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
  if (code === 'unauthorized' || code === 'auth_unavailable') return translateUiText("로그인 정보를 확인하지 못했어요. 앱을 다시 열고 시도해주세요.");
  return translateUiText("이미지를 불러오지 못했어요. 네트워크 연결을 확인하고 다시 시도해주세요.");
}
