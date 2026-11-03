import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { SELECTABLE_COMIC_CHARACTERS } from './heroCharacters';

export const HERO_CHARACTER_ORDER_KEY = 'pokit:hero-character-order:v1';
export function readHeroCharacterOrder(key = HERO_CHARACTER_ORDER_KEY, extra: string[] = []): string[] {
  const saved = localStorageClient.getJson<unknown>(key);
  const available: string[] = [...SELECTABLE_COMIC_CHARACTERS.map(character => character.id), ...extra];
  const valid = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && available.includes(id)) : [];
  return [...new Set([...valid, ...available])];
}
export function moveHeroCharacter(order: string[], id: string, target: number): string[] {
  if (!order.includes(id)) return order;
  const next = order.filter(value => value !== id);
  next.splice(Math.max(0, Math.min(next.length, target)), 0, id);
  return next;
}
export function saveHeroCharacterOrder(order: string[], key = HERO_CHARACTER_ORDER_KEY) {
  localStorageClient.setJson(key, order);
}
