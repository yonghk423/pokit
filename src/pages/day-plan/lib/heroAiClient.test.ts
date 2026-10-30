import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fs from 'expo-file-system/legacy';
import { cancelHeroAiJob, dismissHeroAiJob, getPendingHeroAiJob, resumeHeroAiJob, type PendingHeroAiJob } from './heroAiClient';

jest.mock('@shared/config/supabase', () => ({ getSupabaseUrl: () => 'https://example.supabase.co', getSupabasePublishableKey: () => 'public' }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({ getHeroAiAccessToken: async () => 'session' }));
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', getInfoAsync: jest.fn(async () => ({ exists: false })), makeDirectoryAsync: jest.fn(), readAsStringAsync: jest.fn(), downloadAsync: jest.fn(async () => ({ status: 200 })), moveAsync: jest.fn(), deleteAsync: jest.fn(async () => undefined) }));
const key = 'pokit:hero-ai-pending-v1';
const job: PendingHeroAiJob = { id: 'hero-restarted-123', mode: 'face', scenes: ['05-work'], count: 1, inputsPath: 'file:///documents/inputs.json', createdAt: Date.now() };
const result = { index: 0, url: 'https://example.supabase.co/storage/v1/object/sign/hero-ai-results/one.png' };
const originalFetch = global.fetch;
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });
function reply(value: unknown, status = 200) { return { ok: status < 400, status, json: async () => value } as Response; }

it('restores a completed server job by GET without submitting another paid generation', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  jest.mocked(global.fetch).mockResolvedValue(reply({ status: 'completed', results: [result], remaining: 2 }));
  const restored = await getPendingHeroAiJob();
  const completed = await resumeHeroAiJob(restored!, jest.fn());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(jest.mocked(global.fetch).mock.calls[0][1]?.method).toBe('GET');
  expect(completed.images[0].sceneId).toBe('05-work');
  expect(fs.downloadAsync).toHaveBeenCalledWith(result.url, expect.stringContaining('.download'));
  expect(fs.moveAsync).toHaveBeenCalled();
  expect((await getPendingHeroAiJob())?.result?.images).toEqual(completed.images);
});

it('keeps the request recoverable if downloading fails and never commits a partial file', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  jest.mocked(global.fetch).mockResolvedValue(reply({ status: 'completed', results: [result], remaining: 2 }));
  jest.mocked(fs.downloadAsync).mockRejectedValueOnce(new Error('offline'));
  await expect(resumeHeroAiJob(job, jest.fn())).rejects.toThrow('offline');
  expect((await getPendingHeroAiJob())?.id).toBe(job.id);
  expect(fs.moveAsync).not.toHaveBeenCalled();
});

it('can show already downloaded results after server retention expires without any network call', async () => {
  const saved = { images: [{ uri: 'file:///documents/ready.png' }], remaining: 2 };
  jest.mocked(fs.getInfoAsync).mockResolvedValueOnce({ exists: true, uri: saved.images[0].uri, isDirectory: false, size: 100, modificationTime: 1 });
  await expect(resumeHeroAiJob({ ...job, result: saved }, jest.fn())).resolves.toEqual(saved);
  expect(global.fetch).not.toHaveBeenCalled();
});

it('only clears the matching job and its temporary input, preserving finished illustrations', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  await dismissHeroAiJob('hero-other');
  expect(await getPendingHeroAiJob()).not.toBeNull();
  await dismissHeroAiJob(job.id);
  expect(await getPendingHeroAiJob()).toBeNull();
  expect(fs.deleteAsync).toHaveBeenCalledWith(job.inputsPath, { idempotent: true });
});

