import { notifyHeroAiLibraryChanged, saveHeroAiLibraryMetadata } from './heroAiLibrary';
import * as fs from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabasePublishableKey, getSupabaseUrl } from '@shared/config/supabase';
import { getYourdayAiDevelopmentHeaders } from '@shared/config/yourdayAi';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';
import type { ComicSceneId } from './heroSceneImages';

export type HeroStory = { cardAspectRatio?: number; title?: string; text: string; source: 'character' | 'photo'; styleId?: 'protagonist-1' | 'protagonist-2' | 'protagonist-3' | 'protagonist-4' | 'protagonist-5' | 'protagonist-6' };
export type HeroAiResult = { uri: string; sceneId?: ComicSceneId };
export class HeroAiError extends Error { constructor(public code: string) { super(code); } }
function config() {
  const url = getSupabaseUrl(), key = getSupabasePublishableKey();
  if (!url || !key) throw new HeroAiError('unavailable');
  return { url: `${url}/functions/v1/yourday-ai`, key };
}
async function request(path: string, body?: unknown, retry = true) {
  const { url, key } = config();
  let token: string;
  try { token = await getHeroAiAccessToken(); } catch { throw new HeroAiError('auth_unavailable'); }
  let response: Response;
  try { response = await fetch(url + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, apikey: key, ...getYourdayAiDevelopmentHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new HeroAiError('connection'); }
  if (response.status === 401 && retry) {
    const refreshed = await getHeroAiAuthClient().auth.refreshSession();
    if (refreshed.error) throw new HeroAiError('auth_unavailable');
    return request(path, body, false);
  }
  const value = await response.json();
  if (!response.ok) throw new HeroAiError(value.error ?? 'generation_failed');
  return value;
}
function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw new HeroAiError('cancelled');
}
export async function cancelHeroAiJob(id: string) {
  const pending = await getPendingHeroAiJob();
  if (pending?.id === id) await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, cancelRequested: true }));
  try { await request(`/jobs/${id}/cancel`, {}); }
  catch (error) { if (!(error instanceof HeroAiError) || error.code !== 'not_found') throw error; }
  await dismissHeroAiJob(id);
}
export async function getHeroAiRemaining(): Promise<number> { return (await request('/health')).remaining; }

