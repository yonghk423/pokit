jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///docs/', getInfoAsync: jest.fn(), makeDirectoryAsync: jest.fn(), downloadAsync: jest.fn(), moveAsync: jest.fn(), deleteAsync: jest.fn(), readDirectoryAsync: jest.fn() }));
jest.mock('expo-image', () => ({ Image: { clearDiskCache: jest.fn(), clearMemoryCache: jest.fn() } }));
jest.mock('@features/subscriptions/lib/downloadClient', () => ({ invokeDownload: (...args: unknown[]) => mockInvoke(...args) }));
import * as fs from 'expo-file-system/legacy';
import { CALENDAR_ARTWORK_LAYOUTS } from './illustrationCalendarLayouts';
import { isIllustrationCalendarInstalled, downloadIllustrationCalendarAssets, removeRetiredEverydayFiles, CALENDAR_ASSET_REVISION } from './illustrationCalendarAssets';
const mockInvoke = jest.fn();
const themeId = '04-lunch-rooftop';
const response = (revision = 'fullbleed-v2') => ({ data: { themeId, revision, files: ['background'].map(name => ({ name: `${name}.webp`, url: `https://example.com/calendar-themes/city-animation/${name === 'background' ? themeId : 'shared'}/${name}.webp` })) } });
beforeEach(() => {
  jest.clearAllMocks();
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.includes('city-animation-v2') || uri.endsWith('.part'), isDirectory: false, size: 100, md5: CALENDAR_ARTWORK_LAYOUTS[themeId].md5 }));
  (fs.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
  mockInvoke.mockResolvedValue(response());
});
it('refreshes an older installed theme before reporting it ready and removes only its obsolete cache', async () => {
  expect(await isIllustrationCalendarInstalled(themeId)).toBe(true);
  expect(mockInvoke).toHaveBeenCalledWith('calendar-theme', { body: { themeId, revision: 'fullbleed-v2' } });
  expect(fs.downloadAsync).toHaveBeenCalledTimes(1);
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

it('accepts a pack without decorations and removes both obsolete files', async () => {
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.endsWith('/background.webp'), isDirectory: false, size: 100 }));
  expect(await isIllustrationCalendarInstalled(themeId)).toBe(true);
  expect(fs.deleteAsync).toHaveBeenCalledWith(`file:///docs/calendar-themes/${CALENDAR_ASSET_REVISION}/shared/paper.webp`, { idempotent: true });
  expect(mockInvoke).not.toHaveBeenCalled();
});

it('does not return decoration assets after installation', async () => {
  const assets = await downloadIllustrationCalendarAssets(themeId);
  expect(Object.keys(assets)).toEqual(['background']);
  expect(fs.deleteAsync).toHaveBeenCalledWith(`file:///docs/calendar-themes/${CALENDAR_ASSET_REVISION}/shared/leaf.webp`, { idempotent: true });
});

it('downloads and verifies an Everyday Cinema object from its versioned path', async () => {
  const id = 'everyday-cinema-01-platform';
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.endsWith('.part'), isDirectory: false, size: 100, md5: CALENDAR_ARTWORK_LAYOUTS[id].md5 }));
  mockInvoke.mockResolvedValue({ data: { themeId: id, revision: 'everyday-cinema-v2', files: [{ name: 'background.webp', url: 'https://example.com/calendar-themes/everyday-cinema/20261112-v2/01-platform.webp' }] } });
  await downloadIllustrationCalendarAssets(id);
  expect(mockInvoke).toHaveBeenCalledWith('calendar-theme', { body: { themeId: id, revision: 'everyday-cinema-v2' } });
  expect(fs.moveAsync).toHaveBeenCalledWith(expect.objectContaining({
    to: expect.stringContaining('/20261112-everyday-cinema-top-only-v4/'),
  }));
});

it('retains older Everyday files until the current artwork checksum matches', async () => {
  const root = `file:///docs/calendar-themes/${CALENDAR_ASSET_REVISION}/`;
  (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: true });
  (fs.readDirectoryAsync as jest.Mock).mockResolvedValue(['everyday-cinema-01-platform', 'everyday-cinema-100-city-ferry-deck', '06-angry-email', 'shared']);
  await removeRetiredEverydayFiles();
  expect(fs.readDirectoryAsync).toHaveBeenCalledWith(root);
  expect(fs.deleteAsync).not.toHaveBeenCalled();
});

it('migrates a previous open-panel download to the current artwork before reporting it installed', async () => {
  const id = 'everyday-cinema-02-pottery';
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({
    exists: uri.includes('open-panel-v3') || uri.endsWith('.part'),
    isDirectory: false,
    size: 100,
    md5: CALENDAR_ARTWORK_LAYOUTS[id].md5,
  }));
  mockInvoke.mockResolvedValue({ data: { themeId: id, revision: 'everyday-cinema-v2', files: [{ name: 'background.webp', url: 'https://example.com/calendar-themes/everyday-cinema/20261112-v2/02-pottery.webp' }] } });
  expect(await isIllustrationCalendarInstalled(id)).toBe(true);
  expect(fs.downloadAsync).toHaveBeenCalledTimes(1);
  expect(fs.moveAsync).toHaveBeenCalledWith(expect.objectContaining({ to: expect.stringContaining('/20261112-everyday-cinema-top-only-v4/') }));
  expect(fs.deleteAsync).toHaveBeenCalledWith(`file:///docs/calendar-themes/20261112-everyday-cinema-open-panel-v3/${id}/`, { idempotent: true });
});

it('retains the previous open-panel download when the replacement download fails', async () => {
  const id = 'everyday-cinema-03-laundromat';
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.includes('open-panel-v3'), isDirectory: false, size: 100 }));
  mockInvoke.mockResolvedValue({ data: { themeId: id, revision: 'everyday-cinema-v2', files: [{ name: 'background.webp', url: 'https://example.com/calendar-themes/everyday-cinema/20261112-v2/03-laundromat.webp' }] } });
  (fs.downloadAsync as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  expect(await isIllustrationCalendarInstalled(id)).toBe(false);
  expect(fs.deleteAsync).not.toHaveBeenCalled();
});

it.each([
  ['textured-watercolor-02-midnight-shop', 'textured-watercolor-v2', 'textured-watercolor/20261113-v2/02-midnight-shop.webp'],
  ['textured-watercolor-01-fly-kite', 'textured-watercolor-v1', 'textured-watercolor/20261112-v1/01-fly-kite-v2.webp'],
  ['citypop-retro-01-bus-stop', 'citypop-retro-v1', 'citypop-retro/20261112-v1/01-bus-stop.webp'],
])('downloads %s through the matching revision and validates the file before installation', async (id, revision, path) => {
  (fs.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => ({ exists: uri.endsWith('.part'), isDirectory: false, size: 100, md5: CALENDAR_ARTWORK_LAYOUTS[id].md5 }));
  mockInvoke.mockResolvedValue({ data: { themeId: id, revision, files: [{ name: 'background.webp', url: `https://example.com/calendar-themes/${path}` }] } });
  const assets = await downloadIllustrationCalendarAssets(id);
  expect(mockInvoke).toHaveBeenCalledWith('calendar-theme', { body: { themeId: id, revision } });
  expect(assets.background).toContain(`/${id === 'textured-watercolor-01-fly-kite' ? 'textured-watercolor-kite-v2' : revision}/${id}/background.webp`);
  expect(fs.moveAsync).toHaveBeenCalledWith(expect.objectContaining({ to: assets.background }));
});
