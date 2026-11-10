import { localStorageClient } from '../storage/localStorageClient';
import { useWallpaperStore, WALLPAPER_KEY } from './wallpaperStore';

afterEach(() => { localStorageClient.removeItem(WALLPAPER_KEY); useWallpaperStore.setState({ wallpaper: 'default' }); });
it('retires saved wallpaper choices and restores the default background', () => {
  localStorageClient.setItemRaw(WALLPAPER_KEY, 'linen');
  useWallpaperStore.setState({ wallpaper: 'linen' });
  useWallpaperStore.getState().hydrate();
  expect(useWallpaperStore.getState().wallpaper).toBe('default');
  expect(localStorageClient.getItemRaw(WALLPAPER_KEY)).toBeNull();
  useWallpaperStore.getState().setWallpaper('linen');
  expect(useWallpaperStore.getState().wallpaper).toBe('default');
});
it('falls back safely for an unknown stored wallpaper', () => {
  localStorageClient.setItemRaw(WALLPAPER_KEY, 'removed-material');
  useWallpaperStore.getState().hydrate();
  expect(useWallpaperStore.getState().wallpaper).toBe('default');
});