async function jpeg(uri: string): Promise<string> {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  const resized = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.82, format: SaveFormat.JPEG, base64: true });
  try { if (!resized.base64) throw new HeroAiError('invalid_image'); return resized.base64; }
  finally { await fs.deleteAsync(resized.uri, { idempotent: true }).catch(() => undefined); }
}
async function artwork(id: ComicSceneId): Promise<string> {
  const { COMIC_SCENES } = await import('./heroSceneImages');
  const { Asset } = await import('expo-asset');
  const scene = COMIC_SCENES.find(item => item.id === id);
  if (!scene) throw new HeroAiError('invalid_image');
  const asset = Asset.fromModule(scene.source); await asset.downloadAsync();
  return jpeg(asset.localUri ?? asset.uri);
}
const PENDING_KEY = 'pokit:hero-ai-pending-v1';
export type PendingHeroAiJob = { cardAppearance?: { paper: string; pen: string }; cancelRequested?: boolean; story?: HeroStory; targetSceneId?: string; id: string; mode: 'face' | 'photo'; scenes: ComicSceneId[]; count: number; inputsPath: string; previewUris?: string[]; notification?: import('./heroAiNotifications').HeroAiNotification; createdAt: number; targetDiaryId?: string; characterName?: string; result?: { images: HeroAiResult[]; remaining: number; error?: string; indices?: number[] } };
type JobSnapshot = { status: string; results: { index: number; url?: string }[]; remaining: number; error?: string; pending?: number[] };
export async function getPendingHeroAiJob(): Promise<PendingHeroAiJob | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const job = JSON.parse(raw) as PendingHeroAiJob;
    return /^hero-[a-zA-Z0-9-]+$/.test(job.id) && ['face', 'photo'].includes(job.mode) && job.count >= 1 && job.count <= 3 && Array.isArray(job.scenes) && job.inputsPath.startsWith('file:') ? job : null;
  } catch { return null; }
}
export async function dismissHeroAiJob(id: string) {
  const job = await getPendingHeroAiJob();
  if (job?.id !== id) return;
  await AsyncStorage.removeItem(PENDING_KEY);
  await fs.deleteAsync(job.inputsPath, { idempotent: true }).catch(() => undefined);
}
export async function resumeHeroAiJob(job: PendingHeroAiJob, onProgress: (completed: number) => void, signal?: AbortSignal, onSubmitted?: () => void) {
  // Connection loss or app suspension must leave the server task recoverable.
  return resumeDeviceJob(job, onProgress, signal, onSubmitted);
}
async function resumeDeviceJob(job: PendingHeroAiJob, onProgress: (completed: number) => void, signal?: AbortSignal, onSubmitted?: () => void) {
  if (job.cancelRequested) { await cancelHeroAiJob(job.id); throw new HeroAiError('cancelled'); }
  checkCancellation(signal);
  // Reuse the same reservation and claim each slot at most once on the server.
  if (job.result) {
      const saved = await Promise.all(job.result.images.map(image => fs.getInfoAsync(image.uri)));
    checkCancellation(signal);
    if (saved.every(file => file.exists)) {
      onSubmitted?.();
      if (job.result.indices) {
        const confirmation = await request(`/jobs/${job.id}/saved`, { indices: job.result.indices });
        return { ...job.result, remaining: confirmation.remaining };
      }
      return job.result;
    }
  }
  let snapshot: JobSnapshot;
  try { snapshot = await request(`/jobs/${job.id}`); }
  catch (error) {
    if (!(error instanceof HeroAiError) || error.code !== 'not_found') throw error;
    try {
      const reference = job.mode === 'face' ? JSON.parse(await fs.readAsStringAsync(job.inputsPath))[0]?.reference : undefined;
      snapshot = await request('/jobs', { id: job.id, mode: job.mode, count: job.count, ...(reference ? { reference } : {}) });
    }
    catch (reservationError) {
      if (reservationError instanceof HeroAiError && ['daily_limit', 'service_limit', 'request_conflict', 'face_missing', 'face_multiple', 'face_unclear', 'content_blocked'].includes(reservationError.code)) await dismissHeroAiJob(job.id);
      throw reservationError;
    }
  }
  checkCancellation(signal);
  if (snapshot.status === 'processing' && !snapshot.pending?.length || snapshot.status === 'completed') onSubmitted?.();
  if (snapshot.pending?.length) {
      const inputs = JSON.parse(await fs.readAsStringAsync(job.inputsPath));
    checkCancellation(signal);
    try { await Promise.all(snapshot.pending.map(async (index: number) => {
      const result = await request(`/jobs/${job.id}/render/${index}`, inputs[index]);
      checkCancellation(signal);
      if (result.b64_json) await saveDirectResult(job.id, index, result);
    }));
      checkCancellation(signal);
      onSubmitted?.();
      snapshot = await request(`/jobs/${job.id}`); }
    catch (error) {
      if (error instanceof HeroAiError && error.code === 'content_blocked') await dismissHeroAiJob(job.id);
      throw error;
    }
  }
  checkCancellation(signal);
  return finishHeroAiJob(job, snapshot, onProgress, signal);
}
export async function generateHeroImages({ id, mode, photo, photos, scenes, onProgress, targetDiaryId, characterName, story, targetSceneId, signal, cardAppearance, onSubmitted }: {
  onSubmitted?: () => void; cardAppearance?: { paper: string; pen: string }; signal?: AbortSignal; story?: HeroStory; targetSceneId?: string; targetDiaryId?: string; characterName?: string; id: string; mode: 'face' | 'photo'; photo: string; photos: string[]; scenes: ComicSceneId[]; onProgress: (completed: number) => void;
}): Promise<{ images: HeroAiResult[]; remaining: number; error?: string }> {
  checkCancellation(signal);
  const count = story ? 1 : mode === 'face' ? scenes.length : photos.length;
  if (story && (!(story.text.trim() || story.title?.trim()) || story.text.length > 4000 || !['character', 'photo'].includes(story.source))) throw new HeroAiError('invalid_request');
  if (story?.source === 'character' && (mode !== 'face' || !photo.trim())) throw new HeroAiError('face_missing');
  if (count < 1 || count > 3) throw new HeroAiError('invalid_request');
  // Check the authenticated service before preparing local files. Only Generate sends photos externally.
  await request('/health');
  checkCancellation(signal);
  const reference = mode === 'face' ? await jpeg(photo) : story?.source === 'photo' ? await artwork(scenes[0]) : undefined;
  const inputs: { base: string; reference?: string; story?: HeroStory }[] = [];
  for (let i = 0; i < count; i++) inputs.push({ base: mode === 'face' || story?.source === 'character' ? await artwork(scenes[i]) : await jpeg(photos[i]), ...(reference ? { reference } : {}), ...(story ? { story } : {}) });
  checkCancellation(signal);
  if (!fs.documentDirectory) throw new HeroAiError('save_failed');
  const folder = `${fs.documentDirectory}hero-ai/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const pending: PendingHeroAiJob = { ...(cardAppearance ? { cardAppearance } : {}), story, targetSceneId, id, mode, scenes, count, previewUris: mode === 'photo' ? photos : undefined, targetDiaryId, characterName, inputsPath: `${folder}${id}-inputs.json`, createdAt: Date.now() };
  // Await disk persistence BEFORE any billable server request. Cache photo URIs can disappear on restart.
  const previous = await getPendingHeroAiJob();
  if (previous && previous.id !== id) throw new HeroAiError('pending_job');
  await fs.writeAsStringAsync(pending.inputsPath, JSON.stringify(inputs));
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  checkCancellation(signal);
  return resumeHeroAiJob(pending, onProgress, signal, onSubmitted);
}
async function finishHeroAiJob(pending: PendingHeroAiJob, job: JobSnapshot, onProgress: (completed: number) => void, signal?: AbortSignal): Promise<{ images: HeroAiResult[]; remaining: number; error?: string }> {
  const { id, mode, scenes } = pending;
  const until = Date.now() + 5 * 60 * 1000;
  checkCancellation(signal);
  while (job.status === 'processing') {
    checkCancellation(signal);
    onProgress(job.results.length);
    if (Date.now() > until) throw new HeroAiError('connection');
    await new Promise(resolve => setTimeout(resolve, 1500));
    job = await request(`/jobs/${id}`);
  }
  checkCancellation(signal);
  if (!job.results.length) { await dismissHeroAiJob(id); throw new HeroAiError(job.error ?? 'generation_failed'); }
  if (!fs.documentDirectory) throw new HeroAiError('save_failed');
  const folder = `${fs.documentDirectory}hero-ai/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const images: HeroAiResult[] = [];
  for (const result of job.results) {
    const index = result.index;
    const target = `${folder}${id}-${index}.png`;
    const existing = await fs.getInfoAsync(target);
    if (!existing.exists || !existing.size) {
      if (!result.url) throw new HeroAiError('result_unavailable');
      await downloadResult(result.url, target);
    }
    checkCancellation(signal);
    saveHeroAiLibraryMetadata(target, pending);
    images.push({ uri: target, ...(mode === 'face' ? { sceneId: scenes[index] } : {}) });
  }
  notifyHeroAiLibraryChanged();
  const result = { images, remaining: job.remaining, error: job.error, indices: job.results.map(value => value.index) };
  checkCancellation(signal);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, result }));
  const confirmation = await request(`/jobs/${id}/saved`, { indices: result.indices });
  result.remaining = confirmation.remaining;
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, result }));
  await fs.deleteAsync(pending.inputsPath, { idempotent: true }).catch(() => undefined);
  return result;
}

