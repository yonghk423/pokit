import { localStorageClient } from './localStorageClient';

export const HERO_THUMBNAIL_STRIP_KEY = 'pokit:hero-thumbnail-strip:v1';
const listeners = new Set<() => void>();
export const isHeroThumbnailStripCollapsed = () => localStorageClient.getItemRaw(HERO_THUMBNAIL_STRIP_KEY) === 'collapsed';
export function subscribeHeroThumbnailStrip(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setHeroThumbnailStripCollapsed(collapsed: boolean) {
  localStorageClient.setItemRaw(HERO_THUMBNAIL_STRIP_KEY, collapsed ? 'collapsed' : 'expanded');
  listeners.forEach(listener => listener());
}
