import { loadHeroOriginalPhotoLibrary } from '../../pages/day-plan/lib/heroOriginalPhoto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fs from 'expo-file-system/legacy';
import { resolveHeroArtworkUri } from '../../pages/day-plan/lib/heroArtworkUri';
import { localStorageClient as storage, flushLocalStorageClientWrites } from '@shared/lib/storage/localStorageClient';
import { loadHeroAiLibrary } from '../../pages/day-plan/lib/heroAiLibrary';
import { dateOf, collectDate, mergeDate, type DateData, validDate } from './dateData';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const API = 'https://www.googleapis.com/drive/v3/files';
let configured = false;
function sdk() {
  if (Platform.OS === 'web') throw new Error('Google Drive 백업은 iPhone과 Android 앱에서 사용할 수 있어요.');
  // Lazy loading allows the settings screen to work in builds without the native module.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module may be absent in an older installed build
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    if (!configured) GoogleSignin.configure({ scopes: [SCOPE], iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
    configured = true;
    return GoogleSignin;
  } catch { throw new Error('Google Drive 연결 모듈을 포함해 앱을 다시 빌드해 주세요.'); }
}
export async function connectDrive() {
  if (Platform.OS === 'ios' && !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) throw new Error('Google Drive 연결을 위한 iOS OAuth 설정이 필요해요.');
  const google = sdk();
  await google.hasPlayServices();
  const result = await google.signIn();
  if (result.type !== 'success') throw new Error('Google Drive 연결을 취소했어요.');
  if (!result.data.scopes.includes(SCOPE)) {
    const added = await google.addScopes({ scopes: [SCOPE] });
    if (!added || added.type !== 'success' || !added.data.scopes.includes(SCOPE)) throw new Error('백업을 위해 Google Drive 접근을 허용해 주세요.');
  }
  return result.data.user.email;
}
export async function restoreDriveConnection(): Promise<string | null> {
  const google = sdk();
  if (!google.hasPreviousSignIn()) return null;
  const result = await google.signInSilently();
  return result.type === 'success' && result.data.scopes.includes(SCOPE) ? result.data.user.email : null;
}
export async function disconnectDrive() { await sdk().signOut(); }
export function driveEmail() { try { return sdk().getCurrentUser()?.user.email ?? null; } catch { return null; } }
async function token() {
  const google = sdk();
  if (!google.getCurrentUser()) { const result = await google.signInSilently(); if (result.type !== 'success') throw new Error('먼저 Google Drive를 연결해 주세요.'); }
  return (await google.getTokens()).accessToken;
}
async function request(url: string, init: RequestInit = {}, allowNotFound = false): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const accessToken = await token();
    const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } });
    if (response.ok) return response;
    if (allowNotFound && response.status === 404) return response;
    if (response.status === 401 && attempt === 0) { await sdk().clearCachedAccessToken(accessToken); continue; }
    throw new Error(response.status === 403 ? 'Drive 접근 권한 또는 저장 용량을 확인해 주세요.' : `Google Drive 요청에 실패했어요 (${response.status}). 다시 시도해 주세요.`);
  }
  throw new Error('Google 계정을 다시 연결해 주세요.');
}
export type DriveBackup = { id: string; name: string; createdTime: string; appProperties: { date: string; kind: string } };
export type DriveStorageQuota = { usage: number; limit: number | null };
export async function getDriveStorageQuota(): Promise<DriveStorageQuota> {
  const params = new URLSearchParams({ fields: 'storageQuota(usage,limit)' });
  const result = await (await request(`https://www.googleapis.com/drive/v3/about?${params}`)).json();
  const usage = Number(result.storageQuota?.usage);
  const limit = result.storageQuota?.limit == null ? null : Number(result.storageQuota.limit);
  if (!Number.isFinite(usage) || (limit !== null && !Number.isFinite(limit))) throw new Error('Google 계정 저장공간 정보를 읽지 못했어요.');
  return { usage, limit };
}
export async function listBackups(): Promise<DriveBackup[]> {
  const rows: DriveBackup[] = []; let pageToken = '';
  do {
    const params = new URLSearchParams({ spaces: 'appDataFolder', q: "trashed = false and appProperties has { key='kind' and value='pokit-date-v1' }", fields: 'nextPageToken,files(id,name,createdTime,appProperties)', pageSize: '100', orderBy: 'createdTime desc', ...(pageToken ? { pageToken } : {}) });
    const result = await (await request(`${API}?${params}`)).json(); rows.push(...result.files); pageToken = result.nextPageToken ?? '';
  } while (pageToken);
  return rows;
}
async function createFile(name: string, mimeType: string, date: string, kind: string) {
  return (await (await request(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType, parents: ['appDataFolder'], appProperties: { date, kind } }) })).json()).id as string;
}
const uploadUrl = (id: string) => `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`;
async function removeFile(id: string) { await request(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' }, true); }
function walk(value: unknown, replace: (s: string) => string): any {
  if (typeof value === 'string') return replace(value);
  if (Array.isArray(value)) return value.map(v => walk(v, replace));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, replace)]));
  return value;
}
type Manifest = { format: 'pokit-date'; version: 1; date: string; data: DateData; assets: { ref: string; id: string; size: number; ext: string }[] };
export async function backupDate(date: string, progress: (s: string) => void) {
  const data = collectDate(date);
  data.originals = (await loadHeroOriginalPhotoLibrary()).filter(image => dateOf(image.createdAt) === date);
  const uris = new Set<string>(); walk(data, s => { if (/^(file|content):\/\//.test(s)) uris.add(s); return s; });
  const created: string[] = []; const assets: Manifest['assets'] = []; const refs = new Map<string, string>();
  try {
    for (const uri of uris) {
      progress(`이미지 저장 중 ${assets.length + 1}/${uris.size}`);
      const local = resolveHeroArtworkUri(uri); const info = await fs.getInfoAsync(local);
      if (!info.exists || info.isDirectory) throw new Error('원본 이미지 파일이 없어 백업을 완료할 수 없어요.');
      const ext = /\.(png|jpe?g|webp|heic|mp4)$/i.exec(uri)?.[1] ?? 'bin';
      const id = await createFile(`asset-${Date.now()}-${assets.length}.${ext}`, 'application/octet-stream', date, 'pokit-asset-v1'); created.push(id);
      const uploaded = await fs.uploadAsync(uploadUrl(id), local, { httpMethod: 'PATCH', uploadType: fs.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/octet-stream' } });
      if (uploaded.status < 200 || uploaded.status >= 300) throw new Error('이미지를 Drive에 저장하지 못했어요. 다시 시도해 주세요.');
      const remote = await (await request(`${API}/${id}?fields=size`)).json();
      if (Number(remote.size) !== info.size) throw new Error('이미지 저장 크기가 일치하지 않아요.');
      const ref = `pokit-asset:${assets.length}`; refs.set(uri, ref); assets.push({ ref, id, size: info.size, ext });
    }
    const manifest: Manifest = { format: 'pokit-date', version: 1, date, data: walk(data, s => refs.get(s) ?? s), assets };
    // A file becomes discoverable only once its complete manifest has been uploaded.
    progress('백업 마무리 중');
    const id = await createFile(`YOUR-DAY-${date}-${Date.now()}.json`, 'application/json', date, 'pokit-pending-v1'); created.push(id);
    await request(uploadUrl(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manifest) });
    await request(`${API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties: { date, kind: 'pokit-date-v1' } }) });
  } catch (error) { await Promise.allSettled(created.map(removeFile)); throw error; }
}
export async function deleteDateBackup(backup: DriveBackup, progress: (s: string) => void) {
  const manifest = await (await request(`${API}/${encodeURIComponent(backup.id)}?alt=media`)).json() as Manifest;
  if (manifest.format !== 'pokit-date' || manifest.version !== 1 || manifest.date !== backup.appProperties.date || !Array.isArray(manifest.assets)) throw new Error('백업 정보가 올바르지 않아 삭제할 수 없어요.');
  const assetIds = [...new Set(manifest.assets.map(asset => asset?.id))];
  if (assetIds.some(id => typeof id !== 'string' || !/^[\w-]+$/.test(id))) throw new Error('백업 이미지 정보가 올바르지 않아 삭제할 수 없어요.');
  for (const [index, id] of assetIds.entries()) {
    progress(`백업 파일 삭제 중 ${index + 1}/${assetIds.length}`);
    await removeFile(id);
  }
  progress('백업 기록 삭제 중');
  await removeFile(backup.id);
}
export async function restoreDate(backup: DriveBackup, progress: (s: string) => void, restorePreferences = false) {
  const manifest = await (await request(`${API}/${encodeURIComponent(backup.id)}?alt=media`)).json() as Manifest;
  if (manifest.format !== 'pokit-date' || manifest.version !== 1 || !validDate(manifest.date) || manifest.date !== backup.appProperties.date || manifest.data?.date !== manifest.date || !Array.isArray(manifest.assets)) throw new Error('지원하지 않거나 손상된 백업이에요.');
  mergeDate(manifest.data); // Validate dates and permitted storage before downloading.
  if (!fs.documentDirectory) throw new Error('기기 저장소를 사용할 수 없어요.');
  const dir = `${fs.documentDirectory}drive-backups/${Date.now()}-${Math.random().toString(36).slice(2)}/`;
  await fs.makeDirectoryAsync(dir, { intermediates: true });
  const refs = new Map<string, string>();
  try {
    for (const asset of manifest.assets) {
      if (!asset || !/^pokit-asset:\d+$/.test(asset.ref) || refs.has(asset.ref) || !/^[\w-]+$/.test(asset.id) || !/^[a-z0-9]+$/i.test(asset.ext) || !Number.isSafeInteger(asset.size) || asset.size < 0) throw new Error('잘못된 이미지 정보예요.');
      progress(`이미지 가져오는 중 ${refs.size + 1}/${manifest.assets.length}`);
      const path = `${dir}restored-${Date.now()}-${Math.random().toString(36).slice(2)}-${refs.size}.${asset.ext}`;
      const result = await fs.downloadAsync(`${API}/${encodeURIComponent(asset.id)}?alt=media`, path, { headers: { Authorization: `Bearer ${await token()}` } });
      const info = await fs.getInfoAsync(path);
      if (result.status !== 200 || !info.exists || info.isDirectory || info.size !== asset.size) throw new Error('이미지 다운로드가 완료되지 않았어요. 다시 시도해 주세요.');
      refs.set(asset.ref, path);
    }
    const restored = walk(manifest.data, s => {
      if (s.startsWith('pokit-asset:')) { const path = refs.get(s); if (!path) throw new Error('백업 이미지가 누락됐어요.'); return path; }
      if (/^(file|content):\/\//.test(s)) throw new Error('백업에 원본 이미지가 누락됐어요.');
      return s;
    });
    const writes = mergeDate(restored, restorePreferences);
    if (restored.contentVersion !== 2) {
    const replacedImages = (await loadHeroAiLibrary()).filter(image => dateOf(image.createdAt) === manifest.date);
    const deleted = new Set(storage.getJson<string[]>('pokit:hero-ai-library-deleted:v1') ?? []);
    for (const image of replacedImages) { const name = image.uri.split('/').pop(); if (name) deleted.add(name); }
    for (const image of restored.gallery) { const name = image.uri?.split('/').pop(); if (name) deleted.delete(name); }
    writes['pokit:hero-ai-library-deleted:v1'] = [...deleted];
    }
    const previous = Object.fromEntries(Object.keys(writes).map(key => [key, storage.getItemRaw(key)]));
    progress('날짜별 기록 복구 중');
    // Persist rollback material before changing any records. Retained for recovery.
    const journal = `${dir}rollback.json`;
    await fs.writeAsStringAsync(journal, JSON.stringify({ date: manifest.date, previous }));
    storage.setJson('pokit:drive-restore-rollback', { date: manifest.date, previous }); await flushLocalStorageClientWrites();
    await AsyncStorage.setItem('pokit:drive-restore-pending', JSON.stringify(previous));
    try {
      for (const [key, value] of Object.entries(writes)) { if (key.startsWith('pokit:canvas-note:')) storage.setItemRaw(key, String(value)); else storage.setJson(key, value); }
      await flushLocalStorageClientWrites();
      if (Platform.OS !== 'web') {
        const persisted = await AsyncStorage.multiGet(Object.keys(writes));
        for (const [key, value] of persisted) if (value !== (key.startsWith('pokit:canvas-note:') ? String(writes[key]) : JSON.stringify(writes[key]))) throw new Error('기기 저장을 확인하지 못했어요. 이전 기록으로 되돌립니다.');
      }
      await AsyncStorage.removeItem('pokit:drive-restore-pending');
    }
    catch (error) { for (const [key, value] of Object.entries(previous)) { if (value === null) storage.removeItem(key); else storage.setItemRaw(key, value); } await flushLocalStorageClientWrites();
      await AsyncStorage.multiSet(Object.entries(previous).filter((entry): entry is [string, string] => entry[1] !== null));
      await AsyncStorage.multiRemove(Object.entries(previous).filter(([, value]) => value === null).map(([key]) => key));
      await AsyncStorage.removeItem('pokit:drive-restore-pending');
      throw error; }
  } catch (error) { await fs.deleteAsync(dir, { idempotent: true }); throw error; }
}
