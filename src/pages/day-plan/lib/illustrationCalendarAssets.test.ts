jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///docs/', getInfoAsync: jest.fn(), makeDirectoryAsync: jest.fn(), downloadAsync: jest.fn(), moveAsync: jest.fn(), deleteAsync: jest.fn() }));
jest.mock('expo-image', () => ({ Image: { clearDiskCache: jest.fn(), clearMemoryCache: jest.fn() } }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({ getHeroAiAccessToken: jest.fn(), getHeroAiAuthClient: () => ({ functions: { invoke: mockInvoke } }) }));
import * as fs from 'expo-file-system/legacy';
import { CALENDAR_ARTWORK_LAYOUTS } from './illustrationCalendarLayouts';
import { isIllustrationCalendarInstalled, downloadIllustrationCalendarAssets, CALENDAR_ASSET_REVISION } from './illustrationCalendarAssets';
const mockInvoke = jest.fn();
const themeId = '04-lunch-rooftop';
const response = (revision = 'fullbleed-v2') => ({ data: { themeId, revision, files: ['background', 'paper', 'leaf'].map(name => ({ name: `${name}.webp`, url: `https://example.com/calendar-themes/city-animation/${name === 'background' ? themeId : 'shared'}/${name}.webp` })) } });
beforeEach(() => {
  jest.clearAllMocks();
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.includes('city-animation-v2') || uri.endsWith('.part'), isDirectory: false, size: 100, md5: CALENDAR_ARTWORK_LAYOUTS[themeId].md5 }));
  (fs.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
  mockInvoke.mockResolvedValue(response());
});
it('refreshes an older installed theme before reporting it ready and removes only its obsolete cache', async () => {
  expect(await isIllustrationCalendarInstalled(themeId)).toBe(true);
  expect(mockInvoke).toHaveBeenCalledWith('calendar-theme', { body: { themeId, revision: 'fullbleed-v2' } });
  expect(fs.downloadAsync).toHaveBeenCalledTimes(3);
  expect(fs.deleteAsync).toHaveBeenCalledWith(`file:///docs/calendar-themes/city-animation-v2/${themeId}/`, { idempotent: true });
});
it('retains the old cache when replacement downloading fails', async () => {
  (fs.downloadAsync as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  expect(await isIllustrationCalendarInstalled(themeId)).toBe(false);
  expect(fs.deleteAsync).not.toHaveBeenCalled();
});
it('rejects responses serving the old revision instead of mixing new geometry and old artwork', async () => {
  mockInvoke.mockResolvedValue(response('old'));
  await expect(downloadIllustrationCalendarAssets(themeId)).rejects.toThrow('theme_download_unavailable');
  expect(fs.downloadAsync).not.toHaveBeenCalled();
});
it('does not download uninstalled themes during an installation check', async () => {
  (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  expect(await isIllustrationCalendarInstalled(themeId)).toBe(false);
  expect(mockInvoke).not.toHaveBeenCalled();
});

it('reuses a verified current-revision download', async () => {
  (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false, size: 100 });
  const assets = await downloadIllustrationCalendarAssets(themeId);
  expect(assets.background).toBe(`file:///docs/calendar-themes/${CALENDAR_ASSET_REVISION}/${themeId}/background.webp`);
  expect(fs.downloadAsync).not.toHaveBeenCalled();
});
it('rejects a stale CDN image before replacing the installed file', async () => {
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.endsWith('.part'), isDirectory: false, size: 100, md5: 'old-file' }));
  await expect(downloadIllustrationCalendarAssets(themeId)).rejects.toThrow('theme_revision_mismatch');
  expect(fs.moveAsync).not.toHaveBeenCalled();
  expect(fs.deleteAsync).toHaveBeenCalledTimes(1);
  expect((fs.deleteAsync as jest.Mock).mock.calls[0][0]).toMatch(/\.part$/);
});
