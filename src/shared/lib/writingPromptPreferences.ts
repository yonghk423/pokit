import { useSyncExternalStore } from 'react';
import { localStorageClient } from './storage/localStorageClient';

const KEY = 'yourday:writing-prompts-enabled';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const read = () => localStorageClient.getJson(KEY) !== false;
export function useWritingPromptsEnabled() {
  return useSyncExternalStore(subscribe, read, read);
}
export function setWritingPromptsEnabled(enabled: boolean) {
  localStorageClient.setJson(KEY, enabled);
  listeners.forEach(listener => listener());
}
