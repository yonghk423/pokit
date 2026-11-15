import { useSyncExternalStore } from 'react';
import { localStorageClient } from './storage/localStorageClient';

const KEY = 'yourday:calendar-hide-photos';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const read = () => localStorageClient.getJson(KEY) === true;
export function useCalendarPhotosHidden() {
  return useSyncExternalStore(subscribe, read, read);
}
export function setCalendarPhotosHidden(hidden: boolean) {
  localStorageClient.setJson(KEY, hidden);
  listeners.forEach(listener => listener());
}
