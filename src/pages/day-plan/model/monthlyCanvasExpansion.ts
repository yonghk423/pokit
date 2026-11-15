import { useSyncExternalStore } from 'react';

let expanded = false;
const listeners = new Set<() => void>();

export function setMonthlyCanvasExpanded(value: boolean) {
  if (expanded === value) return;
  expanded = value;
  listeners.forEach(listener => listener());
}

export function useMonthlyCanvasExpanded() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener); },
    () => expanded,
    () => expanded,
  );
}
