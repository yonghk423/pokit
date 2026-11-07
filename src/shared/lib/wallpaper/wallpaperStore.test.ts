import { localStorageClient } from '../storage/localStorageClient';
import { useWallpaperStore, WALLPAPER_KEY } from './wallpaperStore';

afterEach(() => { localStorageClient.removeItem(WALLPAPER_KEY); useWallpaperStore.setState({ wallpaper: 'default' }); });
it('persists the selected material and restores it after state is recreated', () => {
  useWallpaperStore.getState().setWallpaper('linen');
  expect(localStorageClient.getItemRaw(WALLPAPER_KEY)).toBe('linen');
  useWallpaperStore.setState({ wallpaper: 'default' });
  useWallpaperStore.getState().hydrate();
  expect(useWallpaperStore.getState().wallpaper).toBe('linen');
  useWallpaperStore.getState().setWallpaper('default');
  useWallpaperStore.setState({ wallpaper: 'linen' });
  useWallpaperStore.getState().hydrate();
  expect(useWallpaperStore.getState().wallpaper).toBe('default');
});
it('falls back safely for an unknown stored wallpaper', () => {
  localStorageClient.setItemRaw(WALLPAPER_KEY, 'removed-material');
  useWallpaperStore.getState().hydrate();
  expect(useWallpaperStore.getState().wallpaper).toBe('default');
});
