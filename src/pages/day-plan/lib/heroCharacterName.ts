import { localStorageClient } from '@shared/lib/storage/localStorageClient';
const key = (id: string) => `pokit:comic-character-name:${id}`;
export function loadComicCharacterName(id: string): string | null {
  const name = localStorageClient.getItemRaw(key(id))?.trim();
  return name ? name.slice(0, 24) : null;
}
export function saveComicCharacterName(id: string, value: string): string | null {
  const name = value.trim().slice(0, 24);
  if (!name) return null;
  localStorageClient.setItemRaw(key(id), name);
  return name;
}
