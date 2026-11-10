import { CITY_CALENDAR_THEMES } from '../model/heroCalendarDesign';
import { isCityCalendarPackReady, downloadCityCalendarPack } from './cityCalendarPack';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { downloadIllustrationCalendarAssets, isIllustrationCalendarInstalled } from './illustrationCalendarAssets';
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(), setJson: jest.fn() } }));
jest.mock('./illustrationCalendarAssets', () => ({ downloadIllustrationCalendarAssets: jest.fn(), isIllustrationCalendarInstalled: jest.fn() }));
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
  expect(downloadIllustrationCalendarAssets).toHaveBeenCalledTimes(CITY_CALENDAR_THEMES.length);
  expect(progress).toHaveBeenLastCalledWith(CITY_CALENDAR_THEMES.length);
  expect(localStorageClient.setJson).toHaveBeenLastCalledWith(expect.anything(), true);
});
it('locks again when a downloaded file is missing', async () => {
  (localStorageClient.getJson as jest.Mock).mockReturnValue(true);
  (isIllustrationCalendarInstalled as jest.Mock).mockResolvedValueOnce(false).mockResolvedValue(true);
  expect(await isCityCalendarPackReady()).toBe(false);
});
