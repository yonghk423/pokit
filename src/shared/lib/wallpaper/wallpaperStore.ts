import { create } from 'zustand';
import { localStorageClient } from '../storage/localStorageClient';

export type AppWallpaper = 'default' | 'linen';
export const WALLPAPER_KEY = 'pokit:app-wallpaper:v1';
export const LINEN_WALLPAPER = require('../../../../assets/wallpapers/ivory-linen-v1.png');
export const useWallpaperStore = create<{
  wallpaper: AppWallpaper;
  setWallpaper: (wallpaper: AppWallpaper) => void;
  hydrate: () => void;
}>((set) => ({
  wallpaper: 'default',
  setWallpaper: (wallpaper) => {
    localStorageClient.setItemRaw(WALLPAPER_KEY, wallpaper);
    set({ wallpaper });
  },
  hydrate: () => set({ wallpaper: localStorageClient.getItemRaw(WALLPAPER_KEY) === 'linen' ? 'linen' : 'default' }),
}));
