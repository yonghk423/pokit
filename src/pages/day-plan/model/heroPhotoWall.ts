import { applyTheme } from './diaryTheme';
import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type HeroPhotoWall = 'none' | 'black' | 'aligned';
const KEY = 'pokit:photo-wall:v1';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = (): HeroPhotoWall => {
  const value = localStorageClient.getJson(KEY);
  return value === 'black' || value === 'aligned' ? value : 'none';
};
export const useHeroPhotoWall = () => useSyncExternalStore(subscribe, read, read);
export function applyHeroPhotoWall(style: HeroPhotoWall) {
  applyTheme(null, 'photoWall');
  localStorageClient.setJson(KEY, style);
  listeners.forEach(listener => listener());
}