/** Atomic device-only save, before any result is shown or acknowledged. */
async function saveDirectResult(id: string, index: number, result: { index?: number; b64_json?: string }) {
  if (result.index !== index || typeof result.b64_json !== 'string' || result.b64_json.length > 28000000 || !result.b64_json.startsWith('iVBORw0KGgo') || !/^[A-Za-z0-9+/=]+$/.test(result.b64_json)) throw new HeroAiError('invalid_result');
  if (!fs.documentDirectory) throw new HeroAiError('save_failed');
  const folder = `${fs.documentDirectory}hero-ai/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const target = `${folder}${id}-${index}.png`, temporary = `${target}.download`;
  try {
    await fs.writeAsStringAsync(temporary, result.b64_json, { encoding: fs.EncodingType.Base64 });
    await fs.moveAsync({ from: temporary, to: target });
    notifyHeroAiLibraryChanged();
  } catch {
    await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
    throw new HeroAiError('save_failed');
  }
}

/** Download privately signed results atomically before acknowledging device save. */
async function downloadResult(url: string, target: string) {
  const origin = getSupabaseUrl();
  if (!origin || !url.startsWith(`${origin}/storage/v1/object/sign/yourday-ai-results/`)) throw new HeroAiError('invalid_result');
  const temporary = `${target}.download`;
  try {
    const response = await fs.downloadAsync(url, temporary);
    if (response.status !== 200) throw new Error('download_failed');
    const info = await fs.getInfoAsync(temporary);
    if (!info.exists || !info.size || info.size > 20971520) throw new Error('invalid_result');
    const signature = await fs.readAsStringAsync(temporary, { encoding: fs.EncodingType.Base64, position: 0, length: 8 });
    if (!signature.startsWith('iVBORw0KGgo')) throw new Error('invalid_result');
    await fs.moveAsync({ from: temporary, to: target });
    notifyHeroAiLibraryChanged();
  } catch {
    await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
    throw new HeroAiError('save_failed');
  }
}
