import { useSyncExternalStore } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
const listeners = new Set<() => void>();
let revision = 0;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
/** Refresh every visible name when a character alias is saved. */
export function useComicCharacterNames() {
  useSyncExternalStore(subscribe, () => revision, () => 0);
  return (id: string, fallback: string) => loadComicCharacterName(id) ?? fallback;
}
const key = (id: string) => `pokit:comic-character-name:${id}`;
export function loadComicCharacterName(id: string): string | null {
  const name = localStorageClient.getItemRaw(key(id))?.trim();
  return name ? name.slice(0, 24) : null;
}
export function saveComicCharacterName(id: string, value: string): string | null {
  const name = value.trim().slice(0, 24);
  if (!name) return null;
  localStorageClient.setItemRaw(key(id), name);
  revision += 1;
  listeners.forEach(listener => listener());
  return name;
}