it('only uploads unclaimed slots after interruption, keeping the original request ID', async () => {
  const pending = { ...job, count: 2, scenes: ['05-work', '01-exercise'] as PendingHeroAiJob['scenes'] };
  jest.mocked(fs.readAsStringAsync).mockResolvedValueOnce(JSON.stringify([{ base: 'first' }, { base: 'second' }]));
  jest.mocked(global.fetch)
    .mockResolvedValueOnce(reply({ status: 'processing', pending: [1], results: [], remaining: 1 }))
    .mockResolvedValueOnce(reply({ accepted: true }, 202))
    .mockResolvedValueOnce(reply({ status: 'completed', results: [{ ...result, index: 1 }], remaining: 1 }));
  const completed = await resumeHeroAiJob(pending, jest.fn());
  const posts = jest.mocked(global.fetch).mock.calls.filter(([, options]) => options?.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0][0]).toBe(`https://example.supabase.co/functions/v1/hero-ai/jobs/${job.id}/render/1`);
  expect(completed.images[0].sceneId).toBe('01-exercise');
});

it('sends the face reference before reservation and clears a rejected draft without rendering', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  jest.mocked(fs.readAsStringAsync).mockResolvedValueOnce(JSON.stringify([{ base: 'art', reference: 'portrait' }]));
  jest.mocked(global.fetch).mockResolvedValueOnce(reply({ error: 'not_found' }, 404)).mockResolvedValueOnce(reply({ error: 'face_missing' }, 400));
  await expect(resumeHeroAiJob(job, jest.fn())).rejects.toThrow('face_missing');
  expect(JSON.parse(jest.mocked(global.fetch).mock.calls[1][1]!.body as string).reference).toBe('portrait');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(await getPendingHeroAiJob()).toBeNull();
});

it('cancels on the server before clearing the pending job', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  jest.mocked(global.fetch).mockImplementationOnce(async () => {
    expect((await getPendingHeroAiJob())?.cancelRequested).toBe(true);
    return reply({ cancelled: true, remaining: 3 });
  });
  await cancelHeroAiJob(job.id);
  expect(jest.mocked(global.fetch).mock.calls[0][0]).toContain('/cancel');
  expect(await getPendingHeroAiJob()).toBeNull();
});

it('retains the cancellation intent offline and never restarts it on recovery', async () => {
  await AsyncStorage.setItem(key, JSON.stringify(job));
  jest.mocked(global.fetch).mockRejectedValueOnce(new Error('offline'));
  await expect(cancelHeroAiJob(job.id)).rejects.toThrow('connection');
  const pending = await getPendingHeroAiJob();
  expect(pending?.cancelRequested).toBe(true);
  jest.mocked(global.fetch).mockResolvedValueOnce(reply({ cancelled: true, remaining: 3 }));
  await expect(resumeHeroAiJob(pending!, jest.fn())).rejects.toThrow('cancelled');
  expect(jest.mocked(global.fetch).mock.calls.every(([url]) => String(url).endsWith('/cancel'))).toBe(true);
  expect(fs.downloadAsync).not.toHaveBeenCalled();
});

it('does not render if cancellation occurs while the reservation is being created', async () => {
  const controller = new AbortController();
  jest.mocked(fs.readAsStringAsync).mockResolvedValueOnce(JSON.stringify([{ reference: 'portrait' }]));
  jest.mocked(global.fetch)
    .mockResolvedValueOnce(reply({ error: 'not_found' }, 404))
    .mockImplementationOnce(async () => {
      controller.abort();
      return reply({ status: 'processing', pending: [0], results: [], remaining: 2 }, 201);
    });
  await expect(resumeHeroAiJob(job, jest.fn(), controller.signal)).rejects.toThrow('cancelled');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(fs.downloadAsync).not.toHaveBeenCalled();
});

it('ignores a completed response that arrives after the user cancels', async () => {
  const controller = new AbortController();
  jest.mocked(global.fetch).mockImplementationOnce(async () => {
    controller.abort();
    return reply({ status: 'completed', results: [result], remaining: 2 });
  });
  await expect(resumeHeroAiJob(job, jest.fn(), controller.signal)).rejects.toThrow('cancelled');
  expect(fs.downloadAsync).not.toHaveBeenCalled();
});
