import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
export type DiaryClip = 'blue' | 'black';
const KEY = 'yourday:diary-clip';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = (): DiaryClip => localStorageClient.getJson(KEY) === 'black' ? 'black' : 'blue';
export function useHeroDiaryClip() { return useSyncExternalStore(subscribe, read, read); }
export function applyHeroDiaryClip(clip: DiaryClip) { localStorageClient.setJson(KEY, clip); listeners.forEach(listener => listener()); }
export const DIARY_CLIP_IMAGES = {
  blue: require('../../../../assets/control-illustrations/blue-clipboard-clip.webp'),
  black: require('../../../../assets/control-illustrations/black-clipboard-clip.webp'),
};
