import { EVERYDAY_CINEMA_THEMES } from '../model/heroCalendarDesign';
import { getCalendarPackDownload, subscribeCalendarPackDownloads, isCityCalendarPackReady, downloadCityCalendarPack } from './cityCalendarPack';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { downloadIllustrationCalendarAssets, isIllustrationCalendarInstalled } from './illustrationCalendarAssets';
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(), setJson: jest.fn(), removeItem: jest.fn() } }));
jest.mock('./illustrationCalendarAssets', () => ({ downloadIllustrationCalendarAssets: jest.fn(), isIllustrationCalendarInstalled: jest.fn(), removeRetiredEverydayFiles: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
it('keeps a fresh customer locked even with old preview caches', async () => {
  (isIllustrationCalendarInstalled as jest.Mock).mockResolvedValue(true);
  expect(await isCityCalendarPackReady()).toBe(false);
});
it('does not complete a partial or failed download', async () => {
  (downloadIllustrationCalendarAssets as jest.Mock).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
  await expect(downloadCityCalendarPack(jest.fn())).rejects.toThrow('offline');
  expect(localStorageClient.setJson).not.toHaveBeenCalledWith(expect.anything(), true);
});
it('unlocks only after all theme downloads complete', async () => {
  (downloadIllustrationCalendarAssets as jest.Mock).mockResolvedValue({});
  const progress = jest.fn();
  await downloadCityCalendarPack(progress);
  expect(EVERYDAY_CINEMA_THEMES).toHaveLength(100);
  expect(downloadIllustrationCalendarAssets).toHaveBeenCalledTimes(100);
  expect(progress).toHaveBeenLastCalledWith(EVERYDAY_CINEMA_THEMES.length);
  expect(localStorageClient.setJson).toHaveBeenLastCalledWith(expect.anything(), true);
});
it('locks again when a downloaded file is missing', async () => {
  (localStorageClient.getJson as jest.Mock).mockReturnValue(true);
  (isIllustrationCalendarInstalled as jest.Mock).mockResolvedValueOnce(false).mockResolvedValue(true);
  expect(await isCityCalendarPackReady()).toBe(false);
});

it('downloads only the 50 City Animation themes when that pack is selected', async () => {
  (downloadIllustrationCalendarAssets as jest.Mock).mockResolvedValue({});
  const progress = jest.fn();
  await downloadCityCalendarPack(progress, 'city');
  expect(downloadIllustrationCalendarAssets).toHaveBeenCalledTimes(50);
  expect((downloadIllustrationCalendarAssets as jest.Mock).mock.calls.every(([id]) => !id.startsWith('everyday-cinema-'))).toBe(true);
  expect(progress).toHaveBeenLastCalledWith(50);
});

it('marks a previously installed pack migrated only after all 100 current files are ready', async () => {
  const oldKey = 'pokit:everyday-cinema-pack:20261112-v1';
  (localStorageClient.getJson as jest.Mock).mockImplementation(key => key === oldKey);
  (isIllustrationCalendarInstalled as jest.Mock).mockResolvedValue(true);
  expect(await isCityCalendarPackReady('everyday')).toBe(true);
  expect(isIllustrationCalendarInstalled).toHaveBeenCalledTimes(100);
  expect(localStorageClient.removeItem).toHaveBeenCalledWith(oldKey);
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:everyday-cinema-pack:20261112-top-only-v4', true);
});


it('retains progress across subscriber remounts and deduplicates the same pack', async () => {
  let resume!: () => void;
  jest.mocked(downloadIllustrationCalendarAssets).mockImplementationOnce(() => new Promise(resolve => { resume = () => resolve({ background: 'fixture' }); })).mockResolvedValue({ background: 'fixture' });
  const oldScreen = jest.fn();
  const unsubscribe = subscribeCalendarPackDownloads(oldScreen);
  const first = downloadCityCalendarPack(jest.fn(), 'city');
  expect(getCalendarPackDownload('city').status).toBe('downloading');
  unsubscribe();
  const newScreen = jest.fn();
  const unsubscribeNew = subscribeCalendarPackDownloads(newScreen);
  const duplicate = downloadCityCalendarPack(jest.fn(), 'city');
  expect(downloadIllustrationCalendarAssets).toHaveBeenCalledTimes(1);
  resume();
  await Promise.all([first, duplicate]);
  expect(downloadIllustrationCalendarAssets).toHaveBeenCalledTimes(50);
  expect(getCalendarPackDownload('city')).toEqual({ status: 'ready', count: 50 });
  expect(newScreen).toHaveBeenCalled();
  unsubscribeNew();
});
