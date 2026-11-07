import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type HeroCardLayout = 'stack' | 'carousel';
const key = 'pokit:hero-card-layout:v1';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function loadHeroCardLayout(): HeroCardLayout {
  return localStorageClient.getItemRaw(key) === 'carousel' ? 'carousel' : 'stack';
}
export function saveHeroCardLayout(layout: HeroCardLayout) {
  localStorageClient.setItemRaw(key, layout);
  listeners.forEach(listener => listener());
}
export function useHeroCardLayout() {
  return useSyncExternalStore(subscribe, loadHeroCardLayout, () => 'stack' as const);
}
