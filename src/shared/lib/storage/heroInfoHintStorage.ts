import { localStorageClient } from './localStorageClient';

export type HeroInfoHintKind = 'diary' | 'ai' | 'character';
const listeners = new Set<() => void>();
const key = (kind: HeroInfoHintKind) => `pokit:hero-info-hint:${kind}:v1`;
export const isHeroInfoHintPending = (kind: HeroInfoHintKind) => localStorageClient.getItemRaw(key(kind)) !== 'done';
export function subscribeHeroInfoHint(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyHeroInfoHintReset() { listeners.forEach(listener => listener()); }
export function completeHeroInfoHint(kind: HeroInfoHintKind) {
  localStorageClient.setItemRaw(key(kind), 'done');
  notifyHeroInfoHintReset();
}
