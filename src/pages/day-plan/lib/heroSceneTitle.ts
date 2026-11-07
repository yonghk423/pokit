import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
const listeners = new Set<() => void>();
let revision = 0;
const key = (characterId: string, sceneId: string) => `pokit:comic-scene-title:${encodeURIComponent(characterId)}:${encodeURIComponent(sceneId)}`;
export function loadHeroSceneTitle(characterId: string, sceneId: string): string | null {
  return localStorageClient.getItemRaw(key(characterId, sceneId))?.trim() || null;
}
export function saveHeroSceneTitle(characterId: string, sceneId: string, title: string) {
  const value = title.trim().slice(0, 80);
  if (!value) return false;
  localStorageClient.setItemRaw(key(characterId, sceneId), value);
  revision++;
  listeners.forEach(listener => listener());
  return true;
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useHeroSceneTitles() {
  useSyncExternalStore(subscribe, () => revision, () => 0);
  return (characterId: string, sceneId: string, fallback: string) => loadHeroSceneTitle(characterId, sceneId) ?? fallback;
}
