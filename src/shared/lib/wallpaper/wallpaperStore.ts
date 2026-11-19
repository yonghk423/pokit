import { create } from 'zustand';
import { localStorageClient } from '../storage/localStorageClient';

export type AppWallpaper = 'default' | 'linen' | 'warm-ivory';
export const WALLPAPER_KEY = 'pokit:app-wallpaper:v1';
export const useWallpaperStore = create<{
  wallpaper: AppWallpaper;
  setWallpaper: (wallpaper: AppWallpaper) => void;
  hydrate: () => void;
}>((set) => ({
  wallpaper: 'default',
  // Retain the compatibility API while migrating old installations to the default.
  setWallpaper: (value) => {
    const wallpaper = value === 'warm-ivory' ? value : 'default';
    if (wallpaper === 'default') localStorageClient.removeItem(WALLPAPER_KEY);
    else localStorageClient.setItemRaw(WALLPAPER_KEY, wallpaper);
    set({ wallpaper });
  },
  hydrate: () => {
    const wallpaper = localStorageClient.getItemRaw(WALLPAPER_KEY) === 'warm-ivory' ? 'warm-ivory' : 'default';
    if (wallpaper === 'default') localStorageClient.removeItem(WALLPAPER_KEY);
    set({ wallpaper });
  },
}));
