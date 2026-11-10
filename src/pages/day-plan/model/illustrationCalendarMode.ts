import { useSyncExternalStore } from 'react';
let enabled = false;
const listeners = new Set<() => void>();
export function setIllustrationCalendarMode(value: boolean) { enabled = value; listeners.forEach(fn => fn()); }
export function useIllustrationCalendarMode() { return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => enabled, () => false); }
