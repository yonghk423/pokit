import { create } from 'zustand';
import { localStorageClient } from '../storage/localStorageClient';

export type AppWallpaper = 'default' | 'linen';
export const WALLPAPER_KEY = 'pokit:app-wallpaper:v1';
export const useWallpaperStore = create<{
  wallpaper: AppWallpaper;
  setWallpaper: (wallpaper: AppWallpaper) => void;
  hydrate: () => void;
}>((set) => ({
  wallpaper: 'default',
  // Retain the compatibility API while migrating old installations to the default.
  setWallpaper: () => {
    localStorageClient.removeItem(WALLPAPER_KEY);
    set({ wallpaper: 'default' });
  },
  hydrate: () => {
    localStorageClient.removeItem(WALLPAPER_KEY);
    set({ wallpaper: 'default' });
  },
}));
